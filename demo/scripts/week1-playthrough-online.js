#!/usr/bin/env node
'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const {execFileSync, spawn} = require('child_process');
const {io} = require('socket.io-client');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const VIDEOS_DIR = path.resolve(ROOT_DIR, 'demo/videos/week1');
const DEFAULT_URL = 'http://127.0.0.1:35100';
const DEFAULT_DURATION_MS = 90 * 1000;
const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_WINDOW = '1600x900';

function parseArgs(argv) {
    const args = {};

    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];
        if (!token.startsWith('--')) {
            continue;
        }

        const trimmed = token.slice(2);
        if (trimmed.startsWith('no-')) {
            args[trimmed.slice(3)] = false;
            continue;
        }

        const eqIndex = trimmed.indexOf('=');
        if (eqIndex >= 0) {
            args[trimmed.slice(0, eqIndex)] = trimmed.slice(eqIndex + 1);
            continue;
        }

        const next = argv[index + 1];
        if (!next || next.startsWith('--')) {
            args[trimmed] = true;
            continue;
        }

        args[trimmed] = next;
        index += 1;
    }

    return args;
}

function toNumber(value, fallback) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }

    return fallback;
}

function toBoolean(value, fallback) {
    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (['1', 'true', 'yes', 'on'].includes(normalized)) {
            return true;
        }
        if (['0', 'false', 'no', 'off'].includes(normalized)) {
            return false;
        }
    }

    return fallback;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function ensureDir(dirPath) {
    fs.mkdirSync(dirPath, {recursive: true});
}

function removeDir(dirPath) {
    fs.rmSync(dirPath, {recursive: true, force: true});
}

function httpGet(url) {
    return new Promise((resolve, reject) => {
        const request = http.get(url, (response) => {
            response.resume();
            resolve(response.statusCode || 0);
        });
        request.on('error', reject);
        request.setTimeout(2000, () => {
            request.destroy(new Error('Timed out while probing ' + url));
        });
    });
}

async function waitForServer(url, timeoutMs) {
    const deadline = Date.now() + timeoutMs;
    let lastError = null;

    while (Date.now() < deadline) {
        try {
            const statusCode = await httpGet(url);
            if (statusCode >= 200 && statusCode < 500) {
                return;
            }
        } catch (error) {
            lastError = error;
        }

        await sleep(500);
    }

    throw lastError || new Error('Timed out waiting for server at ' + url);
}

function spawnServer(command, env) {
    const child = spawn(command, {
        cwd: ROOT_DIR,
        env: Object.assign({}, process.env, env || {}),
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe']
    });
    const logs = [];

    function capture(prefix, chunk) {
        String(chunk || '').split(/\r?\n/).forEach((line) => {
            const trimmed = line.trim();
            if (trimmed) {
                logs.push(prefix + trimmed);
            }
        });
        if (logs.length > 200) {
            logs.splice(0, logs.length - 200);
        }
    }

    if (child.stdout) {
        child.stdout.on('data', (chunk) => capture('[stdout] ', chunk));
    }
    if (child.stderr) {
        child.stderr.on('data', (chunk) => capture('[stderr] ', chunk));
    }

    return {
        child: child,
        logs: logs
    };
}

function waitForChildExit(child, timeoutMs) {
    return new Promise((resolve) => {
        if (!child || child.exitCode !== null || child.killed) {
            resolve();
            return;
        }

        let settled = false;
        const timer = setTimeout(() => {
            if (!settled) {
                settled = true;
                resolve();
            }
        }, timeoutMs);

        child.once('exit', () => {
            if (!settled) {
                settled = true;
                clearTimeout(timer);
                resolve();
            }
        });
    });
}

async function stopServer(server) {
    if (!server || !server.child || server.child.exitCode !== null) {
        return;
    }

    server.child.kill('SIGTERM');
    await waitForChildExit(server.child, 3000);

    if (server.child.exitCode === null) {
        server.child.kill('SIGKILL');
        await waitForChildExit(server.child, 1000);
    }
}

function runPlaywright(session, args, raw) {
    const commandArgs = ['-s=' + session].concat(args || []);
    if (raw) {
        commandArgs.push('--raw');
    }

    return execFileSync('playwright-cli', commandArgs, {
        cwd: ROOT_DIR,
        stdio: 'pipe',
        encoding: 'utf8'
    }).trim();
}

function tryRunPlaywright(session, args, raw) {
    try {
        return runPlaywright(session, args, raw);
    } catch (_error) {
        return '';
    }
}

function parseEvalOutput(rawOutput) {
    if (typeof rawOutput !== 'string' || rawOutput.trim() === '') {
        return null;
    }

    try {
        return JSON.parse(rawOutput);
    } catch (_error) {
        return rawOutput;
    }
}

function relativeToRoot(filePath) {
    return path.relative(ROOT_DIR, filePath).split(path.sep).join('/');
}

function probeRecordedFormat(outputPath) {
    if (!fs.existsSync(outputPath)) {
        return 'missing';
    }

    try {
        return execFileSync('file', ['-b', outputPath], {
            cwd: ROOT_DIR,
            stdio: 'pipe',
            encoding: 'utf8'
        }).trim();
    } catch (_error) {
        return 'unknown';
    }
}

function calculateDistance(start, end) {
    if (!start || !end) {
        return 0;
    }
    return Math.hypot((end.x || 0) - (start.x || 0), (end.y || 0) - (start.y || 0));
}

function observeNpcActivity(url, durationMs) {
    return new Promise((resolve, reject) => {
        const positionsByNpc = {};
        const uniqueNpcIds = new Set();
        const speakCounts = {};
        const socket = io(url, {
            query: {
                type: 'spectator'
            },
            transports: ['websocket', 'polling'],
            reconnection: false,
            timeout: 5000
        });
        let timer = null;
        let settled = false;

        function finish(error) {
            if (settled) {
                return;
            }
            settled = true;
            clearTimeout(timer);
            socket.close();

            if (error) {
                reject(error);
                return;
            }

            const movementByNpc = Object.keys(positionsByNpc).reduce((result, npcId) => {
                const history = positionsByNpc[npcId] || [];
                result[npcId] = calculateDistance(history[0], history[history.length - 1]);
                return result;
            }, {});

            resolve({
                uniqueNpcIds: Array.from(uniqueNpcIds).sort(),
                movementByNpc: movementByNpc,
                speakCounts: speakCounts
            });
        }

        socket.on('connect_error', finish);
        socket.on('error', finish);
        socket.on('welcome', () => {
            socket.emit('gotit');
        });
        socket.on('npc:speak', (payload) => {
            const npcId = payload && payload.npcId;
            if (!npcId) {
                return;
            }
            speakCounts[npcId] = (speakCounts[npcId] || 0) + 1;
        });
        socket.on('serverTellPlayerMove', (_playerData, userData) => {
            (userData || []).forEach((player) => {
                if (!player || !player.isNpc || !player.npcId) {
                    return;
                }
                uniqueNpcIds.add(player.npcId);
                if (!positionsByNpc[player.npcId]) {
                    positionsByNpc[player.npcId] = [];
                }
                positionsByNpc[player.npcId].push({
                    x: player.x,
                    y: player.y
                });
            });
        });

        timer = setTimeout(() => finish(), durationMs);
    });
}

function writePlaceholderVideo(outputPath, summary) {
    const lines = [
        'TODO: requested Week 1 mp4 placeholder.',
        'Scenario: ' + summary.scenario,
        'Reason: ' + summary.video.reason,
        'Recorded format: ' + (summary.video.detectedFormat || 'unknown'),
        'Raw capture: ' + (summary.video.rawCapturePath || 'n/a'),
        'Next step: convert raw WebM to true MP4 once ffmpeg/export support is available.'
    ];
    fs.writeFileSync(outputPath, lines.join('\n') + '\n', 'utf8');
}

function finalizeVideo(outputPath, summary) {
    const detectedFormat = probeRecordedFormat(outputPath);
    summary.video.detectedFormat = detectedFormat;

    if (detectedFormat === 'missing') {
        summary.video.reason = 'playwright-cli did not create the requested video file';
        writePlaceholderVideo(outputPath, summary);
        return;
    }

    if (/webm/i.test(detectedFormat)) {
        const rawCapturePath = outputPath.replace(/\.mp4$/i, '.playwright.webm');
        fs.copyFileSync(outputPath, rawCapturePath);
        summary.video.rawCapturePath = rawCapturePath;
        summary.video.kind = 'webm-bytes-with-mp4-name';
        summary.video.reason = 'playwright-cli wrote WebM bytes under an .mp4 name; kept original capture and mirrored a .webm copy';
        return;
    }

    summary.video.kind = 'mp4';
    summary.video.reason = 'recorded';
}

function writeSummary(summary) {
    fs.writeFileSync(summary.outputPath + '.json', JSON.stringify(summary, null, 2) + '\n', 'utf8');
}

function buildScenarioOptions(config) {
    const defaults = Object.assign({
        scriptName: 'week1-playthrough-online.js',
        scenario: 'online',
        session: 'w1-online',
        url: DEFAULT_URL,
        durationMs: DEFAULT_DURATION_MS,
        timeoutMs: DEFAULT_TIMEOUT_MS,
        windowSize: DEFAULT_WINDOW,
        outputPath: path.resolve(VIDEOS_DIR, 'online.mp4'),
        ensureServer: true,
        auditDir: 'data/audit/week1/online',
        serverCommand: 'PORT=35100 HOST=127.0.0.1 IP=127.0.0.1 LLM_PROVIDER=mock LLM_AUDIT_DIR=data/audit/week1/online node dist/server/server.js',
        serverEnv: {},
        settleDelayMs: 0,
        executeScenario: observeOnline
    }, config || {});
    const args = parseArgs(process.argv.slice(2));
    const durationOverride = args['duration-ms'] || process.env.W1_DURATION_MS;
    const timeoutOverride = args['timeout-ms'] || process.env.W1_TIMEOUT_MS;

    if (args.help) {
        console.log([
            'Usage: node demo/scripts/' + defaults.scriptName + ' [options]',
            '',
            '--url <url>              Target local game URL. Default: ' + defaults.url,
            '--duration-ms <ms>       Observation length. Default: ' + defaults.durationMs,
            '--output <path>          Requested mp4 output path. Default: ' + defaults.outputPath,
            '--ensure-server <bool>   Start a managed local server if needed. Default: ' + defaults.ensureServer,
            '--server-command <cmd>   Managed server shell command.',
            '--timeout-ms <ms>        Server wait timeout. Default: ' + defaults.timeoutMs
        ].join('\n'));
        return null;
    }

    return Object.assign({}, defaults, {
        url: typeof args.url === 'string' ? args.url : defaults.url,
        durationMs: toNumber(durationOverride, defaults.durationMs),
        timeoutMs: toNumber(timeoutOverride, defaults.timeoutMs),
        outputPath: path.resolve(ROOT_DIR, typeof args.output === 'string' ? args.output : path.relative(ROOT_DIR, defaults.outputPath)),
        ensureServer: toBoolean(args['ensure-server'], defaults.ensureServer),
        serverCommand: typeof args['server-command'] === 'string' ? args['server-command'] : defaults.serverCommand,
        settleDelayMs: toNumber(args['settle-delay-ms'], defaults.settleDelayMs)
    });
}

function createDriver(options) {
    return {
        async open() {
            runPlaywright(options.session, ['open', options.url]);
            runPlaywright(options.session, ['resize'].concat(options.windowSize.split('x')));
        },
        async close() {
            tryRunPlaywright(options.session, ['close']);
        },
        async startVideo() {
            runPlaywright(options.session, ['video-start', relativeToRoot(options.outputPath), '--size', options.windowSize]);
        },
        async stopVideo() {
            tryRunPlaywright(options.session, ['video-stop']);
        },
        async sleep(ms) {
            await sleep(ms);
        },
        async fill(selector, text) {
            runPlaywright(options.session, ['fill', selector, text]);
        },
        async press(key) {
            runPlaywright(options.session, ['press', key]);
        },
        async evaluate(source) {
            return parseEvalOutput(runPlaywright(options.session, ['eval', source], true));
        },
        async selectorExists(selector) {
            return Boolean(await this.evaluate('() => Boolean(document.querySelector(' + JSON.stringify(selector) + '))'));
        },
        async waitForSelector(selector, timeoutMs) {
            const deadline = Date.now() + timeoutMs;

            while (Date.now() < deadline) {
                if (await this.selectorExists(selector)) {
                    return;
                }
                await sleep(250);
            }

            throw new Error('Timed out waiting for selector ' + selector);
        },
        async statusText() {
            return String(await this.evaluate('() => { const node = document.querySelector("#status"); return node ? node.innerText : ""; }') || '');
        },
        async bodyText() {
            return String(await this.evaluate('() => document.body ? document.body.innerText : ""') || '');
        },
        async chatLines() {
            const value = await this.evaluate('() => Array.from(document.querySelectorAll("#chatList li")).map((node) => node.textContent || "")');
            return Array.isArray(value) ? value : [];
        },
        async chatHistory() {
            const value = await this.evaluate('() => Array.from(document.querySelectorAll(".npc-chat-history-item")).map((node) => node.textContent || "")');
            return Array.isArray(value) ? value : [];
        },
        async canvasFingerprint() {
            return String(await this.evaluate([
                '() => {',
                '  const canvas = document.getElementById("cvs");',
                '  if (!canvas) {',
                '    return "missing-canvas";',
                '  }',
                '  const context = canvas.getContext("2d");',
                '  const points = [];',
                '  const stepX = Math.max(1, Math.floor(Math.max(canvas.width, 1) / 6));',
                '  const stepY = Math.max(1, Math.floor(Math.max(canvas.height, 1) / 6));',
                '  for (let y = 0; y < canvas.height; y += stepY) {',
                '    for (let x = 0; x < canvas.width; x += stepX) {',
                '      const pixel = context.getImageData(x, y, 1, 1).data;',
                '      points.push(Array.from(pixel).join("-"));',
                '    }',
                '  }',
                '  return points.join("|");',
                '}'
            ].join(' ')) || '');
        },
        async waitForReady(timeoutMs) {
            const deadline = Date.now() + timeoutMs;

            while (Date.now() < deadline) {
                const statusText = await this.statusText();
                const hasCanvas = Boolean(await this.evaluate('() => Boolean(document.getElementById("cvs"))'));
                if (hasCanvas && statusText.includes('Mochi') && statusText.includes('Doudou') && statusText.includes('Wugui')) {
                    return statusText;
                }
                await sleep(500);
            }

            throw new Error('Timed out waiting for the game HUD and canvas to become ready.');
        }
    };
}

async function observeOnline(driver, options, summary) {
    const statusText = await driver.waitForReady(options.timeoutMs);
    const observeMs = Math.max(6000, options.durationMs);
    const activityPromise = observeNpcActivity(options.url, observeMs);
    await driver.sleep(observeMs);
    const activity = await activityPromise;
    const requiredNpcIds = ['doudou', 'mochi', 'wugui'];
    const movingNpcIds = Object.keys(activity.movementByNpc).filter((npcId) => activity.movementByNpc[npcId] >= 10);
    const strictMode = options.durationMs >= 20000;

    if (strictMode) {
        requiredNpcIds.forEach((npcId) => {
            if (!activity.uniqueNpcIds.includes(npcId)) {
                throw new Error('Expected spectator observer to see NPC ' + npcId + ' during the online playthrough.');
            }
        });

        if (movingNpcIds.length < 3) {
            throw new Error('Expected all three NPCs to move during the online observation.');
        }
    }

    summary.onlineChecks = {
        hudPreview: statusText.split('\n').slice(0, 6),
        observedNpcIds: activity.uniqueNpcIds,
        movingNpcIds: movingNpcIds,
        movementByNpc: activity.movementByNpc,
        speakCounts: activity.speakCounts
    };
}

async function runScenario(config) {
    const options = buildScenarioOptions(config);
    if (!options) {
        return null;
    }

    ensureDir(path.dirname(options.outputPath));

    const summary = {
        scenario: options.scenario,
        script: options.scriptName,
        url: options.url,
        durationMs: options.durationMs,
        outputPath: options.outputPath,
        session: options.session,
        startedAt: new Date().toISOString(),
        audit: {
            dir: options.auditDir || null
        },
        server: {
            managed: options.ensureServer,
            command: options.serverCommand || null,
            logs: []
        },
        video: {
            requestedPath: options.outputPath,
            kind: 'placeholder',
            reason: 'not-run'
        },
        auditWindow: {
            startedTsMs: null,
            finishedTsMs: null
        }
    };

    let server = null;
    const driver = createDriver(options);

    try {
        if (options.ensureServer) {
            if (!options.serverCommand) {
                throw new Error('Managed server requested without --server-command.');
            }
            if (options.auditDir) {
                removeDir(path.resolve(ROOT_DIR, options.auditDir));
            }
            server = spawnServer(options.serverCommand, options.serverEnv);
            summary.server.logs = server.logs;
            await sleep(250);
            if (server.child.exitCode !== null) {
                throw new Error('Managed server exited before becoming ready: ' + server.logs.slice(-5).join(' | '));
            }
        }

        await waitForServer(options.url, options.timeoutMs);
        await driver.close();
        await driver.open();
        await driver.startVideo();
        summary.auditWindow.startedTsMs = Date.now();
        await options.executeScenario(driver, options, summary);
        if (options.settleDelayMs > 0) {
            await driver.sleep(options.settleDelayMs);
        }
        summary.auditWindow.finishedTsMs = Date.now();
        await driver.stopVideo();
        await driver.close();
        summary.video.reason = 'awaiting-format-probe';
    } catch (error) {
        summary.auditWindow.finishedTsMs = summary.auditWindow.finishedTsMs || Date.now();
        summary.failure = {
            message: error && error.message ? error.message : String(error),
            stack: error && error.stack ? error.stack : null
        };
        summary.video.reason = summary.failure.message;
        await driver.stopVideo();
        await driver.close();
    } finally {
        await stopServer(server);
        summary.finishedAt = new Date().toISOString();
        summary.observedDurationMs = summary.auditWindow.startedTsMs && summary.auditWindow.finishedTsMs
            ? Math.max(0, summary.auditWindow.finishedTsMs - summary.auditWindow.startedTsMs)
            : null;
        finalizeVideo(options.outputPath, summary);
        writeSummary(summary);
    }

    return summary;
}

async function main() {
    const summary = await runScenario({
        scriptName: 'week1-playthrough-online.js',
        scenario: 'online',
        session: 'w1-online',
        outputPath: path.resolve(VIDEOS_DIR, 'online.mp4')
    });

    if (!summary) {
        return;
    }

    console.log(JSON.stringify({
        scenario: summary.scenario,
        outputPath: summary.outputPath,
        video: summary.video,
        observedDurationMs: summary.observedDurationMs,
        auditWindow: summary.auditWindow,
        failure: summary.failure || null
    }, null, 2));

    if (summary.failure) {
        process.exitCode = 1;
    }
}

module.exports = {
    runScenario: runScenario
};

if (require.main === module) {
    main().catch((error) => {
        console.error(error && error.stack ? error.stack : error);
        process.exit(1);
    });
}

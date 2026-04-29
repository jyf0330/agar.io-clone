/* jshint esversion: 8 */

const gulp = require('gulp');
const babel = require('gulp-babel');
const { ESLint } = require('eslint');
const nodemon = require('nodemon');
const webpack = require('webpack-stream');
const Mocha = require('mocha');
const fs = require("fs");
const path = require("path");
const PluginError = require('plugin-error');

const PATHS = {
    serverSrc: 'apps/server/src',
    clientRoot: 'apps/client',
    clientSrc: 'apps/client/src',
    clientAssets: 'apps/client/assets',
    tests: 'tests',
    dist: process.env.DIST_DIR || 'dist',
};

function getWebpackConfig() {
    return require('./webpack.config.js')(!process.env.IS_DEV)
}

function runServer(done) {
    let started = false;
    nodemon({
        delay: 10,
        script: path.join(PATHS.dist, 'server/server.js'),
        watch: [path.join(PATHS.dist, 'server')],
        ext: 'js'
    }).on('start', () => {
        if (!started) {
            started = true;
            done();
        }
    }).on('quit', () => process.exit(0));
}

function buildServer() {
    let task = gulp.src([`${PATHS.serverSrc}/**/*.*`, `${PATHS.serverSrc}/**/*.js`]);
    if (!process.env.IS_DEV) {
        task = task.pipe(babel())
    }
    return task.pipe(gulp.dest(path.join(PATHS.dist, 'server')));
}

function copyClientHtml() {
    const sourcePath = path.resolve(PATHS.clientRoot, 'index.html');
    const destinationDir = path.resolve(PATHS.dist, 'client');
    fs.mkdirSync(destinationDir, { recursive: true });
    fs.copyFileSync(sourcePath, path.join(destinationDir, 'index.html'));
    return Promise.resolve();
}

function copyClientAssets() {
    return gulp.src([`${PATHS.clientAssets}/**/*.*`], { base: PATHS.clientAssets, encoding: false })
        .pipe(gulp.dest(path.join(PATHS.dist, 'client')));
}

function buildClientJS() {
    return gulp.src([`${PATHS.clientSrc}/*.js`])
        .pipe(webpack(getWebpackConfig()))
        .pipe(gulp.dest(path.join(PATHS.dist, 'client/js')));
}

function setDev(done) {
    process.env.IS_DEV = 'true';
    done();
}

function mocha(done) {
    const mochaInstance = new Mocha()
    const testRoot = process.env.TEST_DIR || PATHS.tests;
    const files = fs
        .readdirSync(testRoot, {recursive: true})
        .filter(x => x.endsWith('.js')).map(x => path.resolve(testRoot, x));
    for (const file of files) {
        mochaInstance.addFile(file);
    }
    mochaInstance.run(failures => failures ? done(new PluginError('mocha', `${failures} test(s) failed`)) : done());
}

gulp.task('lint', async () => {
    const eslint = new ESLint({
        errorOnUnmatchedPattern: false
    });
    const results = await eslint.lintFiles([
        '*.js',
        'apps/**/*.js',
        'configs/**/*.js',
        'demo/**/*.js',
        'tests/**/*.js',
        'tools/**/*.js'
    ]);
    const formatter = await eslint.loadFormatter('stylish');
    const output = formatter.format(results);
    if (output) {
        console.log(output);
    }

    const errorCount = results.reduce((total, result) => total + result.errorCount, 0);
    if (errorCount > 0) {
        throw new PluginError('eslint', `${errorCount} lint error(s)`);
    }
});

gulp.task('test', gulp.series('lint', mocha));

gulp.task('build', gulp.series('lint', gulp.parallel(copyClientHtml, copyClientAssets, buildClientJS, buildServer, mocha)));

gulp.task('dev', gulp.parallel(copyClientHtml, copyClientAssets, buildClientJS, buildServer));

gulp.task('run', gulp.series('build', runServer));

gulp.task('watch:sources', () => {
    gulp.watch([
        `${PATHS.serverSrc}/**/*.*`,
        `${PATHS.clientRoot}/index.html`,
        `${PATHS.clientSrc}/**/*.js`,
        `${PATHS.clientAssets}/**/*.*`
    ], gulp.series('dev'));
});

gulp.task('watch', gulp.series(setDev, 'dev', gulp.parallel(runServer, 'watch:sources')));

gulp.task('default', gulp.series('run'));

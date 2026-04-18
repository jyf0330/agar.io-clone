/* jshint esversion: 8 */

const gulp = require('gulp');
const babel = require('gulp-babel');
const eslint = require('gulp-eslint');
const nodemon = require('gulp-nodemon');
const todo = require('gulp-todo');
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
    dist: 'dist',
};

function getWebpackConfig() {
    return require('./webpack.config.js')(!process.env.IS_DEV)
}

function runServer(done) {
    nodemon({
        delay: 10,
        script: './dist/server/server.js',
        ignore: ['dist/'],
        ext: 'js html css',
        done,
        tasks: [process.env.IS_DEV ? 'dev' : 'build']
    })
}

function buildServer() {
    let task = gulp.src([`${PATHS.serverSrc}/**/*.*`, `${PATHS.serverSrc}/**/*.js`]);
    if (!process.env.IS_DEV) {
        task = task.pipe(babel())
    }
    return task.pipe(gulp.dest(`${PATHS.dist}/server/`));
}

function copyClientHtml() {
    const sourcePath = path.resolve(PATHS.clientRoot, 'index.html');
    const destinationDir = path.resolve(PATHS.dist, 'client');
    fs.mkdirSync(destinationDir, { recursive: true });
    fs.copyFileSync(sourcePath, path.join(destinationDir, 'index.html'));
    return Promise.resolve();
}

function copyClientAssets() {
    return gulp.src([`${PATHS.clientAssets}/**/*.*`], { base: PATHS.clientAssets })
        .pipe(gulp.dest(`./${PATHS.dist}/client/`));
}

function buildClientJS() {
    return gulp.src([`${PATHS.clientSrc}/*.js`])
        .pipe(webpack(getWebpackConfig()))
        .pipe(gulp.dest(`${PATHS.dist}/client/js/`));
}

function setDev(done) {
    process.env.IS_DEV = 'true';
    done();
}

function mocha(done) {
    const mochaInstance = new Mocha()
    const files = fs
        .readdirSync(PATHS.tests, {recursive: true})
        .filter(x => x.endsWith('.js')).map(x => path.resolve(`${PATHS.tests}/` + x));
    for (const file of files) {
        mochaInstance.addFile(file);
    }
    mochaInstance.run(failures => failures ? done(new PluginError('mocha', `${failures} test(s) failed`)) : done());
}

gulp.task('lint', () => {
    return gulp.src(['**/*.js', '!node_modules/**/*.js', '!dist/**/*.js', '!graphify-out/**/*.js'])
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.failAfterError())
});

gulp.task('test', gulp.series('lint', mocha));

gulp.task('todo', gulp.series('lint', () => {
    return gulp.src('apps/**/*.js')
        .pipe(todo())
        .pipe(gulp.dest('./'));
}));

gulp.task('build', gulp.series('lint', gulp.parallel(copyClientHtml, copyClientAssets, buildClientJS, buildServer, mocha)));

gulp.task('dev', gulp.parallel(copyClientHtml, copyClientAssets, buildClientJS, buildServer));

gulp.task('run', gulp.series('build', runServer));

gulp.task('watch', gulp.series(setDev, 'dev', runServer));

gulp.task('default', gulp.series('run'));

const { series, watch, parallel } = require('gulp');
const del = require('del');

const liveServer = require('gulp-live-server');

const buildPug = require('./build-pug');
const buildCss = require('./build-css');

const paths = require('./paths');

function clean() {
  return del([
    `${paths.outDir}/**/*`
  ]);
}

exports.default = series(clean, buildPug, buildCss());
exports.watch = function() {
  const server = liveServer.static(paths.outDir);
  server.start();

  const liveReload = function(_, filePath) {
    // live server workaround
    server.lr.changed({ body: { files: [filePath]}})
  }
  
  watch(['src/**/*'], { ignoreInitial: false }, parallel(buildPug, buildCss(false)));

  const outputWatcher = watch([`${paths.outDir}/**/*`]);
  outputWatcher.on('all', liveReload)
}
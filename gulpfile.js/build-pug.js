const { src, dest } = require('gulp');
const pug = require('gulp-pug');
const data = require('gulp-data');

const yaml = require('js-yaml');
const fs = require('fs');

const paths = require('./paths');

function importPugLocals() {
  return yaml.safeLoad(fs.readFileSync('src/content.yaml'))
}

function buildPug() {
  return src('src/*.pug')
    .pipe(data(importPugLocals))
    .pipe(pug())
    .pipe(dest(paths.outDir))
}

module.exports = buildPug;
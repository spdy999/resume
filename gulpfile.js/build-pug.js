const { src, dest } = require('gulp');
const pug = require('gulp-pug');
const data = require('gulp-data');

const fs = require('fs');

const paths = require('./paths');

const yaml = require('js-yaml');
const yamlInclude = require('yaml-include');
yamlInclude.setBaseFile('content/index.yaml');

function importPugLocals() {
  const src = fs.readFileSync(yamlInclude.basefile);
  const obj = yaml.safeLoad(src, { schema: yamlInclude.YAML_INCLUDE_SCHEMA, filename: yamlInclude.basefile });
  // console.log(obj);
  return obj;
}

function buildPug() {
  return src('src/*.pug')
    .pipe(data(importPugLocals))
    .pipe(pug())
    .pipe(dest(paths.outDir));
}

module.exports = buildPug;
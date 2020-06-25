const { src, dest } = require('gulp');

const postcss = require('gulp-postcss');
const sass = require('gulp-sass');
const tailwindcss = require('tailwindcss');

const paths = require('./paths');

const buildCss = (minify = true) => function buildCss() {
  const postCSSPlugins = [
    tailwindcss,
  ];
  
  let pipeline = src('src/index.scss')
    .pipe(sass())
    .pipe(postcss(postCSSPlugins))

  if (minify) {
    const cleanCSS = require('gulp-clean-css');

    pipeline = pipeline
      .pipe(cleanCSS({
        compatibility: 'ie8'
      }));
  }
    
   return pipeline.pipe(dest(paths.outDir));
}

module.exports = buildCss;
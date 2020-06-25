module.exports = {
  purge: [
    'src/**/*.pug'
  ],
  theme: {
    extend: {
      screens: {
        'print': { 'raw': 'print' }
      }
    },
  },
  variants: {},
  plugins: [],
}

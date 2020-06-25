# Resume

Web-based resume page. With a heavily over-engineering build pipeline Page is built using TailwindCSS, Pug.

Page content is separated from layout in `src/content.yaml`, data gets loaded and rendered on build.

### Developing
```
npm run dev
```
Live server with hot reload will start on port 3000.

### Building
```
npm run build
```

### Publishing to GitHub pages
```
npm run deploy
```
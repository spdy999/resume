# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A single-page web resume (Pornchanok Aporntip). Content lives in YAML, layout in Pug, styling in Tailwind-flavored SCSS. Gulp compiles everything into `dist/`, which is published to GitHub Pages.

## Commands

```
npm run dev      # gulp watch — live-reload server on port 3000
npm run build    # gulp default — clean + build to dist/ with NODE_ENV=production
npm run deploy   # build, then gh-pages -d dist
```

There is no test suite and no linter. Pushing to `master` triggers `.github/workflows/main.yml`, which runs `npm run build` and deploys `dist/` via `peaceiris/actions-gh-pages` (needs the `GH_TOKEN` secret) — so `npm run deploy` is only for manual publishing.

## Architecture

**Content/layout separation.** `content/index.yaml` holds top-level fields (`name`, `email`, `summary`, …) plus the line:

```yaml
<<: !!inc/dir ["sections", {excludeTopLevelDirSeparator: true}]
```

`yaml-include` expands that into one top-level key per file in `content/sections/`, named after the file. So `content/sections/work_experience.yaml` becomes the `work_experience` local in Pug. Adding a section file makes the data available but does **not** render it — `src/index.pug` must also gain an explicit `+section(...)` block. Ordering on the page comes from `index.pug`, not from the filesystem.

**Build pipeline** (`gulpfile.js/`, a directory module, not a single file):
- `build-pug.js` — loads the YAML tree via `gulp-data` and passes it as Pug locals, compiles `src/*.pug` to `dist/`.
- `build-css.js` — exported as a *factory*: `buildCss(minify)` returns the task. `index.js` calls `buildCss()` (minified) for the default build and `buildCss(true)` in watch. Pipeline is SCSS → `sass` → PostCSS/Tailwind → optional `clean-css`.
- `index.js` — `default` = set NODE_ENV=production, clean `dist/`, build Pug and CSS; `watch` = live server plus watchers on `src/**/*` and `content/**/*`.

**Pug mixins** live in `src/views/section.pug`: `section(title)`, `section-item(item)` (title/date/subtitle/stacks/details), and `section-item-compact(item)` (title + date only, used for awards). Optional YAML fields are guarded with `if`, so items may omit `title`, `date`, `stacks`, or `details`.

**Print is a first-class target.** `tailwind.config.js` defines a custom `print` screen (`{ raw: 'print' }`), so `print:` variants work in Pug classes and `@screen print` works in SCSS. `src/index.scss` sets the body to A4 width (`210mm`) in print and lets content flow across pages. Changes to layout should be checked in print preview, not just on screen.

To count pages without opening a browser:

```
npm run build
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu \
  --no-pdf-header-footer --print-to-pdf=/tmp/r.pdf "file://$PWD/dist/index.html"
pdftotext /tmp/r.pdf -   # per-page text; count pages via /Type /Page in the PDF
```

Note headless Chrome does **not** reproduce every print-preview behaviour — see the `page-break-after` gotcha below.

## Gotchas

- **Tailwind v1** with `purge: ['src/**/*.pug']`. Class names must appear literally in Pug — never build them from YAML content, or the production build purges them. Utilities with a `:` (`md:`, `print:`) must go in a `class="…"` attribute, not dot-notation.
- `content/sections/address*.yaml` is gitignored (personal address). The `address` local is therefore absent in a fresh clone, and `index.pug` guards it with `if address` / `locals.address`. Keep new personal-data fields behind similar guards.
- `js-yaml` v3 API (`yaml.safeLoad`) is used with `yamlInclude.YAML_INCLUDE_SCHEMA`; the include base file path is hardcoded to `content/index.yaml` in `build-pug.js`.
- Locals that come from the include-dir merge are read via `locals.<name>` in `index.pug` to avoid Pug's undefined-variable errors.
- **A YAML syntax error in `content/` produces a successful-looking build with stale HTML.** `gulp-data` throws inside `buildPug`, but gulp still prints `Finished 'default'` and `buildCss` rewrites the CSS, so only `dist/index.html` is left stale. Most common cause: an unquoted scalar containing `: ` (e.g. `- Load-tested with harnesses: zero throttling`), which YAML reads as a mapping key. Quote any bullet containing a colon, and check the `dist/index.html` mtime if a content change doesn't appear.
- **Never put `page-break-after: always` on `body`.** It was removed in Sep 2026 because it appended a blank trailing page in Chrome's interactive print preview once content filled the previous page. Headless Chrome collapses that break, so `--print-to-pdf` will *not* reproduce the bug — verify page-break changes in a real print preview. A fixed `max-height: 297mm` on `body` was dropped at the same time; it conflicts with the print dialog's own margins.

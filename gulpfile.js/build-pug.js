const { src, dest } = require('gulp');
const pug = require('gulp-pug');
const data = require('gulp-data');

const fs = require('fs');
const path = require('path');

const paths = require('./paths');

const yaml = require('js-yaml');
const yamlInclude = require('yaml-include');
yamlInclude.setBaseFile('content/index.yaml');

const variantsDir = 'content/variants';

function loadBase() {
  const src = fs.readFileSync(yamlInclude.basefile);
  return yaml.safeLoad(src, { schema: yamlInclude.YAML_INCLUDE_SCHEMA, filename: yamlInclude.basefile });
}

function loadVariants() {
  if (!fs.existsSync(variantsDir)) return [];
  return fs.readdirSync(variantsDir)
    .filter((file) => file.endsWith('.yaml'))
    .map((file) => {
      const filename = path.join(variantsDir, file);
      return { name: path.basename(file, '.yaml'), spec: yaml.safeLoad(fs.readFileSync(filename), { filename }) };
    });
}

const bulletText = (bullet) => (typeof bullet === 'string' ? bullet : bullet.text);

// Base page: every bullet except those marked `default: false`.
function defaultDetails(details) {
  return details
    .filter((bullet) => typeof bullet === 'string' || bullet.default !== false)
    .map(bulletText);
}

// Variant page: exactly the listed bullet ids, in the listed order.
// An entry may be `{ id, text }` to reword that bullet for this variant only.
function pickDetails(details, picks, where) {
  const byId = new Map(details.filter((bullet) => bullet.id).map((bullet) => [bullet.id, bullet]));
  return picks.map((pick) => {
    const id = typeof pick === 'string' ? pick : pick.id;
    const bullet = byId.get(id);
    if (!bullet) throw new Error(`${where}: unknown bullet id "${id}"`);
    return (typeof pick === 'object' && pick.text) || bullet.text;
  });
}

// List sections (work_experience, projects, ...): a variant overrides items by `id`.
function resolveItems(items, overrides = {}, where) {
  const known = new Set(items.map((item) => item.id));
  Object.keys(overrides).forEach((id) => {
    if (!known.has(id)) throw new Error(`${where}: unknown item id "${id}"`);
  });

  return items
    .filter((item) => !(overrides[item.id] || {}).omit)
    .map((item) => {
      const override = overrides[item.id] || {};
      const resolved = { ...item, ...override };
      if (item.details) {
        resolved.details = override.details
          ? pickDetails(item.details, override.details, `${where}.${item.id}`)
          : defaultDetails(item.details);
      }
      return resolved;
    });
}

// Skills: a category is replaced by a list, or patched with `{ add, remove }`.
function resolveSkills(skills, overrides = {}) {
  const resolved = { ...skills };
  Object.entries(overrides).forEach(([category, change]) => {
    if (Array.isArray(change)) {
      resolved[category] = change;
      return;
    }
    const remove = new Set(change.remove || []);
    resolved[category] = (skills[category] || [])
      .filter((skill) => !remove.has(skill))
      .concat(change.add || []);
  });
  return resolved;
}

function resolveLocals(base, variant) {
  const spec = variant ? variant.spec : {};
  const where = variant ? `variant ${variant.name}` : 'base';
  const locals = { ...base, ...spec };

  Object.entries(base).forEach(([key, value]) => {
    if (Array.isArray(value) && value.some((item) => item && item.details)) {
      locals[key] = resolveItems(value, spec[key], `${where}.${key}`);
    }
  });
  locals.skills = resolveSkills(base.skills, spec.skills);
  locals.variant = variant ? variant.name : null;
  locals.css_href = variant ? '../index.css' : 'index.css';
  return locals;
}

function renderPug(locals, outDir) {
  return new Promise((resolve, reject) => {
    src('src/*.pug')
      .pipe(data(() => locals))
      .pipe(pug())
      .on('error', reject)
      .pipe(dest(outDir))
      .on('finish', resolve)
      .on('error', reject);
  });
}

// Content is loaded before any stream starts, so a YAML error fails the build
// instead of leaving a stale dist/index.html behind.
function buildPug() {
  const base = loadBase();
  const pages = [{ locals: resolveLocals(base), outDir: paths.outDir }].concat(
    loadVariants().map((variant) => ({
      locals: resolveLocals(base, variant),
      outDir: path.join(paths.outDir, variant.name),
    })),
  );
  return Promise.all(pages.map(({ locals, outDir }) => renderPug(locals, outDir)));
}

module.exports = buildPug;

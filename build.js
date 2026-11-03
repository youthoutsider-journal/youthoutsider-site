// Builds the Youth Outsider site into dist/. No dependencies: run with `node build.js`.
// Articles and authors live in content/ as JSON (written by the admin panel at /admin).
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'dist');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

// ---------- helpers ----------
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SHORT = ['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];
function parseDate(d) { const [y, m, day] = String(d).slice(0, 10).split('-').map(Number); return { y, m, day }; }
const longDate = (d) => { const p = parseDate(d); return `${MONTHS[p.m - 1]} ${p.day}, ${p.y}`; };
const shortDate = (d) => { const p = parseDate(d); return `${SHORT[p.m - 1]} ${p.day}, ${p.y}`; };
function mkdirp(p) { fs.mkdirSync(p, { recursive: true }); }
function copyDir(src, dst) {
  if (!fs.existsSync(src)) return;
  mkdirp(dst);
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d); else fs.copyFileSync(s, d);
  }
}
function slugify(s) { return String(s).toLowerCase().replace(/[“”"'’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

// ---------- a small Markdown converter (paragraphs, headings, lists, quotes, links, bold, italics) ----------
function inline(s) {
  let t = esc(s);
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, txt, url) => `<a href="${url.replace(/&amp;/g, '&').replace(/"/g, '%22')}">${txt}</a>`);
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/__([^_]+)__/g, '<strong>$1</strong>');
  t = t.replace(/(^|[^*\w])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>').replace(/(^|[^_\w])_([^_\n]+)_(?!\w)/g, '$1<em>$2</em>');
  return t;
}
function markdownBlocks(md) {
  const blocks = String(md || '').replace(/\r/g, '').split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return blocks.map((b) => {
    if (/^#{2,4}\s/.test(b)) { const n = b.match(/^#+/)[0].length; return { type: 'h', html: `<h${n}>${inline(b.replace(/^#+\s*/, ''))}</h${n}>` }; }
    if (/^>\s?/.test(b)) return { type: 'q', html: `<blockquote><p>${inline(b.replace(/^>\s?/gm, ''))}</p></blockquote>` };
    if (/^[-*]\s/.test(b)) return { type: 'l', html: '<ul>' + b.split('\n').map((l) => `<li>${inline(l.replace(/^[-*]\s+/, ''))}</li>`).join('') + '</ul>' };
    if (/^\d+\.\s/.test(b)) return { type: 'l', html: '<ol>' + b.split('\n').map((l) => `<li>${inline(l.replace(/^\d+\.\s+/, ''))}</li>`).join('') + '</ol>' };
    return { type: 'p', text: b.replace(/\n/g, ' ') };
  });
}

// ---------- content ----------
function loadJSONDir(dir) {
  const d = path.join(ROOT, dir);
  if (!fs.existsSync(d)) return [];
  return fs.readdirSync(d).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(d, f), 'utf8')));
}
const authors = loadJSONDir('content/authors');
const authorByName = Object.fromEntries(authors.map((a) => [a.name, a]));
const DESKS = { 'U.S. Politics': '/us-politics/', 'International Relations': '/international-relations/', 'Op-Ed': '/op-eds/' };
const articles = loadJSONDir('content/articles')
  .filter((a) => a.title && a.draft !== true)
  .map((a) => ({ ...a, slug: a.slug || slugify(a.title), url: `/articles/${a.slug || slugify(a.title)}/` }))
  .sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(a.title).localeCompare(String(b.title)));

// ---------- layout ----------
const css = read('src/css/site.css');
const NAV = [['/', 'Home'], ['/articles/', 'All Articles'], ['/us-politics/', 'U.S. Politics'], ['/international-relations/', 'International Relations'], ['/op-eds/', 'Op-Eds'], ['/join/', 'Join Us'], ['/about/', 'About']];
function layout({ title, description, active, body, ogImage }) {
  const pageTitle = title ? `${title} | Youth Outsider` : 'Youth Outsider: U.S. politics from the outside in';
  const desc = description || 'An independent journal of U.S. politics and international relations, written by American teens in the States and abroad.';
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(pageTitle)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(title || 'Youth Outsider')}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${esc(ogImage || 'https://youthoutsider.org/images/site/logo.png')}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/images/site/favicon-192.png">
<link rel="apple-touch-icon" href="/images/site/favicon-192.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Source+Sans+3:wght@400;500;600;700&display=swap">
<link rel="stylesheet" href="/css/site.css">
</head><body>
<header class="top"><div class="wrap">
  <a class="brand-top" href="/" aria-label="Youth Outsider, home"><img src="/images/site/favicon-192.png" alt=""><span>Youth Outsider<i>.</i></span></a>
  <nav class="links" aria-label="Sections">
${NAV.slice(1).map(([href, label]) => `    <a href="${href}"${href === active ? ' aria-current="page"' : ''}>${label}</a>`).join('\n')}
  </nav>
</div></header>
<main><section class="page"><div class="wrap">
${body}
</div></section></main>
<footer><div class="wrap">
  <div class="brand"><img src="/images/site/logo.png" alt=""><div><b>Youth Outsider<span>.</span></b><p>U.S. politics from the outside in.</p></div></div>
  <div class="links">${NAV.slice(1).map(([h, l]) => `<a href="${h}">${l}</a>`).join('')}</div>
  <p class="fine">© ${new Date().getFullYear()} Youth Outsider. Opinion pieces reflect the views of their authors.</p>
</div></footer>
<script src="/js/site.js"></script>
</body></html>
`;
}

// ---------- article pieces ----------
const byline = (a) => `By <b>${esc(a.author || 'Youth Outsider Editorial Team')}</b>`;
function leadCard(a, opts = {}) {
  return `  <article class="lead">
    <a href="${a.url}"><img src="${esc(a.cover)}" alt="${esc(a.cover_alt || '')}">${opts.caption && a.cover_caption ? `<p class="cap">${esc(a.cover_caption)}</p>` : ''}</a>
    <div>
      <span class="label d-${deskSlug(a.desk)}">${opts.readTime ? '' : '<b class="new">Latest</b>'}${esc(a.desk)}${opts.readTime ? ` · ${a.read_time || 3} min read` : ''}</span>
      <h3><a class="hl" href="${a.url}">${esc(a.title)}</a></h3>
      <p class="dek">${esc(a.dek)}</p>
      <p class="meta">${byline(a)} · ${longDate(a.date)}${opts.readTime ? '' : ` · ${a.read_time || 3} min read`}</p>
      <a class="tl" href="${a.url}">Read the story</a>
    </div>
  </article>
`;
}
function rowCard(a) {
  return `    <a class="arow" data-desk="${deskSlug(a.desk)}" href="${a.url}">
      <div class="ad"><span class="label">${esc(a.desk)}</span><span class="meta">${shortDate(a.date)}</span></div>
      <div><h3 class="hl">${esc(a.title)}</h3><p>${esc(a.dek)}</p><p class="meta">${byline(a)} · ${a.read_time || 3} min read</p></div>
      <img src="${esc(a.cover)}" alt="">
    </a>
`;
}
function gridCard(a) {
  return `    <a class="gcard" href="${a.url}">
      <img src="${esc(a.cover)}" alt="">
      <span class="label d-${deskSlug(a.desk)}">${esc(a.desk)}</span>
      <h3 class="hl">${esc(a.title)}</h3>
      <p>${esc(a.dek)}</p>
      <p class="meta">${byline(a)} · ${shortDate(a.date)} · ${a.read_time || 3} min read</p>
    </a>
`;
}
const deskSlug = (d) => (DESKS[d] || '/').replace(/\//g, '');
// lead story on top, then a grid, then a "see all" button
const GRID_MAX = 6;
function leadAndGrid(list, seeAllHref, seeAllText, leadOpts) {
  if (!list.length) return '';
  const grid = list.slice(1, 1 + GRID_MAX);
  return leadCard(list[0], leadOpts)
    + (grid.length ? `  <div class="grid">\n${grid.map(gridCard).join('')}  </div>\n` : '')
    + `  <div class="seeall"><a class="btn" href="${seeAllHref}">${seeAllText} →</a></div>\n`;
}
const rows = (list, style = '') => (list.length ? `  <div class="arch"${style}>\n${list.map(rowCard).join('')}  </div>\n` : '');

function articleBody(a) {
  const blocks = markdownBlocks(a.body);
  const figs = (a.figures || []).filter((f) => f && f.image);
  const figAt = {};
  figs.forEach((f) => { const n = Math.max(1, parseInt(f.paragraph, 10) || 1); (figAt[n] = figAt[n] || []).push(f); });
  // paragraphs that should start below any floating graphic
  const pIdx = blocks.map((b, i) => (b.type === 'p' ? i : -1)).filter((i) => i >= 0);
  const clearSet = new Set();
  Object.keys(figAt).map(Number).forEach((n) => {
    const target = n + 2;
    if (!figAt[target] && target <= pIdx.length) clearSet.add(target);
    if (n >= pIdx.length - 1) clearSet.add(pIdx.length);
  });
  let p = 0;
  const html = blocks.map((b) => {
    if (b.type !== 'p') return '    ' + b.html;
    p += 1;
    const imgs = (figAt[p] || []).map((f) => {
      const cls = `wfig ${f.side === 'left' ? 'l' : 'r'}${f.width === 'wide' ? ' wf-map' : ''}`;
      return `<img class="${cls}" src="${esc(f.image)}" style="shape-outside:url('${esc(f.image)}')" alt="${esc(f.alt || '')}">`;
    }).join('');
    const clear = clearSet.has(p) && !figAt[p] ? ' style="clear:both"' : '';
    return `    <p${clear}>${imgs}${inline(b.text)}</p>`;
  }).join('\n');
  return html + (a.credits ? `\n    <p class="end">${inline(a.credits)}</p>` : '');
}
function articlePage(a) {
  const au = authorByName[a.author];
  const body = `<article class="article">
  <a class="back" href="/articles/">← All articles</a>
  <span class="label">${esc(a.desk)}</span>
  <h1 class="story-title">${esc(a.title)}</h1>
  <p class="dek">${esc(a.dek)}</p>
  <div class="by"><span class="meta">${byline(a)}</span><span class="meta">${longDate(a.date)}</span><span class="meta">${a.read_time || 3} min read</span></div>
  <figure><img src="${esc(a.cover)}" alt="${esc(a.cover_alt || '')}">${a.cover_caption ? `<figcaption class="cap">${esc(a.cover_caption)}</figcaption>` : ''}</figure>
  <div class="body">
${articleBody(a)}
  </div>
${au && au.bio ? `  <div class="authorbio"><b>${esc(au.name)}</b> ${inline(au.bio)}</div>\n` : ''}  <div class="after"><p><b>Write for Youth Outsider.</b> Join the staff, or pitch a single piece as a guest.</p><a class="btn" href="/join/">Get involved</a></div>
</article>`;
  return layout({ title: a.title, description: a.dek, active: '/articles/', body, ogImage: a.cover });
}

// ---------- pages ----------
function fill(html) {
  // the lead story: the newest article (if several share the newest date, one marked "featured" wins)
  const newest = articles[0] && articles[0].date;
  const latest = articles.find((a) => a.date === newest && a.featured) || articles[0];
  const ordered = latest ? [latest, ...articles.filter((a) => a !== latest)] : [];
  html = html.replace(/\{\{LATEST_URL\}\}/g, latest ? latest.url : '/articles/');
  html = html.replace('{{LATEST}}', latest
    ? `${leadAndGrid(ordered, '/articles/', 'See all articles')}`
    : '');
  html = html.replace(/\{\{DESK:([^}]+)\}\}/g, (m, desk) => {
    const list = ordered.filter((a) => a.desk === desk);
    if (!list.length) return '';
    return leadAndGrid(list, `/articles/?desk=${deskSlug(desk)}`, `See all ${desk === 'Op-Ed' ? 'op-eds' : desk + ' articles'}`, { caption: true, readTime: true });
  });
  const chips = [['', 'All'], ...Object.keys(DESKS).map((d) => [deskSlug(d), d === 'Op-Ed' ? 'Op-Eds' : d])]
    .map(([k, t]) => `<a class="chip" data-f="${k}" href="/articles/${k ? '?desk=' + k : ''}">${t}</a>`).join('');
  html = html.replace('{{FILTERS}}', `  <nav class="chips" aria-label="Filter by desk">${chips}</nav>\n`);
  html = html.replace('{{ALL}}', rows(articles));
  return html;
}
const PAGES = [
  ['home', '/', '', 'Youth Outsider'],
  ['all', '/articles/', '/articles/', 'All articles'],
  ['us', '/us-politics/', '/us-politics/', 'U.S. Politics'],
  ['ir', '/international-relations/', '/international-relations/', 'International Relations'],
  ['oped', '/op-eds/', '/op-eds/', 'Op-Eds'],
  ['join', '/join/', '/join/', 'Join us'],
  ['apply', '/apply/', '/join/', 'Staff application'],
  ['guest', '/guest/', '/join/', 'Guest article or op-ed'],
  ['about', '/about/', '/about/', 'About'],
];

// ---------- write ----------
fs.rmSync(OUT, { recursive: true, force: true });
mkdirp(OUT);
copyDir(path.join(ROOT, 'static'), OUT);
copyDir(path.join(ROOT, 'admin'), path.join(OUT, 'admin'));
mkdirp(path.join(OUT, 'css')); fs.writeFileSync(path.join(OUT, 'css/site.css'), css);
mkdirp(path.join(OUT, 'js')); fs.copyFileSync(path.join(ROOT, 'src/js/site.js'), path.join(OUT, 'js/site.js'));
for (const [name, url, active, title] of PAGES) {
  const body = fill(read(`src/pages/${name}.html`));
  const dir = path.join(OUT, url); mkdirp(dir);
  fs.writeFileSync(path.join(dir, 'index.html'), layout({ title: name === 'home' ? '' : title, active: active || '/', body, ogImage: '/images/site/capitol-hero.jpg' }));
}
for (const a of articles) {
  const dir = path.join(OUT, a.url); mkdirp(dir);
  fs.writeFileSync(path.join(dir, 'index.html'), articlePage(a));
}
// 404 and old links
mkdirp(OUT);
fs.writeFileSync(path.join(OUT, '404.html'), layout({ title: 'Page not found', active: '', body: '<div class="pagehead"><span class="label">404</span><h2>We couldn\'t find that page.</h2><p><a class="tl" href="/">Go to the home page</a></p></div>' }));
console.log(`Built ${PAGES.length} pages and ${articles.length} articles into dist/`);

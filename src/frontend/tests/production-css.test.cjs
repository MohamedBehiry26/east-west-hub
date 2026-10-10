const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const output = path.resolve(__dirname, '../dist/space-media-web/browser');

test('production CSS applies without inline script handlers under the Pages CSP', () => {
  const html = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1];
  assert.ok(head, 'production HTML must have a head');
  assert.match(head, /<base\s+href="\/"/);
  assert.doesNotMatch(head, /<noscript\b/i, 'stylesheet must not depend on a noscript fallback');
  const stylesheets = [...head.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/gi)].map(match => match[0]);
  const bundles = stylesheets.filter(link => /href="styles-[^"/]+\.css"/.test(link));
  assert.ok(bundles.length > 0, 'hashed global CSS bundle must be linked');
  for (const link of bundles) {
    assert.doesNotMatch(link, /\bon\w+\s*=/i, 'CSP blocks inline event handlers');
    assert.ok(!/\bmedia=/.test(link) || /\bmedia="all"/.test(link), 'CSS must apply to screen immediately');
    const href = link.match(/href="([^"]+)"/)[1];
    const css = fs.readFileSync(path.join(output, href), 'utf8');
    assert.match(css, /\.flex\{display:flex\}/, 'Tailwind flex utility must be generated');
    assert.match(css, /\.grid\{display:grid\}/, 'Tailwind grid utility must be generated');
    assert.match(css, /\.public-site\{/, 'public application design system must be generated');
  }
});

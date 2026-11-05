// Render check for a built process-video page.
// Usage: node check.js <page.html> <out_dir> [frac=0.7]
// Writes one canvas PNG per scene (frame at `frac` of each scene), a phone-width
// player shot, and prints script errors, phone horizontal overflow and a
// step-mode stop test. Uses the Playwright preinstalled in the environment.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const [page, outDir, fracArg] = process.argv.slice(2);
  if (!page || !outDir) { console.error('usage: node check.js <page.html> <out_dir> [frac]'); process.exit(1); }
  const frac = parseFloat(fracArg || '0.7');
  fs.mkdirSync(outDir, { recursive: true });
  // the artifact viewer wraps the page in this skeleton; mimic it
  const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>[hidden]{display:none!important}body{margin:0}</style></head><body>' + fs.readFileSync(page, 'utf8') + '</body></html>';
  const b = await chromium.launch();
  const errs = [];
  const mk = async (vp) => { const p = await b.newPage({ viewport: vp }); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); await p.setContent(html); await p.waitForTimeout(400); return p; };

  const d = await mk({ width: 1200, height: 1400 });
  const n = await d.evaluate(() => window.__pv && window.__pv.count);
  if (!n) { console.log('ERROR: window.__pv missing — page not built from the template?'); }
  for (let i = 0; i < (n || 0); i++) {
    await d.evaluate(([i, f]) => window.__pv.show(i, f), [i, frac]);
    await d.waitForTimeout(120);
    await d.locator('canvas').screenshot({ path: path.join(outDir, `scene-${String(i + 1).padStart(2, '0')}.png`) });
  }
  await d.locator('.player').screenshot({ path: path.join(outDir, 'player.png') });

  // step mode: from the start of scene 1, playback must stop near its end
  await d.evaluate(() => { window.__pv.show(0, 0); document.getElementById('modeStep').click(); document.getElementById('playBtn').click(); });
  const S0 = await d.evaluate(() => window.__pv.state());
  await d.waitForTimeout(10000);
  const st = await d.evaluate(() => window.__pv.state());
  console.log('step-mode stop:', st.atEnd ? 'OK' : 'FAILED', JSON.stringify({ from: S0.step, now: st }));

  const m = await mk({ width: 390, height: 900 });
  await m.locator('.player').screenshot({ path: path.join(outDir, 'player-phone.png') });
  const sw = await m.evaluate(() => document.documentElement.scrollWidth);
  console.log('phone width 390 → scrollWidth', sw, sw > 390 ? 'OVERFLOW' : 'OK');
  console.log('scenes rendered:', n);
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no script errors');
  await b.close();
})();

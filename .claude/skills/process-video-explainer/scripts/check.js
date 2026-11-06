// Render check for a built process-video page.
// Usage: node check.js <page.html> <out_dir> [frac=0.7]
// Writes, per scene, a canvas PNG at `frac` of the scene (mid-animation) and a
// PNG at the step-mode stop frame (d-0.35 s, what a viewer sees when playback
// halts), plus contact sheets of the stop frames (sheet-N.png, 6 per sheet) so
// the whole video can be reviewed in a few images. Also saves desktop/phone
// player shots and prints script errors, phone horizontal overflow and a
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
  const durs = await d.evaluate(() => (window.__pv && window.__pv.durs) || []);
  const stops = [];
  for (let i = 0; i < (n || 0); i++) {
    const tag = String(i + 1).padStart(2, '0');
    await d.evaluate(([i, f]) => window.__pv.show(i, f), [i, frac]);
    await d.waitForTimeout(120);
    await d.locator('#stage').screenshot({ path: path.join(outDir, `scene-${tag}.png`) });
    const dur = durs[i] || 9, stopF = Math.max(0, (dur - 0.35) / dur);
    await d.evaluate(([i, f]) => window.__pv.show(i, f), [i, stopF]);
    await d.waitForTimeout(120);
    const f = path.join(outDir, `scene-${tag}-stop.png`);
    await d.locator('#stage').screenshot({ path: f });
    stops.push(f);
  }
  await d.locator('.player').screenshot({ path: path.join(outDir, 'player.png') });

  // contact sheets of stop frames: review these first, fix everything in one pass
  if (stops.length) {
    const sp = await b.newPage({ viewport: { width: 1280, height: 1100 } });
    for (let g = 0; g < stops.length; g += 6) {
      const cells = stops.slice(g, g + 6).map((f, k) => `<figure><img src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}"><figcaption>${String(g + k + 1).padStart(2, '0')}</figcaption></figure>`).join('');
      await sp.setContent(`<style>body{margin:0;background:#fff;font:13px sans-serif}main{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:6px}figure{margin:0;position:relative}img{width:100%;display:block}figcaption{position:absolute;left:4px;bottom:4px;background:#fff;padding:0 4px}</style><main>${cells}</main>`);
      await sp.waitForTimeout(100);
      await sp.locator('main').screenshot({ path: path.join(outDir, `sheet-${g / 6 + 1}.png`) });
    }
    await sp.close();
  }

  // step mode: from the start of scene 1, playback must stop near its end
  await d.evaluate(() => { window.__pv.show(0, 0); document.getElementById('modeStep').click(); document.getElementById('playBtn').click(); });
  const S0 = await d.evaluate(() => window.__pv.state());
  await d.waitForTimeout(((durs[0] || 9) + 1) * 1000);
  const st = await d.evaluate(() => window.__pv.state());
  console.log('step-mode stop:', st.atEnd ? 'OK' : 'FAILED', JSON.stringify({ from: S0.step, now: st }));

  const m = await mk({ width: 390, height: 900 });
  await m.locator('.player').screenshot({ path: path.join(outDir, 'player-phone.png') });
  const sw = await m.evaluate(() => document.documentElement.scrollWidth);
  console.log('phone width 390 → scrollWidth', sw, sw > 390 ? 'OVERFLOW' : 'OK');
  console.log('scenes rendered:', n, '· contact sheets:', Math.ceil(stops.length / 6), '(stop frames, review these)');
  console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no script errors');
  await b.close();
})();

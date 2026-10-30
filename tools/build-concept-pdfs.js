// Rebuilds the printable concept-pack PDFs in /downloads from index.html.
// Run this after changing any concept, activity, or form content:
//
//   npm install playwright-core      (once; uses your installed Google Chrome)
//   node tools/build-concept-pdfs.js
//
// Each PDF is printed from the same concept pack the website's "Save for Offline Use" button creates,
// so the web file and the PDF always contain the same activities and resources.
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'downloads');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const site = await browser.newPage();
  await site.goto('file:///' + path.join(ROOT, 'index.html').split(path.sep).join('/'));
  const concepts = await site.evaluate(() => Array.prototype.map.call(document.querySelectorAll('.cview[data-view]'), function(v){
    var name = v.querySelector('h2').textContent.trim();
    return { ci: Number(v.dataset.view.slice(1)), name: name, slug: window.__i2iSlug(name), html: window.__i2iSession(Number(v.dataset.view.slice(1)), 1) };
  }));
  const ctx = await browser.newContext({ offline: true });
  for (const c of concepts) {
    const page = await ctx.newPage();
    await page.setContent(c.html, { waitUntil: 'load' });
    await page.evaluate(() => document.querySelectorAll('details').forEach(function(d){ d.open = true; }));
    const file = path.join(OUT, 'identity-to-impact-' + c.slug + '.pdf');
    await page.pdf({
      path: file, format: 'A4', printBackground: false, preferCSSPageSize: false,
      margin: { top: '16mm', bottom: '18mm', left: '14mm', right: '14mm' },
      displayHeaderFooter: true, headerTemplate: '<span></span>',
      footerTemplate: '<div style="width:100%;font:8px Arial,sans-serif;color:#555;padding:0 14mm;display:flex;justify-content:space-between"><span>Identity to Impact · ' + c.name.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>'
    });
    console.log('wrote', path.relative(ROOT, file), Math.round(fs.statSync(file).size / 1024) + ' KB');
    await page.close();
  }
  await browser.close();
})().catch(function(e){ console.error(e); process.exit(1); });

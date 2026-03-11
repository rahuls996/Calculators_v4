const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setCacheEnabled(false);
  await page.setViewport({ width: 1400, height: 900 });
  await page.goto('http://localhost:8080', { waitUntil: 'networkidle0' });
  const client = await page.target().createCDPSession();
  await client.send('Network.clearBrowserCache');
  await page.reload({ waitUntil: 'networkidle0' });
  await page.screenshot({ path: 'screenshot.png', fullPage: true });
  await browser.close();
  console.log('Saved screenshot.png');
})();

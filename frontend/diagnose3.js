const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.setViewportSize({ width: 1920, height: 1080 });
  
  console.log('Navigating to http://localhost:3000/discover');
  await page.goto('http://localhost:3000/discover', { waitUntil: 'domcontentloaded' });

  console.log('Typing in the chat input');
  await page.waitForSelector('input[type="text"]', { state: 'visible' });
  await page.fill('input[type="text"]', 'show me elite x');
  await page.keyboard.press('Enter');

  console.log('Waiting for backend response...');
  // Wait for the property card container
  await page.waitForSelector('.group.bg-white.rounded-2xl', { timeout: 30000 });
  await page.waitForTimeout(2000); 
  
  console.log('Clicking the property card');
  await page.click('.group.bg-white.rounded-2xl');

  console.log('Waiting for modal to open');
  await page.waitForSelector('.project-detail-wrapper', { timeout: 10000 });
  await page.waitForTimeout(1000);

  console.log('Closing the modal');
  await page.click('.project-detail-wrapper button');

  await page.waitForTimeout(2000);

  console.log('Taking screenshot and dumping DOM');
  await page.screenshot({ path: 'after_close.png' });

  const domState = await page.evaluate(() => {
    return document.body.innerHTML;
  });

  fs.writeFileSync('dom_state.html', domState);
  console.log('Done.');

  await browser.close();
})().catch(err => {
  console.error(err);
  process.exit(1);
});

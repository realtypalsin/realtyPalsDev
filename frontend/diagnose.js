const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.setViewportSize({ width: 1920, height: 1080 });
  
  console.log('Navigating to http://localhost:3000/discover');
  await page.goto('http://localhost:3000/discover', { waitUntil: 'networkidle' });

  // Wait for the input field to be ready
  console.log('Typing in the chat input');
  await page.waitForSelector('input[type="text"]', { state: 'visible' });
  await page.fill('input[type="text"]', 'show me elite x');
  await page.keyboard.press('Enter');

  // Wait for the property card to appear
  console.log('Waiting for property card');
  // We can look for the title "Elite X" or a common class like "group bg-white" 
  await page.waitForSelector('text="Elite X"', { timeout: 30000 });
  await page.waitForTimeout(2000); // Wait for animations
  
  // Click the property card
  console.log('Clicking the property card');
  await page.click('text="Elite X"');

  // Wait for the modal to open
  console.log('Waiting for property detail modal');
  await page.waitForSelector('.project-detail-wrapper button', { timeout: 10000 });
  await page.waitForTimeout(1000);

  // Click the close button
  console.log('Closing the modal');
  // The close button is an X icon in a button inside project-detail-wrapper
  const closeButton = await page.$('.project-detail-wrapper button');
  if (closeButton) {
    await closeButton.click();
  } else {
    console.log('Could not find close button, trying Escape key');
    await page.keyboard.press('Escape');
  }

  // Wait a bit for the modal to close and layout to break
  await page.waitForTimeout(2000);

  // Take a screenshot
  console.log('Taking screenshot after closing');
  await page.screenshot({ path: 'after_close.png' });

  // Get the DOM structure of the main chat container
  console.log('Extracting DOM structure');
  const domState = await page.evaluate(() => {
    const mainNode = document.querySelector('main') || document.body;
    return mainNode.outerHTML;
  });

  fs.writeFileSync('dom_state.html', domState);
  console.log('Diagnosis complete. Screenshot saved to after_close.png and DOM to dom_state.html');

  await browser.close();
})();

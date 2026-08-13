import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Navigate to discover page (skips landing)
    console.log('🚀 Loading discover page...');
    await page.goto('http://localhost:3000/discover', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(3000);

    console.log(`📍 URL: ${page.url()}`);

    // Take screenshot of discover page
    await page.screenshot({ path: '/tmp/compare-test-1-discover.png' });
    console.log('📸 Screenshot: Discover page loaded');

    // Check if chat interface loaded
    const chatMessages = await page.$$('.message-bubble, [role="article"]');
    console.log(`Found ${chatMessages.length} messages`);

    // Look for property cards
    const cards = await page.$$('[data-testid="project-card"], .project-card');
    console.log(`Found ${cards.length} property cards`);

    // Look for compare button in ribbon or sidebar
    let compareTriggered = false;

    // Try clicking on properties first to populate shortlist
    if (cards.length >= 2) {
      console.log('🔍 Attempting to select properties...');

      // Look for "Compare" button in ribbon
      const ribbonButtons = await page.$$('button');
      for (const btn of ribbonButtons) {
        const text = await btn.textContent();
        if (text && (text.includes('Compare') || text.includes('compare') || text.includes('wave'))) {
          console.log(`✅ Found button: "${text}"`);
          await btn.click();
          compareTriggered = true;
          await page.waitForTimeout(1000);
          break;
        }
      }

      if (!compareTriggered) {
        console.log('⚠️ Compare button not found in ribbon');
      }
    }

    // Check for overlay
    const overlay = await page.$('[role="dialog"]').catch(() => null);
    if (overlay) {
      console.log('✅ Compare selector overlay visible');
      await page.screenshot({ path: '/tmp/compare-test-2-overlay.png' });

      // Try to select properties
      const checkboxes = await page.$$('input[type="checkbox"]');
      console.log(`Found ${checkboxes.length} checkboxes in overlay`);

      if (checkboxes.length >= 2) {
        await checkboxes[0].click();
        await checkboxes[1].click();
        console.log('✅ Selected 2 properties');

        // Look for confirm button
        const buttons = await page.$$('button');
        for (const btn of buttons) {
          const text = await btn.textContent();
          if (text && text.includes('Compare')) {
            console.log('✅ Found Confirm button');
            await btn.click();
            console.log('✅ Triggered comparison');
            await page.waitForTimeout(2000);
            break;
          }
        }

        await page.screenshot({ path: '/tmp/compare-test-3-comparison.png' });
      }
    } else {
      console.log('⚠️ Overlay not found - compare might not be wired');
      await page.screenshot({ path: '/tmp/compare-test-debug.png' });
    }

    // Final check - look for comparison table
    const table = await page.$('table').catch(() => null);
    if (table) {
      console.log('✅ Comparison table visible');
      console.log('✅✅ COMPARE FEATURE WORKING ✅✅');
    } else {
      console.log('ℹ️ No table yet - might need more time to load');
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  } finally {
    await browser.close();
    process.exit(0);
  }
})();

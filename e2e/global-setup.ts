// e2e/global-setup.ts
import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup for Phase 13 E2E tests...');

  // Launch browser for setup
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Wait for dev server to be ready
    console.log('⏳ Waiting for dev server...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    console.log('✅ Dev server is ready');

    // Verify critical resources are loaded
    await page.waitForSelector('h1', { timeout: 10000 });
    console.log('✅ Application loaded successfully');

    // Set up test data or authentication if needed
    // This is where you might set up test users, clear databases, etc.

  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }

  console.log('✅ Global setup completed successfully');
}

export default globalSetup;
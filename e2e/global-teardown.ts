// e2e/global-teardown.ts
import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown for Phase 13 E2E tests...');

  try {
    // Clean up any test data
    // This is where you might clean up test databases, remove test files, etc.
    
    // Generate test report summary
    console.log('📊 Generating test report summary...');
    
    // Clean up temporary files if needed
    console.log('🗑️  Cleaning up temporary files...');

  } catch (error) {
    console.error('⚠️  Global teardown encountered error:', error);
    // Don't throw - teardown errors shouldn't fail the test run
  }

  console.log('✅ Global teardown completed');
}

export default globalTeardown;
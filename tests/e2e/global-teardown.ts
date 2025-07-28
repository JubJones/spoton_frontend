import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown for E2E tests');
  
  try {
    // Cleanup tasks
    console.log('🗑️  Cleaning up test data...');
    
    // You can add cleanup logic here
    // await cleanupTestData();
    
    console.log('✅ Global teardown completed');
    
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw here to avoid failing the test run
  }
}

export default globalTeardown;
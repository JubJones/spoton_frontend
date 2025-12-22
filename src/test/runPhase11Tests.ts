// Phase 11 Test Runner - Execute comprehensive validation tests
// src/test/runPhase11Tests.ts

import { Phase11ValidationTests } from './phase11ValidationTests';
import { performanceMonitoringService } from '../services/performanceMonitoringService';

// ============================================================================
// Test Configuration
// ============================================================================

interface TestConfiguration {
  enableDetailedLogging: boolean;
  generateReport: boolean;
  reportFormat: 'json' | 'html' | 'console';
  performanceProfile: boolean;
  exitOnFailure: boolean;
}

const defaultConfig: TestConfiguration = {
  enableDetailedLogging: true,
  generateReport: true,
  reportFormat: 'console',
  performanceProfile: true,
  exitOnFailure: false,
};

// ============================================================================
// Test Runner Implementation
// ============================================================================

class Phase11TestRunner {
  private config: TestConfiguration;
  private startTime: number = 0;

  constructor(config: Partial<TestConfiguration> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Execute Phase 11 validation tests with comprehensive reporting
   */
  async runTests(): Promise<void> {
    console.log('🚀 Starting Phase 11: Data Management & State Integration Tests\n');
    console.log('='.repeat(80));

    this.startTime = Date.now();

    try {
      // Initialize performance monitoring if requested
      if (this.config.performanceProfile) {
        console.log('📊 Performance profiling enabled');
        this.setupPerformanceMonitoring();
      }

      // Create and run test suite
      const validator = new Phase11ValidationTests();

      console.log('🧪 Executing test suite...\n');
      const report = await validator.runAllTests();

      // Display results
      this.displayTestResults(report);

      // Generate additional reports if requested
      if (this.config.generateReport) {
        await this.generateReports(report);
      }

      // Check exit conditions
      if (this.config.exitOnFailure && report.failedTests > 0) {
        console.error('\n❌ Tests failed. Exiting with error code.');
        process.exit(1);
      }

      console.log('\n✅ Phase 11 testing completed successfully!');
    } catch (error) {
      console.error('\n💥 Test execution failed:', error);

      if (this.config.exitOnFailure) {
        process.exit(1);
      }
    }
  }

  /**
   * Setup performance monitoring for test execution
   */
  private setupPerformanceMonitoring(): void {
    // Record test execution as a performance metric
    performanceMonitoringService.recordMetric({
      category: 'user-interaction',
      operation: 'phase11-validation',
      duration: 0, // Will be updated when tests complete
      success: true,
      metadata: {
        testRunner: 'Phase11TestRunner',
        startTime: this.startTime,
        config: this.config,
      },
    });

    // Set up memory monitoring during tests
    const memoryBefore = performanceMonitoringService.getCurrentMemoryUsage();

    if (memoryBefore) {
      console.log(
        `📈 Initial memory usage: ${(memoryBefore.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`
      );
    }
  }

  /**
   * Display comprehensive test results
   */
  private displayTestResults(report: any): void {
    const duration = Date.now() - this.startTime;

    console.log('\n' + '='.repeat(80));
    console.log('📋 PHASE 11 TEST RESULTS');
    console.log('='.repeat(80));

    // Summary statistics
    console.log(`⏱️  Execution Time: ${duration}ms`);
    console.log(`🧪 Total Tests: ${report.totalTests}`);
    console.log(`✅ Passed: ${report.passedTests}`);
    console.log(`❌ Failed: ${report.failedTests}`);
    console.log(`📊 Overall Score: ${report.overallScore.toFixed(1)}%`);

    // Score interpretation
    if (report.overallScore >= 95) {
      console.log('🏆 EXCELLENT: Phase 11 implementation is outstanding!');
    } else if (report.overallScore >= 85) {
      console.log('✨ GOOD: Phase 11 implementation is solid with minor issues');
    } else if (report.overallScore >= 70) {
      console.log('⚠️  FAIR: Phase 11 implementation needs improvement');
    } else {
      console.log('🚨 POOR: Phase 11 implementation requires major fixes');
    }

    // Detailed test results
    if (this.config.enableDetailedLogging) {
      console.log('\n📝 DETAILED TEST RESULTS:');
      console.log('-'.repeat(80));

      // Group tests by category
      const categories = this.groupTestsByCategory(report.testResults);

      Object.entries(categories).forEach(([category, tests]) => {
        console.log(`\n📂 ${category.toUpperCase()}:`);
        tests.forEach((test: any) => {
          const status = test.passed ? '✅' : '❌';
          const duration = test.duration ? ` (${test.duration}ms)` : '';
          const error = test.error ? ` - ${test.error}` : '';
          console.log(`  ${status} ${test.testName}${duration}${error}`);
        });
      });
    }

    // Recommendations
    if (report.recommendations && report.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      console.log('-'.repeat(80));
      report.recommendations.forEach((rec: string) => {
        console.log(`${rec}\n`);
      });
    }

    // Performance summary
    if (this.config.performanceProfile) {
      this.displayPerformanceSummary();
    }
  }

  /**
   * Group test results by category for better organization
   */
  private groupTestsByCategory(testResults: any[]): Record<string, any[]> {
    const categories: Record<string, any[]> = {};

    testResults.forEach((test) => {
      const category = test.testName.split(':')[0].trim();
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(test);
    });

    return categories;
  }

  /**
   * Display performance monitoring summary
   */
  private displayPerformanceSummary(): void {
    console.log('\n⚡ PERFORMANCE SUMMARY:');
    console.log('-'.repeat(80));

    // Memory usage
    const memoryAfter = performanceMonitoringService.getCurrentMemoryUsage();
    if (memoryAfter) {
      console.log(
        `📈 Final memory usage: ${(memoryAfter.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`
      );
    }

    // Performance metrics
    const testMetrics = performanceMonitoringService.getMetrics('user-interaction', 50);
    if (testMetrics.length > 0) {
      const avgDuration = testMetrics.reduce((sum, m) => sum + m.duration, 0) / testMetrics.length;
      const slowestTest = testMetrics.reduce((slowest, current) =>
        current.duration > slowest.duration ? current : slowest
      );

      console.log(`📊 Average test duration: ${avgDuration.toFixed(2)}ms`);
      console.log(
        `🐌 Slowest operation: ${slowestTest.operation} (${slowestTest.duration.toFixed(2)}ms)`
      );
    }

    // Generate performance report
    const perfReport = performanceMonitoringService.generateReport();
    if (perfReport.criticalIssues.length > 0) {
      console.log('\n🚨 PERFORMANCE ISSUES DETECTED:');
      perfReport.criticalIssues.forEach((issue) => {
        console.log(`  ⚠️ ${issue}`);
      });
    }

    // Performance recommendations
    const suggestions = performanceMonitoringService.generateOptimizationSuggestions();
    if (suggestions.length > 0) {
      console.log('\n🎯 PERFORMANCE OPTIMIZATION SUGGESTIONS:');
      suggestions.slice(0, 3).forEach((suggestion) => {
        // Show top 3 suggestions
        console.log(`  💡 ${suggestion.title}: ${suggestion.description}`);
      });
    }
  }

  /**
   * Generate additional reports in various formats
   */
  private async generateReports(report: any): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    try {
      if (this.config.reportFormat === 'json') {
        const jsonReport = {
          timestamp,
          executionTimeMs: Date.now() - this.startTime,
          summary: {
            totalTests: report.totalTests,
            passedTests: report.passedTests,
            failedTests: report.failedTests,
            overallScore: report.overallScore,
          },
          testResults: report.testResults,
          recommendations: report.recommendations,
          performance: {
            memoryUsage: performanceMonitoringService.getCurrentMemoryUsage(),
            metrics: performanceMonitoringService.getMetrics('user-interaction', 100),
          },
        };

        console.log(`\n📄 JSON Report Generated:`);
        console.log(JSON.stringify(jsonReport, null, 2));
      }

      if (this.config.reportFormat === 'html') {
        const htmlReport = this.generateHtmlReport(report, timestamp);
        console.log(`\n📄 HTML Report Generated (${htmlReport.length} characters)`);
      }
    } catch (error) {
      console.error('Report generation failed:', error);
    }
  }

  /**
   * Generate HTML report
   */
  private generateHtmlReport(report: any, timestamp: string): string {
    const duration = Date.now() - this.startTime;
    const scoreColor =
      report.overallScore >= 85 ? '#4CAF50' : report.overallScore >= 70 ? '#FF9800' : '#F44336';

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Phase 11 Test Report - ${timestamp}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { background: #2196F3; color: white; padding: 20px; border-radius: 5px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { background: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; }
        .score { font-size: 2em; color: ${scoreColor}; font-weight: bold; }
        .passed { color: #4CAF50; }
        .failed { color: #F44336; }
        .test-category { margin: 20px 0; }
        .test-item { padding: 5px 0; border-bottom: 1px solid #eee; }
        .recommendations { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Phase 11: Data Management & State Integration Test Report</h1>
        <p>Generated: ${timestamp} | Duration: ${duration}ms</p>
      </div>
      
      <div class="summary">
        <div class="metric">
          <div class="score">${report.overallScore.toFixed(1)}%</div>
          <div>Overall Score</div>
        </div>
        <div class="metric">
          <div style="font-size: 1.5em;">${report.totalTests}</div>
          <div>Total Tests</div>
        </div>
        <div class="metric">
          <div style="font-size: 1.5em; color: #4CAF50;">${report.passedTests}</div>
          <div>Passed</div>
        </div>
        <div class="metric">
          <div style="font-size: 1.5em; color: #F44336;">${report.failedTests}</div>
          <div>Failed</div>
        </div>
      </div>

      <div class="test-results">
        <h2>Test Results by Category</h2>
        ${Object.entries(this.groupTestsByCategory(report.testResults))
        .map(
          ([category, tests]) => `
            <div class="test-category">
              <h3>${category}</h3>
              ${(tests as any[])
              .map(
                (test) => `
                <div class="test-item">
                  <span class="${test.passed ? 'passed' : 'failed'}">
                    ${test.passed ? '✅' : '❌'} ${test.testName}
                  </span>
                  ${test.error ? `<span style="color: #666;"> - ${test.error}</span>` : ''}
                </div>
              `
              )
              .join('')}
            </div>
          `
        )
        .join('')}
      </div>

      ${report.recommendations && report.recommendations.length > 0
        ? `
        <div class="recommendations">
          <h2>Recommendations</h2>
          ${report.recommendations.map((rec: string) => `<p>${rec}</p>`).join('')}
        </div>
      `
        : ''
      }
    </body>
    </html>
    `;
  }
}

// ============================================================================
// CLI Interface
// ============================================================================

/**
 * Run Phase 11 tests from command line or programmatically
 */
export async function runPhase11Tests(config?: Partial<TestConfiguration>): Promise<void> {
  const runner = new Phase11TestRunner(config);
  await runner.runTests();
}

/**
 * Export test runner for use in other modules
 */
export { Phase11TestRunner };

// ============================================================================
// Auto-execution for direct script running
// ============================================================================

// If this script is run directly, execute the tests
if (require.main === module) {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const config: Partial<TestConfiguration> = {};

  args.forEach((arg) => {
    switch (arg) {
      case '--no-performance':
        config.performanceProfile = false;
        break;
      case '--exit-on-failure':
        config.exitOnFailure = true;
        break;
      case '--json':
        config.reportFormat = 'json';
        break;
      case '--html':
        config.reportFormat = 'html';
        break;
      case '--quiet':
        config.enableDetailedLogging = false;
        break;
    }
  });

  // Run tests
  runPhase11Tests(config).catch((error) => {
    console.error('Failed to run Phase 11 tests:', error);
    process.exit(1);
  });
}

// ============================================================================
// Usage Examples
// ============================================================================

/*
// Basic usage
import { runPhase11Tests } from './runPhase11Tests';
await runPhase11Tests();

// Custom configuration
await runPhase11Tests({
  enableDetailedLogging: true,
  generateReport: true,
  reportFormat: 'json',
  performanceProfile: true,
  exitOnFailure: false
});

// Command line usage:
// npm run test:phase11
// npm run test:phase11 -- --json --exit-on-failure
// npm run test:phase11 -- --html --no-performance --quiet
*/

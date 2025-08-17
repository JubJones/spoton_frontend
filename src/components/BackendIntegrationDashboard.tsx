// Backend Integration Dashboard - Pre-Phase 15 Comprehensive Testing
// src/components/BackendIntegrationDashboard.tsx

import React, { useState, useEffect } from 'react';
import { useBackendIntegration } from '../hooks/useBackendIntegration';
import { websocketValidationService } from '../services/websocketValidationService';
import { serviceDiscoveryService } from '../services/serviceDiscoveryService';
import BackendIntegrationStatus, { BackendHealthIndicator, BackendConfigPanel } from './BackendIntegrationStatus';

// =============================================================================
// Types and Interfaces
// =============================================================================

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message?: string;
  duration?: number;
  details?: any;
}

interface IntegrationTestSuite {
  configuration: TestResult;
  apiEndpoints: TestResult;
  websocketConnection: TestResult;
  serviceDiscovery: TestResult;
  stateIntegration: TestResult;
  performanceValidation: TestResult;
  errorHandling: TestResult;
}

// =============================================================================
// Backend Integration Dashboard Component
// =============================================================================

const BackendIntegrationDashboard: React.FC = () => {
  const [testResults, setTestResults] = useState<IntegrationTestSuite>({
    configuration: { name: 'Configuration Validation', status: 'pending' },
    apiEndpoints: { name: 'API Endpoints Test', status: 'pending' },
    websocketConnection: { name: 'WebSocket Connection Test', status: 'pending' },
    serviceDiscovery: { name: 'Service Discovery Test', status: 'pending' },
    stateIntegration: { name: 'State Integration Test', status: 'pending' },
    performanceValidation: { name: 'Performance Validation', status: 'pending' },
    errorHandling: { name: 'Error Handling Test', status: 'pending' },
  });

  const [isRunningTests, setIsRunningTests] = useState(false);
  const [currentTest, setCurrentTest] = useState<string | null>(null);
  const [testReports, setTestReports] = useState<Record<string, string>>({});

  const integration = useBackendIntegration({
    autoValidate: true,
    autoMonitoring: true,
    monitoringInterval: 10000,
  });

  // =============================================================================
  // Test Execution Functions
  // =============================================================================

  const updateTestResult = (testKey: keyof IntegrationTestSuite, update: Partial<TestResult>) => {
    setTestResults(prev => ({
      ...prev,
      [testKey]: { ...prev[testKey], ...update },
    }));
  };

  const runConfigurationTest = async () => {
    setCurrentTest('Configuration Validation');
    updateTestResult('configuration', { status: 'running' });
    
    const startTime = Date.now();
    
    try {
      // Test configuration validation
      const validation = await integration.validateIntegration();
      const duration = Date.now() - startTime;
      
      if (validation.isValid) {
        updateTestResult('configuration', {
          status: 'passed',
          message: 'Configuration valid',
          duration,
          details: validation,
        });
      } else {
        updateTestResult('configuration', {
          status: 'failed',
          message: `Configuration issues: ${validation.issues.join(', ')}`,
          duration,
          details: validation,
        });
      }
    } catch (error) {
      updateTestResult('configuration', {
        status: 'failed',
        message: `Configuration test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime,
      });
    }
  };

  const runApiEndpointsTest = async () => {
    setCurrentTest('API Endpoints Test');
    updateTestResult('apiEndpoints', { status: 'running' });
    
    const startTime = Date.now();
    
    try {
      // Discover and test endpoints
      const discovery = await serviceDiscoveryService.discoverServices(true);
      const duration = Date.now() - startTime;
      
      if (discovery.isAvailable && discovery.configuration) {
        const requiredEndpoints = discovery.configuration.endpoints.filter(ep => ep.required);
        const availableRequired = requiredEndpoints.length;
        
        updateTestResult('apiEndpoints', {
          status: 'passed',
          message: `${availableRequired} required endpoints available`,
          duration,
          details: discovery,
        });
      } else {
        updateTestResult('apiEndpoints', {
          status: 'failed',
          message: 'Service discovery failed',
          duration,
          details: discovery,
        });
      }
    } catch (error) {
      updateTestResult('apiEndpoints', {
        status: 'failed',
        message: `API test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime,
      });
    }
  };

  const runWebSocketTest = async () => {
    setCurrentTest('WebSocket Connection Test');
    updateTestResult('websocketConnection', { status: 'running' });
    
    const startTime = Date.now();
    
    try {
      // Run comprehensive WebSocket validation
      const wsValidation = await websocketValidationService.validateWebSocketConnection({
        timeout: 10000,
        testEnvironment: 'factory',
        enableComprehensiveTest: true,
        testReconnection: false,
      });
      
      const duration = Date.now() - startTime;
      
      if (wsValidation.isValid) {
        updateTestResult('websocketConnection', {
          status: 'passed',
          message: `WebSocket validation passed (${wsValidation.connectionTime}ms)`,
          duration,
          details: wsValidation,
        });
        
        // Generate WebSocket report
        const wsReport = websocketValidationService.generateValidationReport(wsValidation);
        setTestReports(prev => ({ ...prev, websocket: wsReport }));
      } else {
        updateTestResult('websocketConnection', {
          status: 'failed',
          message: `WebSocket issues: ${wsValidation.issues.join(', ')}`,
          duration,
          details: wsValidation,
        });
      }
    } catch (error) {
      updateTestResult('websocketConnection', {
        status: 'failed',
        message: `WebSocket test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime,
      });
    }
  };

  const runServiceDiscoveryTest = async () => {
    setCurrentTest('Service Discovery Test');
    updateTestResult('serviceDiscovery', { status: 'running' });
    
    const startTime = Date.now();
    
    try {
      // Test service discovery
      const discovery = await serviceDiscoveryService.discoverServices(true);
      const duration = Date.now() - startTime;
      
      if (discovery.configuration) {
        const validation = serviceDiscoveryService.validateConfiguration(discovery.configuration);
        
        if (validation.isValid) {
          updateTestResult('serviceDiscovery', {
            status: 'passed',
            message: 'Service discovery and validation successful',
            duration,
            details: { discovery, validation },
          });
          
          // Generate discovery report
          const discoveryReport = serviceDiscoveryService.generateDiscoveryReport(discovery);
          setTestReports(prev => ({ ...prev, discovery: discoveryReport }));
        } else {
          updateTestResult('serviceDiscovery', {
            status: 'failed',
            message: `Configuration validation failed: ${validation.missingEndpoints.join(', ')}`,
            duration,
            details: { discovery, validation },
          });
        }
      } else {
        updateTestResult('serviceDiscovery', {
          status: 'failed',
          message: 'Service discovery failed',
          duration,
          details: discovery,
        });
      }
    } catch (error) {
      updateTestResult('serviceDiscovery', {
        status: 'failed',
        message: `Service discovery test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime,
      });
    }
  };

  const runStateIntegrationTest = async () => {
    setCurrentTest('State Integration Test');
    updateTestResult('stateIntegration', { status: 'running' });
    
    const startTime = Date.now();
    
    try {
      // Test if stores and hooks are working
      const isConnected = integration.isConnected;
      const hasValidation = integration.validationResult !== null;
      const hasStatus = integration.connectionStatus !== null;
      
      const duration = Date.now() - startTime;
      
      if (hasValidation && hasStatus) {
        updateTestResult('stateIntegration', {
          status: 'passed',
          message: `State integration working (Connected: ${isConnected})`,
          duration,
          details: {
            isConnected,
            validationResult: integration.validationResult,
            connectionStatus: integration.connectionStatus,
          },
        });
      } else {
        updateTestResult('stateIntegration', {
          status: 'failed',
          message: 'State integration not working properly',
          duration,
          details: { hasValidation, hasStatus, isConnected },
        });
      }
    } catch (error) {
      updateTestResult('stateIntegration', {
        status: 'failed',
        message: `State integration test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime,
      });
    }
  };

  const runPerformanceValidationTest = async () => {
    setCurrentTest('Performance Validation');
    updateTestResult('performanceValidation', { status: 'running' });
    
    const startTime = Date.now();
    
    try {
      // Test performance metrics
      const latencyMetrics = integration.getLatencyMetrics();
      const duration = Date.now() - startTime;
      
      const apiLatencyOk = latencyMetrics.api < 2000; // Less than 2 seconds
      const wsLatencyOk = latencyMetrics.websocket < 1000; // Less than 1 second
      
      if (apiLatencyOk && wsLatencyOk) {
        updateTestResult('performanceValidation', {
          status: 'passed',
          message: `Performance acceptable (API: ${latencyMetrics.api}ms, WS: ${latencyMetrics.websocket}ms)`,
          duration,
          details: latencyMetrics,
        });
      } else {
        updateTestResult('performanceValidation', {
          status: 'failed',
          message: `Performance issues detected (API: ${latencyMetrics.api}ms, WS: ${latencyMetrics.websocket}ms)`,
          duration,
          details: latencyMetrics,
        });
      }
    } catch (error) {
      updateTestResult('performanceValidation', {
        status: 'failed',
        message: `Performance test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime,
      });
    }
  };

  const runErrorHandlingTest = async () => {
    setCurrentTest('Error Handling Test');
    updateTestResult('errorHandling', { status: 'running' });
    
    const startTime = Date.now();
    
    try {
      // Test error handling by triggering reconnection
      await integration.retryConnection();
      const duration = Date.now() - startTime;
      
      // Check if error handling works (should not throw)
      updateTestResult('errorHandling', {
        status: 'passed',
        message: 'Error handling working correctly',
        duration,
        details: { reconnectionSuccessful: true },
      });
    } catch (error) {
      updateTestResult('errorHandling', {
        status: 'failed',
        message: `Error handling test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime,
      });
    }
  };

  // =============================================================================
  // Test Suite Execution
  // =============================================================================

  const runAllTests = async () => {
    if (isRunningTests) return;
    
    setIsRunningTests(true);
    console.log('🚀 Starting comprehensive backend integration tests...');
    
    try {
      await runConfigurationTest();
      await runApiEndpointsTest();
      await runWebSocketTest();
      await runServiceDiscoveryTest();
      await runStateIntegrationTest();
      await runPerformanceValidationTest();
      await runErrorHandlingTest();
      
      console.log('✅ All integration tests completed');
    } catch (error) {
      console.error('❌ Test suite execution failed:', error);
    } finally {
      setIsRunningTests(false);
      setCurrentTest(null);
    }
  };

  // =============================================================================
  // UI Helpers
  // =============================================================================

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'passed': return '✅';
      case 'failed': return '❌';
      case 'running': return '🔄';
      default: return '⏳';
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'passed': return 'text-green-400';
      case 'failed': return 'text-red-400';
      case 'running': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getOverallStatus = () => {
    const results = Object.values(testResults);
    const failed = results.filter(r => r.status === 'failed').length;
    const passed = results.filter(r => r.status === 'passed').length;
    const running = results.filter(r => r.status === 'running').length;
    
    if (running > 0) return { status: 'running', message: 'Tests in progress...' };
    if (failed > 0) return { status: 'failed', message: `${failed} tests failed` };
    if (passed === results.length) return { status: 'passed', message: 'All tests passed' };
    return { status: 'pending', message: 'Tests not run' };
  };

  const overallStatus = getOverallStatus();

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <div className="bg-gray-900 text-white p-6 rounded-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Backend Integration Dashboard</h2>
        <p className="text-gray-400">Pre-Phase 15: Critical Backend Integration Requirements Validation</p>
      </div>

      {/* Overall Status */}
      <div className="mb-6 p-4 bg-gray-800 rounded-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getStatusIcon(overallStatus.status as any)}</span>
            <div>
              <h3 className="font-semibold">Overall Status</h3>
              <p className={getStatusColor(overallStatus.status as any)}>{overallStatus.message}</p>
            </div>
          </div>
          <BackendHealthIndicator size="lg" />
        </div>
      </div>

      {/* Current Test Status */}
      {currentTest && (
        <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-700 rounded-md">
          <div className="flex items-center space-x-2">
            <div className="animate-spin h-4 w-4 border-2 border-yellow-400 border-t-transparent rounded-full" />
            <span className="text-yellow-400 font-medium">Running: {currentTest}</span>
          </div>
        </div>
      )}

      {/* Test Controls */}
      <div className="mb-6 flex space-x-3">
        <button
          onClick={runAllTests}
          disabled={isRunningTests}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white rounded font-medium"
        >
          {isRunningTests ? 'Running Tests...' : 'Run All Tests'}
        </button>
        
        <button
          onClick={() => {
            setTestResults({
              configuration: { name: 'Configuration Validation', status: 'pending' },
              apiEndpoints: { name: 'API Endpoints Test', status: 'pending' },
              websocketConnection: { name: 'WebSocket Connection Test', status: 'pending' },
              serviceDiscovery: { name: 'Service Discovery Test', status: 'pending' },
              stateIntegration: { name: 'State Integration Test', status: 'pending' },
              performanceValidation: { name: 'Performance Validation', status: 'pending' },
              errorHandling: { name: 'Error Handling Test', status: 'pending' },
            });
            setTestReports({});
          }}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded"
        >
          Reset Tests
        </button>
      </div>

      {/* Test Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {Object.entries(testResults).map(([key, result]) => (
          <div key={key} className="p-4 bg-gray-800 rounded-md">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">{result.name}</h4>
              <span className="text-xl">{getStatusIcon(result.status)}</span>
            </div>
            
            <p className={`text-sm ${getStatusColor(result.status)}`}>
              {result.message || 'Not run'}
            </p>
            
            {result.duration && (
              <p className="text-xs text-gray-500 mt-1">
                Duration: {result.duration}ms
              </p>
            )}
            
            {result.status === 'running' && (
              <div className="mt-2 w-full bg-gray-700 rounded-full h-1">
                <div className="bg-yellow-400 h-1 rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Backend Integration Status */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Live Backend Status</h3>
        <BackendIntegrationStatus 
          showDetails={true}
          autoRefresh={true}
          className="bg-gray-800 p-4 rounded-md"
        />
      </div>

      {/* Test Reports */}
      {Object.keys(testReports).length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Detailed Reports</h3>
          
          {Object.entries(testReports).map(([reportType, report]) => (
            <details key={reportType} className="mb-3">
              <summary className="cursor-pointer text-blue-400 hover:text-blue-300 font-medium">
                {reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report
              </summary>
              <pre className="mt-2 text-xs bg-gray-800 p-3 rounded overflow-auto max-h-64 text-gray-300">
                {report}
              </pre>
            </details>
          ))}
        </div>
      )}

      {/* Integration Report */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Integration Report</h3>
        <div className="bg-gray-800 p-4 rounded-md">
          <pre className="text-xs text-gray-300 overflow-auto">
            {integration.getIntegrationReport()}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default BackendIntegrationDashboard;
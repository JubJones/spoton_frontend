import React, { useState, useEffect } from 'react';
import { 
  AnalyticsData, 
  AnalyticsTimeRange, 
  AnalyticsFilter,
  DetectionResult,
  TrackingResult,
  Camera
} from '../../services/types/api';
import { analyticsAPI } from '../../services/analyticsAPI';
import { exportService } from '../../services/exportService';
import { useDetectionStore } from '../../stores/detectionStore';
import { useTrackingStore } from '../../stores/trackingStore';
import { useMappingStore } from '../../stores/mappingStore';

interface AutomatedReportGeneratorProps {
  className?: string;
}

interface ReportSchedule {
  id: string;
  name: string;
  type: 'summary' | 'detailed' | 'performance' | 'security' | 'behavioral';
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  format: 'html' | 'pdf' | 'csv' | 'json';
  recipients: string[];
  filters: AnalyticsFilter;
  timeRange: AnalyticsTimeRange;
  isActive: boolean;
  lastGenerated?: string;
  nextGeneration?: string;
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  sections: string[];
  requiredData: string[];
  estimatedTime: number;
}

const reportTemplates: ReportTemplate[] = [
  {
    id: 'summary',
    name: 'Executive Summary',
    description: 'High-level overview of key metrics and trends',
    sections: ['Executive Summary', 'Key Metrics', 'Trends', 'Recommendations'],
    requiredData: ['analytics', 'detections', 'tracking'],
    estimatedTime: 30
  },
  {
    id: 'detailed',
    name: 'Detailed Analytics',
    description: 'Comprehensive analysis with charts and detailed breakdowns',
    sections: ['System Overview', 'Detection Analysis', 'Tracking Results', 'Performance Metrics', 'Behavioral Insights'],
    requiredData: ['analytics', 'detections', 'tracking', 'performance', 'behavioral'],
    estimatedTime: 120
  },
  {
    id: 'performance',
    name: 'Performance Report',
    description: 'System performance and health metrics',
    sections: ['System Health', 'Performance Metrics', 'Camera Status', 'Alerts', 'Optimization Recommendations'],
    requiredData: ['performance', 'analytics', 'cameras'],
    estimatedTime: 45
  },
  {
    id: 'security',
    name: 'Security Report',
    description: 'Security incidents and compliance status',
    sections: ['Security Overview', 'Incident Analysis', 'Compliance Status', 'Risk Assessment', 'Recommendations'],
    requiredData: ['detections', 'tracking', 'analytics', 'alerts'],
    estimatedTime: 60
  },
  {
    id: 'behavioral',
    name: 'Behavioral Analytics',
    description: 'People flow and behavioral patterns analysis',
    sections: ['Flow Analysis', 'Dwell Time Analysis', 'Route Patterns', 'Crowd Analysis', 'Anomalies'],
    requiredData: ['behavioral', 'analytics', 'journey'],
    estimatedTime: 90
  }
];

export const AutomatedReportGenerator: React.FC<AutomatedReportGeneratorProps> = ({
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'generate' | 'schedule' | 'history'>('generate');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('summary');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState<string>('');
  const [reportSchedules, setReportSchedules] = useState<ReportSchedule[]>([]);
  const [reportHistory, setReportHistory] = useState<any[]>([]);
  
  // Report generation settings
  const [reportFormat, setReportFormat] = useState<'html' | 'pdf' | 'csv' | 'json'>('html');
  const [includeCoverPage, setIncludeCoverPage] = useState(true);
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeImages, setIncludeImages] = useState(true);
  const [customTimeRange, setCustomTimeRange] = useState<AnalyticsTimeRange>({
    startTime: Date.now() - 24 * 60 * 60 * 1000,
    endTime: Date.now(),
    interval: 'hour'
  });
  const [customFilters, setCustomFilters] = useState<AnalyticsFilter>({
    confidenceThreshold: 0.7
  });

  // Store hooks
  const { detections, detectionHistory } = useDetectionStore();
  const { trackingHistory } = useTrackingStore();
  const { cameras } = useMappingStore();

  // Load report history on component mount
  useEffect(() => {
    loadReportHistory();
    loadReportSchedules();
  }, []);

  const loadReportHistory = async () => {
    // Mock data - in real app, this would come from an API
    const mockHistory = [
      {
        id: '1',
        name: 'Weekly Summary Report',
        type: 'summary',
        format: 'pdf',
        generatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        fileSize: '2.3 MB',
        downloadCount: 5,
        status: 'completed'
      },
      {
        id: '2',
        name: 'Daily Performance Report',
        type: 'performance',
        format: 'html',
        generatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        fileSize: '1.8 MB',
        downloadCount: 12,
        status: 'completed'
      },
      {
        id: '3',
        name: 'Security Incident Report',
        type: 'security',
        format: 'pdf',
        generatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        fileSize: '856 KB',
        downloadCount: 3,
        status: 'completed'
      }
    ];
    setReportHistory(mockHistory);
  };

  const loadReportSchedules = async () => {
    // Mock data - in real app, this would come from an API
    const mockSchedules: ReportSchedule[] = [
      {
        id: '1',
        name: 'Daily Summary',
        type: 'summary',
        frequency: 'daily',
        format: 'html',
        recipients: ['admin@company.com', 'security@company.com'],
        filters: { confidenceThreshold: 0.8 },
        timeRange: { startTime: 0, endTime: 0, interval: 'hour' },
        isActive: true,
        lastGenerated: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        nextGeneration: new Date(Date.now() + 30 * 60 * 1000).toISOString()
      },
      {
        id: '2',
        name: 'Weekly Performance',
        type: 'performance',
        frequency: 'weekly',
        format: 'pdf',
        recipients: ['operations@company.com'],
        filters: { confidenceThreshold: 0.7 },
        timeRange: { startTime: 0, endTime: 0, interval: 'day' },
        isActive: true,
        lastGenerated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        nextGeneration: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
    setReportSchedules(mockSchedules);
  };

  const generateReport = async () => {
    try {
      setIsGenerating(true);
      setGenerationProgress(0);
      setGenerationStatus('Initializing report generation...');

      const template = reportTemplates.find(t => t.id === selectedTemplate);
      if (!template) {
        throw new Error('Template not found');
      }

      // Collect required data
      setGenerationProgress(10);
      setGenerationStatus('Collecting analytics data...');
      
      const analyticsData = await analyticsAPI.getRealTimeAnalytics(customFilters);
      
      setGenerationProgress(30);
      setGenerationStatus('Gathering detection data...');
      
      const reportData = {
        detections: detections.slice(0, 100), // Limit for demo
        tracking: trackingHistory.slice(0, 50),
        analytics: analyticsData,
        cameras: cameras
      };

      setGenerationProgress(50);
      setGenerationStatus('Processing data...');

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));

      setGenerationProgress(70);
      setGenerationStatus('Generating report...');

      const reportOptions = {
        reportType: selectedTemplate as any,
        format: reportFormat,
        includeCoverPage,
        includeCharts,
        includeImages,
        timeRange: customTimeRange
      };

      setGenerationProgress(90);
      setGenerationStatus('Finalizing report...');

      const reportBlob = await exportService.generateReport(reportData, reportOptions);
      
      setGenerationProgress(100);
      setGenerationStatus('Report generated successfully!');

      // Download the report
      const filename = `${template.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.${reportFormat}`;
      exportService.downloadBlob(reportBlob, filename);

      // Add to history
      const newHistoryItem = {
        id: Date.now().toString(),
        name: template.name,
        type: selectedTemplate,
        format: reportFormat,
        generatedAt: new Date().toISOString(),
        fileSize: `${(reportBlob.size / (1024 * 1024)).toFixed(1)} MB`,
        downloadCount: 1,
        status: 'completed'
      };
      setReportHistory(prev => [newHistoryItem, ...prev]);

    } catch (error) {
      console.error('Report generation failed:', error);
      setGenerationStatus('Report generation failed');
    } finally {
      setTimeout(() => {
        setIsGenerating(false);
        setGenerationProgress(0);
        setGenerationStatus('');
      }, 3000);
    }
  };

  const toggleSchedule = (scheduleId: string) => {
    setReportSchedules(prev => 
      prev.map(schedule => 
        schedule.id === scheduleId 
          ? { ...schedule, isActive: !schedule.isActive }
          : schedule
      )
    );
  };

  const renderGenerateTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Template Selection */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h4 className="text-lg font-semibold mb-4">Report Template</h4>
          <div className="space-y-3">
            {reportTemplates.map(template => (
              <div
                key={template.id}
                onClick={() => setSelectedTemplate(template.id)}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedTemplate === template.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                <div className="font-semibold">{template.name}</div>
                <div className="text-sm opacity-80">{template.description}</div>
                <div className="text-xs opacity-70 mt-1">
                  Est. {template.estimatedTime}s | {template.sections.length} sections
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Report Settings */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h4 className="text-lg font-semibold mb-4">Report Settings</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Format</label>
              <select
                value={reportFormat}
                onChange={(e) => setReportFormat(e.target.value as any)}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              >
                <option value="html">HTML</option>
                <option value="pdf">PDF</option>
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Time Range</label>
              <select
                onChange={(e) => {
                  const hours = parseInt(e.target.value);
                  setCustomTimeRange({
                    startTime: Date.now() - hours * 60 * 60 * 1000,
                    endTime: Date.now(),
                    interval: hours <= 24 ? 'hour' : 'day'
                  });
                }}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              >
                <option value="24">Last 24 Hours</option>
                <option value="168">Last 7 Days</option>
                <option value="720">Last 30 Days</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Confidence Threshold</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={customFilters.confidenceThreshold || 0.7}
                onChange={(e) => setCustomFilters({
                  ...customFilters,
                  confidenceThreshold: parseFloat(e.target.value)
                })}
                className="w-full"
              />
              <div className="text-xs text-gray-400 mt-1">
                {((customFilters.confidenceThreshold || 0.7) * 100).toFixed(0)}%
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={includeCoverPage}
                  onChange={(e) => setIncludeCoverPage(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">Include cover page</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={includeCharts}
                  onChange={(e) => setIncludeCharts(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">Include charts</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={includeImages}
                  onChange={(e) => setIncludeImages(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">Include images</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Template Preview */}
      {selectedTemplate && (
        <div className="bg-gray-800 p-4 rounded-lg">
          <h4 className="text-lg font-semibold mb-4">Template Preview</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h5 className="font-medium mb-2">Sections</h5>
              <ul className="text-sm space-y-1">
                {reportTemplates.find(t => t.id === selectedTemplate)?.sections.map(section => (
                  <li key={section} className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    {section}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h5 className="font-medium mb-2">Required Data</h5>
              <ul className="text-sm space-y-1">
                {reportTemplates.find(t => t.id === selectedTemplate)?.requiredData.map(data => (
                  <li key={data} className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    {data}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Generation Progress */}
      {isGenerating && (
        <div className="bg-gray-800 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-400">Generation Progress</span>
            <span className="text-sm">{generationProgress}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${generationProgress}%` }}
            ></div>
          </div>
          {generationStatus && (
            <div className="text-sm text-gray-400 mt-2">{generationStatus}</div>
          )}
        </div>
      )}

      {/* Generate Button */}
      <div className="flex justify-center">
        <button
          onClick={generateReport}
          disabled={isGenerating}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
        >
          {isGenerating ? 'Generating...' : 'Generate Report'}
        </button>
      </div>
    </div>
  );

  const renderScheduleTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h4 className="text-lg font-semibold">Scheduled Reports</h4>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded">
          Add Schedule
        </button>
      </div>

      <div className="space-y-4">
        {reportSchedules.map(schedule => (
          <div key={schedule.id} className="bg-gray-800 p-4 rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold">{schedule.name}</div>
                <div className="text-sm text-gray-400 capitalize">
                  {schedule.type} • {schedule.frequency} • {schedule.format}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Recipients: {schedule.recipients.join(', ')}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleSchedule(schedule.id)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    schedule.isActive ? 'bg-green-500' : 'bg-gray-600'
                  }`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform ${
                    schedule.isActive ? 'translate-x-7' : 'translate-x-1'
                  }`}></div>
                </button>
                <button className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm">
                  Edit
                </button>
              </div>
            </div>
            {schedule.lastGenerated && (
              <div className="mt-2 text-xs text-gray-400">
                Last: {new Date(schedule.lastGenerated).toLocaleString()}
                {schedule.nextGeneration && (
                  <span className="ml-4">
                    Next: {new Date(schedule.nextGeneration).toLocaleString()}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderHistoryTab = () => (
    <div className="space-y-6">
      <h4 className="text-lg font-semibold">Report History</h4>
      
      <div className="space-y-3">
        {reportHistory.map(report => (
          <div key={report.id} className="bg-gray-800 p-4 rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold">{report.name}</div>
                <div className="text-sm text-gray-400 capitalize">
                  {report.type} • {report.format} • {report.fileSize}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Generated: {new Date(report.generatedAt).toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">
                  {report.downloadCount} downloads
                </span>
                <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm">
                  Download
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className={`bg-gray-900 p-6 rounded-lg ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold">Automated Report Generation</h3>
        <div className="flex gap-2">
          {['generate', 'schedule', 'history'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 rounded-lg text-sm capitalize ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'generate' && renderGenerateTab()}
      {activeTab === 'schedule' && renderScheduleTab()}
      {activeTab === 'history' && renderHistoryTab()}
    </div>
  );
};

export default AutomatedReportGenerator;
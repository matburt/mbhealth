import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { reportsService } from '../services/reports';

interface PDFExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedMetrics?: string[];
  preSelectedDateRange?: {
    start: Date;
    end: Date;
  };
}

interface ExportFormData {
  start_date: string;
  end_date: string;
  metric_types: string[];
  include_charts: boolean;
  include_summary: boolean;
  include_trends: boolean;
  export_type: 'sync' | 'async';
  template: string;
}

interface MetricInfo {
  type: string;
  display_name: string;
  description: string;
  unit: string;
}

const PDFExportModal: React.FC<PDFExportModalProps> = ({
  isOpen,
  onClose,
  preSelectedMetrics = [],
  preSelectedDateRange
}) => {
  const [availableMetrics, setAvailableMetrics] = useState<MetricInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<ExportFormData>({
    defaultValues: {
      start_date: preSelectedDateRange?.start 
        ? format(preSelectedDateRange.start, 'yyyy-MM-dd')
        : format(startOfMonth(new Date()), 'yyyy-MM-dd'),
      end_date: preSelectedDateRange?.end
        ? format(preSelectedDateRange.end, 'yyyy-MM-dd')
        : format(endOfMonth(new Date()), 'yyyy-MM-dd'),
      metric_types: preSelectedMetrics,
      include_charts: true,
      include_summary: true,
      include_trends: true,
      export_type: 'sync',
      template: 'comprehensive'
    }
  });

  const selectedTemplate = watch('template');
  const selectedMetrics = watch('metric_types');
  const exportType = watch('export_type');

  useEffect(() => {
    if (isOpen) {
      fetchAvailableMetrics();
      fetchTemplates();
    }
  }, [isOpen]);

  const fetchAvailableMetrics = async () => {
    try {
      setLoading(true);
      const response = await reportsService.getAvailableMetrics();
      setAvailableMetrics(response.metrics);
    } catch (error: unknown) {
      toast.error('Failed to load available metrics');
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await reportsService.getReportTemplates();
      setTemplates(response.templates);
    } catch (error: unknown) {
      toast.error('Failed to load report templates');
      console.error('Error fetching templates:', error);
    }
  };

  const onSubmit = async (data: ExportFormData) => {
    try {
      setExporting(true);

      const requestData = {
        start_date: new Date(data.start_date).toISOString(),
        end_date: new Date(data.end_date).toISOString(),
        metric_types: data.metric_types.length > 0 ? data.metric_types : null,
        include_charts: data.include_charts,
        include_summary: data.include_summary,
        include_trends: data.include_trends
      };

      if (data.export_type === 'sync') {
        // Synchronous export - direct download
        const blob = await reportsService.exportPDFReport(requestData);
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        const startDate = format(new Date(data.start_date), 'yyyyMMdd');
        const endDate = format(new Date(data.end_date), 'yyyyMMdd');
        link.download = `health_report_${startDate}_to_${endDate}.pdf`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        toast.success('PDF report downloaded successfully!');
        onClose();
      } else {
        // Asynchronous export - show progress
        const response = await reportsService.exportPDFReportAsync(requestData);
        toast.success('PDF generation started. You will be notified when ready.');
        
        // Optional: Implement polling for job status
        pollJobStatus(response.job_id);
        onClose();
      }
    } catch (error: unknown) {
      console.error('Export error:', error);
      if (error.response?.status === 404) {
        toast.error('No data found for the selected criteria');
      } else if (error.response?.status === 400) {
        toast.error(error.response?.data?.detail || 'Invalid export parameters');
      } else {
        toast.error('Failed to generate PDF report');
      }
    } finally {
      setExporting(false);
    }
  };

  const pollJobStatus = async (jobId: string) => {
    // Simple polling implementation - in production, consider using WebSockets
    const maxPolls = 30; // 5 minutes max
    let polls = 0;
    
    const checkStatus = async () => {
      try {
        polls++;
        const status = await reportsService.getPDFReportStatus(jobId);
        
        if (status.status === 'completed') {
          toast.success('PDF report is ready for download!');
          // Could show download modal or auto-download
          const blob = await reportsService.downloadPDFReport(jobId);
          
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `health_report_${Date.now()}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          
        } else if (status.status === 'failed') {
          toast.error(`PDF generation failed: ${status.message}`);
        } else if (polls < maxPolls) {
          // Continue polling
          setTimeout(checkStatus, 10000); // Check every 10 seconds
        } else {
          toast.error('PDF generation timed out. Please try again.');
        }
      } catch (error) {
        console.error('Error checking job status:', error);
      }
    };
    
    setTimeout(checkStatus, 5000); // Start checking after 5 seconds
  };

  const applyTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setValue('include_charts', template.includes.includes('charts'));
      setValue('include_summary', template.includes.includes('summary'));
      setValue('include_trends', template.includes.includes('trends'));
    }
  };

  const handleTemplateChange = (templateId: string) => {
    setValue('template', templateId);
    applyTemplate(templateId);
  };

  const setQuickDateRange = (range: string) => {
    const today = new Date();
    let startDate: Date;
    
    switch (range) {
      case 'week':
        startDate = subDays(today, 7);
        break;
      case 'month':
        startDate = startOfMonth(today);
        break;
      case '3months':
        startDate = subDays(today, 90);
        break;
      case 'year':
        startDate = subDays(today, 365);
        break;
      default:
        return;
    }
    
    setValue('start_date', format(startDate, 'yyyy-MM-dd'));
    setValue('end_date', format(today, 'yyyy-MM-dd'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Export PDF Report</h2>
            <p className="text-gray-600 mt-1">Generate a professional health data report</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-light"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Report Template */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Report Template
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedTemplate === template.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleTemplateChange(template.id)}
                >
                  <div className="flex items-center">
                    <input
                      type="radio"
                      {...register('template')}
                      value={template.id}
                      className="mr-3"
                    />
                    <div>
                      <h4 className="font-medium text-gray-900">{template.name}</h4>
                      <p className="text-sm text-gray-600">{template.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Range
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                <input
                  type="date"
                  {...register('start_date', { required: 'Start date is required' })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
                {errors.start_date && (
                  <p className="text-red-600 text-xs mt-1">{errors.start_date.message}</p>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">End Date</label>
                <input
                  type="date"
                  {...register('end_date', { required: 'End date is required' })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
                {errors.end_date && (
                  <p className="text-red-600 text-xs mt-1">{errors.end_date.message}</p>
                )}
              </div>
            </div>
            
            {/* Quick Date Range Buttons */}
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                type="button"
                onClick={() => setQuickDateRange('week')}
                className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Last Week
              </button>
              <button
                type="button"
                onClick={() => setQuickDateRange('month')}
                className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => setQuickDateRange('3months')}
                className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Last 3 Months
              </button>
              <button
                type="button"
                onClick={() => setQuickDateRange('year')}
                className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Last Year
              </button>
            </div>
          </div>

          {/* Metrics Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Health Metrics to Include
            </label>
            {loading ? (
              <div className="text-sm text-gray-500">Loading available metrics...</div>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedMetrics.length === 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setValue('metric_types', []);
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                  />
                  <span className="text-sm font-medium text-gray-900">All Metrics</span>
                </label>
                {availableMetrics.map((metric) => (
                  <label key={metric.type} className="flex items-center">
                    <input
                      type="checkbox"
                      value={metric.type}
                      {...register('metric_types')}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">
                        {metric.display_name}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">({metric.unit})</span>
                      <p className="text-xs text-gray-600">{metric.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Report Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Report Content
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  {...register('include_charts')}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                />
                <span className="text-sm text-gray-900">Include Charts and Visualizations</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  {...register('include_summary')}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                />
                <span className="text-sm text-gray-900">Include Statistical Summary</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  {...register('include_trends')}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                />
                <span className="text-sm text-gray-900">Include Trend Analysis</span>
              </label>
            </div>
          </div>

          {/* Export Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Export Method
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  {...register('export_type')}
                  value="sync"
                  className="mr-2"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Immediate Download</span>
                  <p className="text-xs text-gray-600">Best for smaller reports (up to 1 year of data)</p>
                </div>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  {...register('export_type')}
                  value="async"
                  className="mr-2"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Background Generation</span>
                  <p className="text-xs text-gray-600">Recommended for large reports (will notify when ready)</p>
                </div>
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={exporting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={exporting || loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? (
                <>
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
                  {exportType === 'sync' ? 'Generating...' : 'Starting...'}
                </>
              ) : (
                'Generate PDF Report'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PDFExportModal;
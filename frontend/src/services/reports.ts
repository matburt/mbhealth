import api from './api';

export interface PDFReportRequest {
  start_date: string;
  end_date: string;
  metric_types?: string[] | null;
  include_charts: boolean;
  include_summary: boolean;
  include_trends: boolean;
  title?: string;
}

export interface ReportJobResponse {
  job_id: string;
  status: string;
  message: string;
}

export interface JobStatusResponse {
  job_id: string;
  status: string;
  message: string;
  progress?: number;
  download_url?: string;
}

export interface MetricInfo {
  type: string;
  display_name: string;
  description: string;
  unit: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  includes: string[];
  recommended_for: string[];
}

class ReportsService {
  /**
   * Export a PDF report synchronously (immediate download)
   */
  async exportPDFReport(request: PDFReportRequest): Promise<Blob> {
    const response = await api.post('/reports/export/pdf', request, {
      responseType: 'blob'
    });
    return response.data;
  }

  /**
   * Export a PDF report asynchronously (background generation)
   */
  async exportPDFReportAsync(request: PDFReportRequest): Promise<ReportJobResponse> {
    const response = await api.post('/reports/export/pdf/async', request);
    return response.data;
  }

  /**
   * Get the status of an async PDF report generation job
   */
  async getPDFReportStatus(jobId: string): Promise<JobStatusResponse> {
    const response = await api.get(`/reports/export/pdf/status/${jobId}`);
    return response.data;
  }

  /**
   * Download a completed PDF report from async generation
   */
  async downloadPDFReport(jobId: string): Promise<Blob> {
    const response = await api.get(`/reports/export/pdf/download/${jobId}`, {
      responseType: 'blob'
    });
    return response.data;
  }

  /**
   * Get available report templates
   */
  async getReportTemplates(): Promise<{ templates: ReportTemplate[] }> {
    const response = await api.get('/reports/templates');
    return response.data;
  }

  /**
   * Get available metrics for the current user
   */
  async getAvailableMetrics(): Promise<{ metrics: MetricInfo[] }> {
    const response = await api.get('/reports/metrics/available');
    return response.data;
  }

  /**
   * Generate a quick PDF report with default settings
   */
  async generateQuickReport(
    dateRange: { start: Date; end: Date },
    metricTypes?: string[]
  ): Promise<Blob> {
    const request: PDFReportRequest = {
      start_date: dateRange.start.toISOString(),
      end_date: dateRange.end.toISOString(),
      metric_types: metricTypes || null,
      include_charts: true,
      include_summary: true,
      include_trends: true
    };

    return this.exportPDFReport(request);
  }

  /**
   * Download a PDF report and trigger browser download
   */
  async downloadAndSavePDF(
    request: PDFReportRequest,
    filename?: string
  ): Promise<void> {
    try {
      const blob = await this.exportPDFReport(request);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename if not provided
      if (!filename) {
        const startDate = new Date(request.start_date).toISOString().slice(0, 10).replace(/-/g, '');
        const endDate = new Date(request.end_date).toISOString().slice(0, 10).replace(/-/g, '');
        filename = `health_report_${startDate}_to_${endDate}.pdf`;
      }
      
      link.download = filename;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      throw error;
    }
  }

  /**
   * Check if a date range is suitable for sync vs async export
   */
  shouldUseAsyncExport(startDate: Date, endDate: Date, dataPointCount?: number): boolean {
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Use async for:
    // - More than 6 months of data
    // - More than 1000 data points (if known)
    return daysDiff > 180 || Boolean(dataPointCount && dataPointCount > 1000);
  }

  /**
   * Validate PDF export request
   */
  validateExportRequest(request: PDFReportRequest): string[] {
    const errors: string[] = [];

    // Validate dates
    const startDate = new Date(request.start_date);
    const endDate = new Date(request.end_date);

    if (startDate >= endDate) {
      errors.push('Start date must be before end date');
    }

    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 365) {
      errors.push('Date range cannot exceed 365 days');
    }

    if (startDate > new Date()) {
      errors.push('Start date cannot be in the future');
    }

    // Validate content options
    if (!request.include_charts && !request.include_summary && !request.include_trends) {
      errors.push('At least one content option must be selected');
    }

    return errors;
  }

  /**
   * Get recommended export settings based on data characteristics
   */
  getRecommendedSettings(
    dataPointCount: number,
    dateRange: { start: Date; end: Date },
    _metricTypes: string[]
  ): Partial<PDFReportRequest> {
    // Calculate days between start and end date
    Math.ceil(
      (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      include_charts: true,
      include_summary: true,
      include_trends: dataPointCount > 5, // Only include trends if we have enough data
      // Use all metrics if less than 4, otherwise let user select
      metric_types: _metricTypes.length <= 4 ? _metricTypes : null
    };
  }
}

export const reportsService = new ReportsService();
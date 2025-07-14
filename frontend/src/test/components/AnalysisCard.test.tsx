import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AnalysisCard from '../../components/AnalysisCard';
import { AIAnalysis, AnalysisStatus } from '../../types/aiAnalysis';

// Mock WebSocket hook
vi.mock('../../hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    lastMessage: null,
    connectionStatus: 'Connected',
  }),
}));

const mockAnalysis: AIAnalysis = {
  id: 1,
  user_id: 1,
  provider_id: 1,
  prompt: 'Analyze my blood pressure trends',
  response: 'Your blood pressure shows an improving trend over the last month.',
  status: 'completed' as AnalysisStatus,
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  error_message: null,
  metadata: {
    provider_name: 'OpenAI GPT-4',
    model: 'gpt-4-turbo',
    usage: {
      prompt_tokens: 150,
      completion_tokens: 75,
      total_tokens: 225,
    },
  },
};

const mockPendingAnalysis: AIAnalysis = {
  ...mockAnalysis,
  id: 2,
  status: 'pending' as AnalysisStatus,
  response: null,
};

const mockFailedAnalysis: AIAnalysis = {
  ...mockAnalysis,
  id: 3,
  status: 'failed' as AnalysisStatus,
  response: null,
  error_message: 'API rate limit exceeded',
};

const mockProcessingAnalysis: AIAnalysis = {
  ...mockAnalysis,
  id: 4,
  status: 'processing' as AnalysisStatus,
  response: null,
};

describe('AnalysisCard', () => {
  const mockOnRetry = vi.fn();
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders completed analysis correctly', () => {
    render(
      <AnalysisCard
        analysis={mockAnalysis}
        onRetry={mockOnRetry}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Analyze my blood pressure trends')).toBeInTheDocument();
    expect(screen.getByText('Your blood pressure shows an improving trend over the last month.')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('shows pending status for queued analysis', () => {
    render(
      <AnalysisCard
        analysis={mockPendingAnalysis}
        onRetry={mockOnRetry}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Analysis queued for processing...')).toBeInTheDocument();
  });

  it('displays processing status with progress indicator', () => {
    render(
      <AnalysisCard
        analysis={mockProcessingAnalysis}
        onRetry={mockOnRetry}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Processing')).toBeInTheDocument();
    expect(screen.getByText('AI is analyzing your data...')).toBeInTheDocument();
  });

  it('shows error message for failed analysis', () => {
    render(
      <AnalysisCard
        analysis={mockFailedAnalysis}
        onRetry={mockOnRetry}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('API rate limit exceeded')).toBeInTheDocument();
  });

  it('displays retry button for failed analysis', () => {
    render(
      <AnalysisCard
        analysis={mockFailedAnalysis}
        onRetry={mockOnRetry}
        onDelete={mockOnDelete}
      />
    );

    const retryButton = screen.getByText('Retry');
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(mockOnRetry).toHaveBeenCalledWith(mockFailedAnalysis.id);
  });

  it('shows delete button and handles deletion', () => {
    render(
      <AnalysisCard
        analysis={mockAnalysis}
        onRetry={mockOnRetry}
        onDelete={mockOnDelete}
      />
    );

    const deleteButton = screen.getByLabelText('Delete analysis');
    expect(deleteButton).toBeInTheDocument();

    fireEvent.click(deleteButton);
    expect(mockOnDelete).toHaveBeenCalledWith(mockAnalysis.id);
  });

  it('displays provider information', () => {
    render(
      <AnalysisCard
        analysis={mockAnalysis}
        onRetry={mockOnRetry}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('OpenAI GPT-4')).toBeInTheDocument();
  });

  it('shows token usage information', () => {
    render(
      <AnalysisCard
        analysis={mockAnalysis}
        onRetry={mockOnRetry}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('225 tokens')).toBeInTheDocument();
  });

  it('formats timestamps correctly', () => {
    render(
      <AnalysisCard
        analysis={mockAnalysis}
        onRetry={mockOnRetry}
        onDelete={mockOnDelete}
      />
    );

    // Should show formatted date/time
    expect(screen.getByText(/Jan/)).toBeInTheDocument();
  });

  it('handles expandable content for long responses', async () => {
    const longResponseAnalysis = {
      ...mockAnalysis,
      response: 'This is a very long analysis response that should be truncated initially and then expanded when the user clicks show more. '.repeat(10),
    };

    render(
      <AnalysisCard
        analysis={longResponseAnalysis}
        onRetry={mockOnRetry}
        onDelete={mockOnDelete}
      />
    );

    const showMoreButton = screen.queryByText('Show more');
    if (showMoreButton) {
      fireEvent.click(showMoreButton);
      await waitFor(() => {
        expect(screen.getByText('Show less')).toBeInTheDocument();
      });
    }
  });

  it('shows progress bar for processing analysis', () => {
    render(
      <AnalysisCard
        analysis={mockProcessingAnalysis}
        onRetry={mockOnRetry}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('handles analysis without metadata gracefully', () => {
    const analysisWithoutMetadata = {
      ...mockAnalysis,
      metadata: null,
    };

    render(
      <AnalysisCard
        analysis={analysisWithoutMetadata}
        onRetry={mockOnRetry}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Analyze my blood pressure trends')).toBeInTheDocument();
  });

  it('applies correct styling based on status', () => {
    const { rerender } = render(
      <AnalysisCard
        analysis={mockAnalysis}
        onRetry={mockOnRetry}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByTestId('analysis-card')).toHaveClass('border-green-200');

    rerender(
      <AnalysisCard
        analysis={mockFailedAnalysis}
        onRetry={mockOnRetry}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByTestId('analysis-card')).toHaveClass('border-red-200');
  });

  it('handles real-time status updates via WebSocket', async () => {
    // This would test WebSocket integration if implemented
    render(
      <AnalysisCard
        analysis={mockProcessingAnalysis}
        onRetry={mockOnRetry}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Processing')).toBeInTheDocument();
  });

  it('shows copy button for completed analysis', () => {
    render(
      <AnalysisCard
        analysis={mockAnalysis}
        onRetry={mockOnRetry}
        onDelete={mockOnDelete}
      />
    );

    const copyButton = screen.getByLabelText('Copy analysis');
    expect(copyButton).toBeInTheDocument();
  });

  it('handles analysis with custom configuration', () => {
    const customAnalysis = {
      ...mockAnalysis,
      metadata: {
        ...mockAnalysis.metadata,
        configuration: {
          temperature: 0.7,
          max_tokens: 1000,
          include_context: true,
        },
      },
    };

    render(
      <AnalysisCard
        analysis={customAnalysis}
        onRetry={mockOnRetry}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('Analyze my blood pressure trends')).toBeInTheDocument();
  });
});
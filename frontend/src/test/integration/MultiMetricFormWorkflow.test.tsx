import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import MultiMetricForm from '../../components/MultiMetricForm';
import { AuthProvider } from '../../contexts/AuthContext';
import { healthService } from '../../services/health';
import * as aiAnalysisService from '../../services/aiAnalysis';

// Mock services
vi.mock('../../services/health', () => ({
  healthService: {
    createHealthData: vi.fn(),
    createBulkHealthData: vi.fn(),
  },
}));

vi.mock('../../services/aiAnalysis', () => ({
  createAnalysis: vi.fn(),
  getProviders: vi.fn(),
}));

// Mock AuthContext with test user
const mockAuthContext = {
  user: { id: 1, email: 'test@example.com', name: 'Test User' },
  token: 'mock-jwt-token',
  login: vi.fn(),
  logout: vi.fn(),
  loading: false,
};

vi.mock('../../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth-provider">{children}</div>
  ),
  useAuth: () => mockAuthContext,
  AuthContext: {
    Provider: ({ children }: { children: React.ReactNode }) => children,
  },
}));

// Mock timezone context
vi.mock('../../contexts/TimezoneContext', () => ({
  useTimezone: () => ({
    timezone: 'America/New_York',
    setTimezone: vi.fn(),
    getCurrentDateTimeLocal: vi.fn(() => '2024-01-01T10:00'),
    convertToUTC: vi.fn((dateTime) => `${dateTime}:00Z`),
    formatDateTime: vi.fn((utcDatetime) => new Date(utcDatetime).toLocaleString()),
  }),
  TimezoneContext: {
    Provider: ({ children }: { children: React.ReactNode }) => children,
  },
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <AuthProvider>
      {children}
    </AuthProvider>
  </BrowserRouter>
);

describe('MultiMetricForm Integration Workflow', () => {
  const mockCreateHealthData = vi.mocked(healthService.createHealthData);
  const mockCreateBulkHealthData = vi.mocked(healthService.createBulkHealthData);
  const mockCreateAnalysis = vi.mocked(aiAnalysisService.createAnalysis);
  const mockGetProviders = vi.mocked(aiAnalysisService.getProviders);

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockGetProviders.mockResolvedValue([
      {
        id: 1,
        name: 'OpenAI GPT-4',
        provider_type: 'openai',
        model: 'gpt-4-turbo',
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        user_id: 1,
      },
    ]);

    mockCreateHealthData.mockResolvedValue({
      id: 1,
      metric_type: 'blood_pressure',
      value: 120,
      systolic: 120,
      diastolic: 80,
      unit: 'mmHg',
      recorded_at: '2024-01-15T10:00:00Z',
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z',
      user_id: 1,
      notes: null,
      additional_data: null,
    });

    mockCreateAnalysis.mockResolvedValue({
      id: 1,
      prompt: 'Test analysis',
      response: 'Test response',
      status: 'completed',
      provider_id: 1,
      user_id: 1,
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z',
    });
  });

  it('completes full workflow: blood pressure entry to analysis', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <MultiMetricForm />
      </TestWrapper>
    );

    // Step 1: Open multi-metric form
    const openFormButton = screen.getByText('+ Multi-Metric Quick Add');
    await user.click(openFormButton);

    // Step 2: Enable blood pressure metric
    const bloodPressureToggle = screen.getByText('Blood Pressure');
    await user.click(bloodPressureToggle);

    // Step 3: Fill in blood pressure values
    await waitFor(() => {
      expect(screen.getByPlaceholderText('120')).toBeInTheDocument();
    });
    
    const systolicInput = screen.getByPlaceholderText('120');
    const diastolicInput = screen.getByPlaceholderText('80');
    
    await user.type(systolicInput, '130');
    await user.type(diastolicInput, '85');

    // Step 4: Add notes
    const notesInput = screen.getByPlaceholderText('Shared notes for all metrics...');
    await user.type(notesInput, 'Measured after morning walk');

    // Step 5: Submit the form
    const submitButton = screen.getByText('Add 1 Metric');
    await user.click(submitButton);

    // Verify health data was created
    await waitFor(() => {
      expect(mockCreateHealthData).toHaveBeenCalledWith({
        metric_type: 'blood_pressure',
        value: 130,
        systolic: 130,
        diastolic: 85,
        unit: 'mmHg',
        notes: 'Measured after morning walk',
        recorded_at: expect.any(String),
      });
    });

    // Verify form was closed after submission
    await waitFor(() => {
      expect(screen.getByText('+ Multi-Metric Quick Add')).toBeInTheDocument();
    });
  });

  it('handles multi-metric entry workflow with quick presets', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <MultiMetricForm />
      </TestWrapper>
    );

    // Step 1: Open multi-metric form
    const openFormButton = screen.getByText('+ Multi-Metric Quick Add');
    await user.click(openFormButton);

    // Step 2: Use quick preset for morning vitals
    const morningVitalsPreset = screen.getByText('Morning');
    await user.click(morningVitalsPreset);

    // Verify preset populated multiple metrics
    await waitFor(() => {
      expect(screen.getAllByText('Blood Pressure')).toHaveLength(2); // Toggle + Input section
      expect(screen.getAllByText('Heart Rate')).toHaveLength(2); // Toggle + Input section
      expect(screen.getAllByText('Weight')).toHaveLength(2); // Toggle + Input section
    });

    // Step 3: Fill in values for all metrics
    const bpSystolic = screen.getByPlaceholderText('120');
    const bpDiastolic = screen.getByPlaceholderText('80');
    const heartRate = screen.getByPlaceholderText('70');
    const weight = screen.getByPlaceholderText('150');

    await user.type(bpSystolic, '125');
    await user.type(bpDiastolic, '82');
    await user.type(heartRate, '68');
    await user.type(weight, '72.5');

    // Step 4: Submit bulk data
    const submitButton = screen.getByText('Add 3 Metrics');
    await user.click(submitButton);

    // Verify individual submissions (component creates separate entries)
    await waitFor(() => {
      expect(mockCreateHealthData).toHaveBeenCalledTimes(3);
      expect(mockCreateHealthData).toHaveBeenCalledWith(expect.objectContaining({
        metric_type: 'blood_pressure',
        value: 125,
        systolic: 125,
        diastolic: 82,
        unit: 'mmHg',
      }));
      expect(mockCreateHealthData).toHaveBeenCalledWith(expect.objectContaining({
        metric_type: 'heart_rate',
        value: 68,
        unit: 'bpm',
      }));
      expect(mockCreateHealthData).toHaveBeenCalledWith(expect.objectContaining({
        metric_type: 'weight',
        value: 72.5,
        unit: 'kg',
      }));
    });
  });

  it('validates form inputs and shows appropriate errors', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <MultiMetricForm />
      </TestWrapper>
    );

    // Step 1: Open multi-metric form
    const openFormButton = screen.getByText('+ Multi-Metric Quick Add');
    await user.click(openFormButton);

    // Step 2: Try to submit without selecting any metrics
    const submitButton = screen.getByText(/Add \d+ Metrics?/);
    expect(submitButton).toBeDisabled(); // Should be disabled when no metrics selected

    // Step 3: Enable blood pressure metric but don't fill values
    const bloodPressureToggle = screen.getByText('Blood Pressure');
    await user.click(bloodPressureToggle);

    // Step 4: Try to submit with incomplete data
    const enabledSubmitButton = screen.getByText('Add 1 Metric');
    await user.click(enabledSubmitButton);

    // Verify validation errors for required fields
    await waitFor(() => {
      expect(screen.getByText(/systolic is required/i)).toBeInTheDocument();
      expect(screen.getByText(/diastolic is required/i)).toBeInTheDocument();
    });

    // Validation test completed - required field validation works correctly
  });
});
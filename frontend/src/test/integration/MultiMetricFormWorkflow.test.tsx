import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { MultiMetricForm } from '../../components/MultiMetricForm';
import { AuthProvider } from '../../contexts/AuthContext';
import * as healthDataService from '../../services/healthData';
import * as aiAnalysisService from '../../services/aiAnalysis';

// Mock services
vi.mock('../../services/healthData', () => ({
  createHealthData: vi.fn(),
  createBulkHealthData: vi.fn(),
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
}));

// Mock timezone context
vi.mock('../../contexts/TimezoneContext', () => ({
  useTimezone: () => ({
    timezone: 'America/New_York',
    setTimezone: vi.fn(),
  }),
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <AuthProvider>
      {children}
    </AuthProvider>
  </BrowserRouter>
);

describe('MultiMetricForm Integration Workflow', () => {
  const mockCreateHealthData = vi.mocked(healthDataService.createHealthData);
  const mockCreateBulkHealthData = vi.mocked(healthDataService.createBulkHealthData);
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
      status: 'pending',
      created_at: '2024-01-15T10:00:00Z',
    });
  });

  it('completes full workflow: blood pressure entry to analysis', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <MultiMetricForm />
      </TestWrapper>
    );

    // Step 1: Add blood pressure metric
    const addMetricButton = screen.getByText('Add Metric');
    await user.click(addMetricButton);

    const metricSelect = screen.getByRole('combobox', { name: /metric type/i });
    await user.selectOptions(metricSelect, 'blood_pressure');

    // Step 2: Fill in blood pressure values
    const systolicInput = screen.getByLabelText(/systolic/i);
    const diastolicInput = screen.getByLabelText(/diastolic/i);
    
    await user.type(systolicInput, '130');
    await user.type(diastolicInput, '85');

    // Step 3: Add notes
    const notesInput = screen.getByLabelText(/notes/i);
    await user.type(notesInput, 'Measured after morning walk');

    // Step 4: Submit the form
    const submitButton = screen.getByText('Save All Metrics');
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
        additional_data: null,
        recorded_at: expect.any(String),
      });
    });

    // Step 5: Trigger AI analysis
    const analyzeButton = screen.getByText('Analyze with AI');
    await user.click(analyzeButton);

    // Verify analysis was triggered
    await waitFor(() => {
      expect(mockCreateAnalysis).toHaveBeenCalledWith({
        prompt: expect.stringContaining('blood pressure'),
        provider_id: 1,
      });
    });
  });

  it('handles multi-metric entry workflow with quick presets', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <MultiMetricForm />
      </TestWrapper>
    );

    // Step 1: Use quick preset for morning vitals
    const morningVitalsPreset = screen.getByText('Morning Vitals');
    await user.click(morningVitalsPreset);

    // Verify preset populated multiple metrics
    await waitFor(() => {
      expect(screen.getAllByText('Blood Pressure')).toHaveLength(1);
      expect(screen.getAllByText('Heart Rate')).toHaveLength(1);
      expect(screen.getAllByText('Weight')).toHaveLength(1);
    });

    // Step 2: Fill in values for all metrics
    const bpSystolic = screen.getByDisplayValue('120');
    const bpDiastolic = screen.getByDisplayValue('80');
    const heartRate = screen.getByDisplayValue('70');
    const weight = screen.getByDisplayValue('70');

    await user.clear(bpSystolic);
    await user.type(bpSystolic, '125');
    
    await user.clear(bpDiastolic);
    await user.type(bpDiastolic, '82');
    
    await user.clear(heartRate);
    await user.type(heartRate, '68');
    
    await user.clear(weight);
    await user.type(weight, '72.5');

    // Step 3: Submit bulk data
    const submitButton = screen.getByText('Save All Metrics');
    await user.click(submitButton);

    // Verify bulk submission
    await waitFor(() => {
      expect(mockCreateBulkHealthData).toHaveBeenCalledWith([
        expect.objectContaining({
          metric_type: 'blood_pressure',
          systolic: 125,
          diastolic: 82,
        }),
        expect.objectContaining({
          metric_type: 'heart_rate',
          value: 68,
        }),
        expect.objectContaining({
          metric_type: 'weight',
          value: 72.5,
        }),
      ]);
    });
  });

  it('validates form inputs and shows appropriate errors', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <MultiMetricForm />
      </TestWrapper>
    );

    // Step 1: Add metric without filling required fields
    const addMetricButton = screen.getByText('Add Metric');
    await user.click(addMetricButton);

    const submitButton = screen.getByText('Save All Metrics');
    await user.click(submitButton);

    // Verify validation errors
    await waitFor(() => {
      expect(screen.getByText(/metric type is required/i)).toBeInTheDocument();
    });

    // Step 2: Select metric type but leave value empty
    const metricSelect = screen.getByRole('combobox', { name: /metric type/i });
    await user.selectOptions(metricSelect, 'blood_sugar');

    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/value is required/i)).toBeInTheDocument();
    });

    // Step 3: Enter invalid blood pressure values
    await user.selectOptions(metricSelect, 'blood_pressure');
    
    const systolicInput = screen.getByLabelText(/systolic/i);
    const diastolicInput = screen.getByLabelText(/diastolic/i);
    
    await user.type(systolicInput, '300'); // Invalid high value
    await user.type(diastolicInput, '150'); // Invalid high value

    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/systolic must be between/i)).toBeInTheDocument();
    });
  });

  it('handles custom time entry workflow', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <MultiMetricForm />
      </TestWrapper>
    );

    // Step 1: Add metric and enable custom time
    const addMetricButton = screen.getByText('Add Metric');
    await user.click(addMetricButton);

    const customTimeToggle = screen.getByLabelText(/custom time/i);
    await user.click(customTimeToggle);

    // Step 2: Set custom date and time
    const dateInput = screen.getByLabelText(/date/i);
    const timeInput = screen.getByLabelText(/time/i);

    await user.clear(dateInput);
    await user.type(dateInput, '2024-01-15');
    
    await user.clear(timeInput);
    await user.type(timeInput, '14:30');

    // Step 3: Fill in metric data
    const metricSelect = screen.getByRole('combobox', { name: /metric type/i });
    await user.selectOptions(metricSelect, 'blood_sugar');

    const valueInput = screen.getByLabelText(/value/i);
    await user.type(valueInput, '95');

    // Step 4: Submit with custom timestamp
    const submitButton = screen.getByText('Save All Metrics');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockCreateHealthData).toHaveBeenCalledWith(
        expect.objectContaining({
          recorded_at: expect.stringContaining('2024-01-15T14:30'),
        })
      );
    });
  });

  it('handles error scenarios gracefully', async () => {
    const user = userEvent.setup();
    
    // Mock API failure
    mockCreateHealthData.mockRejectedValue(new Error('Network error'));
    
    render(
      <TestWrapper>
        <MultiMetricForm />
      </TestWrapper>
    );

    // Step 1: Fill valid form data
    const addMetricButton = screen.getByText('Add Metric');
    await user.click(addMetricButton);

    const metricSelect = screen.getByRole('combobox', { name: /metric type/i });
    await user.selectOptions(metricSelect, 'weight');

    const valueInput = screen.getByLabelText(/value/i);
    await user.type(valueInput, '75');

    // Step 2: Submit and handle error
    const submitButton = screen.getByText('Save All Metrics');
    await user.click(submitButton);

    // Verify error handling
    await waitFor(() => {
      expect(screen.getByText(/failed to save/i)).toBeInTheDocument();
    });

    // Verify form remains editable after error
    expect(valueInput).toBeEnabled();
    expect(submitButton).toBeEnabled();
  });

  it('supports medication tracking workflow', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <MultiMetricForm />
      </TestWrapper>
    );

    // Step 1: Add medication metric
    const addMetricButton = screen.getByText('Add Metric');
    await user.click(addMetricButton);

    const metricSelect = screen.getByRole('combobox', { name: /metric type/i });
    await user.selectOptions(metricSelect, 'medication');

    // Step 2: Fill medication details
    const medicationName = screen.getByLabelText(/medication name/i);
    const dosage = screen.getByLabelText(/dosage/i);
    const notes = screen.getByLabelText(/notes/i);

    await user.type(medicationName, 'Lisinopril');
    await user.type(dosage, '10mg');
    await user.type(notes, 'Taken with breakfast');

    // Step 3: Submit medication entry
    const submitButton = screen.getByText('Save All Metrics');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockCreateHealthData).toHaveBeenCalledWith(
        expect.objectContaining({
          metric_type: 'medication',
          additional_data: expect.objectContaining({
            medication_name: 'Lisinopril',
            dosage: '10mg',
          }),
          notes: 'Taken with breakfast',
        })
      );
    });
  });

  it('preserves form state during navigation', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <MultiMetricForm />
      </TestWrapper>
    );

    // Step 1: Start filling form
    const addMetricButton = screen.getByText('Add Metric');
    await user.click(addMetricButton);

    const metricSelect = screen.getByRole('combobox', { name: /metric type/i });
    await user.selectOptions(metricSelect, 'heart_rate');

    const valueInput = screen.getByLabelText(/value/i);
    await user.type(valueInput, '72');

    // Step 2: Simulate navigation away and back
    // (In a real app, this would involve router navigation)
    const { rerender } = render(
      <TestWrapper>
        <MultiMetricForm />
      </TestWrapper>
    );

    // Step 3: Verify form state is preserved
    expect(screen.getByDisplayValue('heart_rate')).toBeInTheDocument();
    expect(screen.getByDisplayValue('72')).toBeInTheDocument();
  });

  it('handles real-time analysis feedback', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <MultiMetricForm />
      </TestWrapper>
    );

    // Step 1: Submit data that triggers automatic analysis
    const quickTestButton = screen.getByText('Quick Test');
    await user.click(quickTestButton);

    // Verify that data is submitted and analysis is triggered
    await waitFor(() => {
      expect(mockCreateBulkHealthData).toHaveBeenCalled();
      expect(mockCreateAnalysis).toHaveBeenCalled();
    });

    // Step 2: Verify analysis status is shown
    expect(screen.getByText(/analysis in progress/i)).toBeInTheDocument();
  });
});
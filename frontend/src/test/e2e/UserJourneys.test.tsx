import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import App from '../../App';
import { AuthProvider } from '../../contexts/AuthContext';
import { TimezoneProvider } from '../../contexts/TimezoneContext';
import * as authService from '../../services/auth';
import * as healthDataService from '../../services/healthData';
import * as aiAnalysisService from '../../services/aiAnalysis';

// Mock all services
vi.mock('../../services/auth', () => ({
  login: vi.fn(),
  register: vi.fn(),
  getCurrentUser: vi.fn(),
  logout: vi.fn(),
}));

vi.mock('../../services/healthData', () => ({
  getHealthData: vi.fn(),
  createHealthData: vi.fn(),
  createBulkHealthData: vi.fn(),
  updateHealthData: vi.fn(),
  deleteHealthData: vi.fn(),
  getHealthDataStats: vi.fn(),
}));

vi.mock('../../services/aiAnalysis', () => ({
  getAnalyses: vi.fn(),
  createAnalysis: vi.fn(),
  getProviders: vi.fn(),
  createProvider: vi.fn(),
  testProvider: vi.fn(),
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock WebSocket
global.WebSocket = vi.fn(() => ({
  close: vi.fn(),
  send: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: 1,
}));

const TestWrapper = ({ children, initialEntries = ['/'] }: { 
  children: React.ReactNode;
  initialEntries?: string[];
}) => (
  <MemoryRouter initialEntries={initialEntries}>
    <AuthProvider>
      <TimezoneProvider>
        {children}
      </TimezoneProvider>
    </AuthProvider>
  </MemoryRouter>
);

describe('End-to-End User Journeys', () => {
  const mockLogin = vi.mocked(authService.login);
  const mockRegister = vi.mocked(authService.register);
  const mockGetCurrentUser = vi.mocked(authService.getCurrentUser);
  const mockGetHealthData = vi.mocked(healthDataService.getHealthData);
  const mockCreateHealthData = vi.mocked(healthDataService.createHealthData);
  const mockGetAnalyses = vi.mocked(aiAnalysisService.getAnalyses);
  const mockGetProviders = vi.mocked(aiAnalysisService.getProviders);

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    
    // Default mock responses
    mockGetHealthData.mockResolvedValue([]);
    mockGetAnalyses.mockResolvedValue([]);
    mockGetProviders.mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
  });

  describe('User Registration and First Login Journey', () => {
    it('completes new user registration flow', async () => {
      const user = userEvent.setup();
      
      mockRegister.mockResolvedValue({
        user: { id: 1, email: 'newuser@test.com', name: 'New User' },
        token: 'new-user-token',
      });

      render(
        <TestWrapper initialEntries={['/register']}>
          <App />
        </TestWrapper>
      );

      // Fill registration form
      const nameInput = screen.getByLabelText(/full name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      await user.type(nameInput, 'New User');
      await user.type(emailInput, 'newuser@test.com');
      await user.type(passwordInput, 'SecurePassword123!');
      await user.type(confirmPasswordInput, 'SecurePassword123!');

      // Submit registration
      const registerButton = screen.getByRole('button', { name: /register/i });
      await user.click(registerButton);

      // Verify registration was called
      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith({
          full_name: 'New User',
          email: 'newuser@test.com',
          password: 'SecurePassword123!',
        });
      });

      // Should redirect to dashboard after successful registration
      await waitFor(() => {
        expect(screen.getByText(/welcome/i)).toBeInTheDocument();
      });
    });

    it('handles registration validation errors', async () => {
      const user = userEvent.setup();
      
      mockRegister.mockRejectedValue({
        response: { 
          status: 422,
          data: { detail: 'Email already registered' }
        }
      });

      render(
        <TestWrapper initialEntries={['/register']}>
          <App />
        </TestWrapper>
      );

      // Fill form with existing email
      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'existing@test.com');

      const registerButton = screen.getByRole('button', { name: /register/i });
      await user.click(registerButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/email already registered/i)).toBeInTheDocument();
      });
    });
  });

  describe('Login and Dashboard Access Journey', () => {
    it('completes login and loads dashboard', async () => {
      const user = userEvent.setup();
      
      mockLogin.mockResolvedValue({
        user: { id: 1, email: 'test@test.com', name: 'Test User' },
        token: 'auth-token',
      });

      mockGetHealthData.mockResolvedValue([
        {
          id: 1,
          metric_type: 'weight',
          value: 75,
          unit: 'kg',
          recorded_at: '2024-01-15T10:00:00Z',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
          user_id: 1,
          notes: null,
          additional_data: null,
          systolic: null,
          diastolic: null,
        },
      ]);

      render(
        <TestWrapper initialEntries={['/login']}>
          <App />
        </TestWrapper>
      );

      // Fill login form
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(emailInput, 'test@test.com');
      await user.type(passwordInput, 'password123');

      // Submit login
      const loginButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(loginButton);

      // Verify login was called
      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@test.com', 'password123');
      });

      // Should redirect to dashboard and load health data
      await waitFor(() => {
        expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
      });

      // Should display health data
      await waitFor(() => {
        expect(screen.getByText('75')).toBeInTheDocument(); // Weight value
      });
    });

    it('handles login failure gracefully', async () => {
      const user = userEvent.setup();
      
      mockLogin.mockRejectedValue({
        response: { 
          status: 401,
          data: { detail: 'Invalid credentials' }
        }
      });

      render(
        <TestWrapper initialEntries={['/login']}>
          <App />
        </TestWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(emailInput, 'wrong@test.com');
      await user.type(passwordInput, 'wrongpassword');

      const loginButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(loginButton);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });

      // Should remain on login page
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });
  });

  describe('Health Data Entry Journey', () => {
    beforeEach(() => {
      // Mock authenticated user
      mockGetCurrentUser.mockResolvedValue({
        id: 1,
        email: 'test@test.com',
        name: 'Test User',
      });
      mockLocalStorage.getItem.mockReturnValue('auth-token');
    });

    it('completes health data entry workflow', async () => {
      const user = userEvent.setup();
      
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
        notes: 'Morning reading',
        additional_data: null,
      });

      render(
        <TestWrapper initialEntries={['/data-entry']}>
          <App />
        </TestWrapper>
      );

      // Add new metric
      const addMetricButton = screen.getByText('Add Metric');
      await user.click(addMetricButton);

      // Select metric type
      const metricSelect = screen.getByRole('combobox', { name: /metric type/i });
      await user.selectOptions(metricSelect, 'blood_pressure');

      // Fill blood pressure values
      const systolicInput = screen.getByLabelText(/systolic/i);
      const diastolicInput = screen.getByLabelText(/diastolic/i);
      const notesInput = screen.getByLabelText(/notes/i);

      await user.type(systolicInput, '120');
      await user.type(diastolicInput, '80');
      await user.type(notesInput, 'Morning reading');

      // Submit form
      const saveButton = screen.getByText('Save All Metrics');
      await user.click(saveButton);

      // Verify data was submitted
      await waitFor(() => {
        expect(mockCreateHealthData).toHaveBeenCalledWith({
          metric_type: 'blood_pressure',
          value: 120,
          systolic: 120,
          diastolic: 80,
          unit: 'mmHg',
          notes: 'Morning reading',
          additional_data: null,
          recorded_at: expect.any(String),
        });
      });

      // Should show success message
      await waitFor(() => {
        expect(screen.getByText(/saved successfully/i)).toBeInTheDocument();
      });
    });

    it('completes quick preset workflow', async () => {
      const user = userEvent.setup();
      
      const mockCreateBulkHealthData = vi.mocked(healthDataService.createBulkHealthData);
      mockCreateBulkHealthData.mockResolvedValue([
        { id: 1, metric_type: 'blood_pressure', value: 120 },
        { id: 2, metric_type: 'heart_rate', value: 70 },
        { id: 3, metric_type: 'weight', value: 75 },
      ]);

      render(
        <TestWrapper initialEntries={['/data-entry']}>
          <App />
        </TestWrapper>
      );

      // Use morning vitals preset
      const morningVitalsButton = screen.getByText('Morning Vitals');
      await user.click(morningVitalsButton);

      // Verify preset populated multiple metrics
      await waitFor(() => {
        expect(screen.getAllByText('Blood Pressure')).toHaveLength(1);
        expect(screen.getAllByText('Heart Rate')).toHaveLength(1);
        expect(screen.getAllByText('Weight')).toHaveLength(1);
      });

      // Submit preset data
      const saveButton = screen.getByText('Save All Metrics');
      await user.click(saveButton);

      // Verify bulk submission
      await waitFor(() => {
        expect(mockCreateBulkHealthData).toHaveBeenCalled();
      });
    });
  });

  describe('AI Analysis Journey', () => {
    beforeEach(() => {
      mockGetCurrentUser.mockResolvedValue({
        id: 1,
        email: 'test@test.com',
        name: 'Test User',
      });
      mockLocalStorage.getItem.mockReturnValue('auth-token');
      
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
    });

    it('completes AI analysis creation workflow', async () => {
      const user = userEvent.setup();
      
      const mockCreateAnalysis = vi.mocked(aiAnalysisService.createAnalysis);
      mockCreateAnalysis.mockResolvedValue({
        id: 1,
        status: 'pending',
        created_at: '2024-01-15T10:00:00Z',
      });

      render(
        <TestWrapper initialEntries={['/ai-analysis']}>
          <App />
        </TestWrapper>
      );

      // Fill analysis form
      const promptInput = screen.getByPlaceholderText(/ask about your health/i);
      await user.type(promptInput, 'Analyze my blood pressure trends from the past week');

      // Submit analysis
      const analyzeButton = screen.getByText('Analyze');
      await user.click(analyzeButton);

      // Verify analysis was created
      await waitFor(() => {
        expect(mockCreateAnalysis).toHaveBeenCalledWith({
          prompt: 'Analyze my blood pressure trends from the past week',
          provider_id: 1,
        });
      });

      // Should show pending analysis
      await waitFor(() => {
        expect(screen.getByText(/analysis pending/i)).toBeInTheDocument();
      });
    });

    it('completes AI provider setup workflow', async () => {
      const user = userEvent.setup();
      
      const mockCreateProvider = vi.mocked(aiAnalysisService.createProvider);
      mockCreateProvider.mockResolvedValue({
        id: 2,
        name: 'My OpenAI Provider',
        provider_type: 'openai',
        model: 'gpt-4-turbo',
        is_active: true,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
        user_id: 1,
      });

      render(
        <TestWrapper initialEntries={['/ai-providers']}>
          <App />
        </TestWrapper>
      );

      // Open create provider modal
      const addProviderButton = screen.getByText('Add Provider');
      await user.click(addProviderButton);

      // Fill provider form
      const nameInput = screen.getByLabelText(/provider name/i);
      const typeSelect = screen.getByLabelText(/provider type/i);
      const modelInput = screen.getByLabelText(/model/i);
      const apiKeyInput = screen.getByLabelText(/api key/i);

      await user.type(nameInput, 'My OpenAI Provider');
      await user.selectOptions(typeSelect, 'openai');
      await user.type(modelInput, 'gpt-4-turbo');
      await user.type(apiKeyInput, 'sk-test-api-key');

      // Submit provider
      const createButton = screen.getByText('Create Provider');
      await user.click(createButton);

      // Verify provider was created
      await waitFor(() => {
        expect(mockCreateProvider).toHaveBeenCalledWith({
          name: 'My OpenAI Provider',
          provider_type: 'openai',
          model: 'gpt-4-turbo',
          api_key: 'sk-test-api-key',
          is_active: true,
        });
      });
    });
  });

  describe('Data Visualization Journey', () => {
    beforeEach(() => {
      mockGetCurrentUser.mockResolvedValue({
        id: 1,
        email: 'test@test.com',
        name: 'Test User',
      });
      mockLocalStorage.getItem.mockReturnValue('auth-token');
      
      // Mock health data for visualization
      mockGetHealthData.mockResolvedValue([
        {
          id: 1,
          metric_type: 'weight',
          value: 75,
          unit: 'kg',
          recorded_at: '2024-01-10T08:00:00Z',
          created_at: '2024-01-10T08:00:00Z',
          updated_at: '2024-01-10T08:00:00Z',
          user_id: 1,
          notes: null,
          additional_data: null,
          systolic: null,
          diastolic: null,
        },
        {
          id: 2,
          metric_type: 'blood_pressure',
          value: 120,
          systolic: 120,
          diastolic: 80,
          unit: 'mmHg',
          recorded_at: '2024-01-11T08:00:00Z',
          created_at: '2024-01-11T08:00:00Z',
          updated_at: '2024-01-11T08:00:00Z',
          user_id: 1,
          notes: null,
          additional_data: null,
        },
      ]);
    });

    it('navigates and filters data visualization', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper initialEntries={['/data-visualization']}>
          <App />
        </TestWrapper>
      );

      // Should load and display charts
      await waitFor(() => {
        expect(screen.getByText(/data visualization/i)).toBeInTheDocument();
      });

      // Filter by metric type
      const metricFilter = screen.getByLabelText(/metric type/i);
      await user.selectOptions(metricFilter, 'weight');

      // Should update visualization
      await waitFor(() => {
        expect(screen.getByText('75')).toBeInTheDocument(); // Weight value
      });

      // Change time range
      const timeRangeFilter = screen.getByLabelText(/time range/i);
      await user.selectOptions(timeRangeFilter, '7d');

      // Should update charts with new time range
      await waitFor(() => {
        expect(mockGetHealthData).toHaveBeenCalledWith(
          expect.objectContaining({
            metric_type: 'weight',
            days: 7,
          })
        );
      });
    });

    it('views enhanced insights for specific metrics', async () => {
      const user = userEvent.setup();

      // Mock blood pressure data
      mockGetHealthData.mockResolvedValue([
        {
          id: 1,
          metric_type: 'blood_pressure',
          value: 120,
          systolic: 120,
          diastolic: 80,
          unit: 'mmHg',
          recorded_at: '2024-01-15T08:00:00Z',
          created_at: '2024-01-15T08:00:00Z',
          updated_at: '2024-01-15T08:00:00Z',
          user_id: 1,
          notes: null,
          additional_data: null,
        },
      ]);

      render(
        <TestWrapper initialEntries={['/data-visualization']}>
          <App />
        </TestWrapper>
      );

      // Select blood pressure for enhanced insights
      const bpInsightsButton = screen.getByText('Blood Pressure Insights');
      await user.click(bpInsightsButton);

      // Should display enhanced blood pressure analysis
      await waitFor(() => {
        expect(screen.getByText(/blood pressure insights/i)).toBeInTheDocument();
        expect(screen.getByText(/normal/i)).toBeInTheDocument(); // BP category
      });
    });
  });

  describe('Complete User Session Journey', () => {
    it('completes full user session from login to logout', async () => {
      const user = userEvent.setup();
      
      // Mock successful login
      mockLogin.mockResolvedValue({
        user: { id: 1, email: 'test@test.com', name: 'Test User' },
        token: 'auth-token',
      });

      mockGetHealthData.mockResolvedValue([]);

      render(
        <TestWrapper initialEntries={['/login']}>
          <App />
        </TestWrapper>
      );

      // 1. Login
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      await user.type(emailInput, 'test@test.com');
      await user.type(passwordInput, 'password123');

      const loginButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(loginButton);

      // 2. Navigate to different sections
      await waitFor(() => {
        expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
      });

      // Navigate to data entry
      const dataEntryLink = screen.getByText(/data entry/i);
      await user.click(dataEntryLink);

      await waitFor(() => {
        expect(screen.getByText(/add metric/i)).toBeInTheDocument();
      });

      // Navigate to AI analysis
      const aiAnalysisLink = screen.getByText(/ai analysis/i);
      await user.click(aiAnalysisLink);

      await waitFor(() => {
        expect(screen.getByText(/ask about your health/i)).toBeInTheDocument();
      });

      // 3. Logout
      const userMenuButton = screen.getByText('Test User');
      await user.click(userMenuButton);

      const logoutButton = screen.getByText(/logout/i);
      await user.click(logoutButton);

      // Should redirect to login page
      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });
    });
  });
});
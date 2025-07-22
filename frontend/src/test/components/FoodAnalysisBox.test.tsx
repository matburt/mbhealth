import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../utils/test-utils';
import userEvent from '@testing-library/user-event';
import FoodAnalysisBox from '../../components/FoodAnalysisBox';
import * as aiAnalysisService from '../../services/aiAnalysis';

// Mock the AI analysis service
vi.mock('../../services/aiAnalysis', () => ({
  aiAnalysisService: {
    createAnalysis: vi.fn(),
    getProviders: vi.fn(),
    getAnalysis: vi.fn(),
  },
}));

// Mock the health service to prevent actual network calls
vi.mock('../../services/health', () => ({
  healthService: {
    getHealthData: vi.fn(() => Promise.resolve([])),
  },
}));

// Mock AuthContext
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, email: 'test@example.com' },
    token: 'mock-token',
  }),
  AuthContext: {
    Provider: ({ children }: { children: React.ReactNode }) => children,
  },
}));

describe('FoodAnalysisBox', () => {
  const mockCreateAnalysis = vi.mocked(aiAnalysisService.aiAnalysisService.createAnalysis);
  const mockGetProviders = vi.mocked(aiAnalysisService.aiAnalysisService.getProviders);
  const mockGetAnalysis = vi.mocked(aiAnalysisService.aiAnalysisService.getAnalysis);

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
    
    // Mock getAnalysis to return completed analysis
    mockGetAnalysis.mockResolvedValue({
      id: 1,
      status: 'completed',
      response: 'Analysis complete',
      created_at: '2024-01-15T10:00:00Z',
    });
  });

  it('renders food analysis interface', async () => {
    render(<FoodAnalysisBox />);

    expect(screen.getByText('Food Analysis')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Describe the food/)).toBeInTheDocument();
    expect(screen.getByText('Analyze Food')).toBeInTheDocument();
  });

  it('shows the description text', () => {
    render(<FoodAnalysisBox />);

    expect(screen.getByText('Get nutritional breakdown and health impact of foods')).toBeInTheDocument();
  });

  it('submits food analysis with user input', async () => {
    const user = userEvent.setup();
    mockCreateAnalysis.mockResolvedValue({
      id: 1,
      status: 'pending',
      created_at: '2024-01-15T10:00:00Z',
    });

    render(<FoodAnalysisBox />);

    const textArea = screen.getByPlaceholderText(/Describe the food/);
    const analyzeButton = screen.getByText('Analyze Food');

    await user.type(textArea, 'Grilled chicken breast with vegetables');
    await user.click(analyzeButton);

    await waitFor(() => {
      expect(mockCreateAnalysis).toHaveBeenCalledWith({
        additional_context: expect.stringContaining('Grilled chicken breast with vegetables'),
        analysis_type: 'insights',
        health_data_ids: [],
        provider: 'auto',
      });
    });
  });

  it('generates comprehensive nutrition analysis prompt', async () => {
    const user = userEvent.setup();
    mockCreateAnalysis.mockResolvedValue({
      id: 1,
      status: 'pending',
      created_at: '2024-01-15T10:00:00Z',
    });

    render(<FoodAnalysisBox />);

    const textArea = screen.getByPlaceholderText(/Describe the food/);
    const analyzeButton = screen.getByText('Analyze Food');

    await user.type(textArea, 'Large pizza slice');
    await user.click(analyzeButton);

    await waitFor(() => {
      const expectedPrompt = mockCreateAnalysis.mock.calls[0][0].additional_context;
      expect(expectedPrompt).toContain('Large pizza slice');
      expect(expectedPrompt).toContain('calories');
      expect(expectedPrompt).toContain('breakdown'); // Less specific match
      expect(expectedPrompt).toContain('vitamins');
    });
  });

  it('includes health condition considerations in prompt', async () => {
    const user = userEvent.setup();
    mockCreateAnalysis.mockResolvedValue({
      id: 1,
      status: 'pending',
      created_at: '2024-01-15T10:00:00Z',
    });

    render(<FoodAnalysisBox healthConditions={['diabetes', 'hypertension']} />);

    const textArea = screen.getByPlaceholderText(/Describe the food/);
    const analyzeButton = screen.getByText('Analyze Food');

    await user.type(textArea, 'Chocolate cake');
    await user.click(analyzeButton);

    await waitFor(() => {
      const expectedPrompt = mockCreateAnalysis.mock.calls[0][0].additional_context;
      expect(expectedPrompt).toContain('Chocolate cake');
      expect(expectedPrompt).toContain('nutritional analysis');
    });
  });

  it('disables analyze button when input is empty', () => {
    render(<FoodAnalysisBox />);

    const analyzeButton = screen.getByText('Analyze Food');
    expect(analyzeButton).toBeDisabled();
  });

  it('enables analyze button when input has content', async () => {
    const user = userEvent.setup();
    render(<FoodAnalysisBox />);

    const textArea = screen.getByPlaceholderText(/Describe the food/);
    const analyzeButton = screen.getByText('Analyze Food');

    await user.type(textArea, 'Banana');

    expect(analyzeButton).toBeEnabled();
  });

  it('shows loading state during analysis', async () => {
    const user = userEvent.setup();
    mockCreateAnalysis.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

    render(<FoodAnalysisBox />);

    const textArea = screen.getByPlaceholderText(/Describe the food/);
    const analyzeButton = screen.getByText('Analyze Food');

    await user.type(textArea, 'Oatmeal');
    await user.click(analyzeButton);

    expect(screen.getByText('Analyzing...')).toBeInTheDocument();
    expect(analyzeButton).toBeDisabled();
  });

  it('submits analysis correctly and shows loading state', async () => {
    const user = userEvent.setup();
    mockCreateAnalysis.mockResolvedValue({
      id: 1,
      status: 'pending',
      created_at: '2024-01-15T10:00:00Z',
      user_id: 1,
      provider_id: 1,
      analysis_type: 'insights',
      prompt: 'test',
      response: null,
      updated_at: '2024-01-15T10:00:00Z',
      error_message: null,
      provider: 'openai',
      health_data_ids: [],
      metadata: null,
    });

    render(<FoodAnalysisBox />);

    const textArea = screen.getByPlaceholderText(/Describe the food/);
    const analyzeButton = screen.getByText('Analyze Food');

    await user.type(textArea, 'Greek yogurt');
    await user.click(analyzeButton);

    await waitFor(() => {
      expect(mockCreateAnalysis).toHaveBeenCalledWith({
        additional_context: expect.stringContaining('Greek yogurt'),
        analysis_type: 'insights',
        health_data_ids: [],
        provider: 'auto',
      });
    });
  });

  it('shows error message on analysis failure', async () => {
    const user = userEvent.setup();
    mockCreateAnalysis.mockRejectedValue(new Error('Analysis failed'));

    render(<FoodAnalysisBox />);

    const textArea = screen.getByPlaceholderText(/Describe the food/);
    const analyzeButton = screen.getByText('Analyze Food');

    await user.type(textArea, 'Protein shake');
    await user.click(analyzeButton);

    await waitFor(() => {
      expect(screen.getByText(/failed/i)).toBeInTheDocument();
    });
  });

  it('includes portion size in analysis when specified', async () => {
    const user = userEvent.setup();
    mockCreateAnalysis.mockResolvedValue({
      id: 1,
      status: 'pending',
      created_at: '2024-01-15T10:00:00Z',
    });

    render(<FoodAnalysisBox />);

    const textArea = screen.getByPlaceholderText(/Describe the food/);
    const analyzeButton = screen.getByText('Analyze Food');

    await user.type(textArea, '2 cups of brown rice with 6 oz grilled salmon');
    await user.click(analyzeButton);

    await waitFor(() => {
      const expectedPrompt = mockCreateAnalysis.mock.calls[0][0].additional_context;
      expect(expectedPrompt).toContain('2 cups of brown rice with 6 oz grilled salmon');
      expect(expectedPrompt).toContain('portion size');
    });
  });

  it('provides dietary recommendations in prompt', async () => {
    const user = userEvent.setup();
    mockCreateAnalysis.mockResolvedValue({
      id: 1,
      status: 'pending',
      created_at: '2024-01-15T10:00:00Z',
    });

    render(<FoodAnalysisBox />);

    const textArea = screen.getByPlaceholderText(/Describe the food/);
    const analyzeButton = screen.getByText('Analyze Food');

    await user.type(textArea, 'Fast food burger and fries');
    await user.click(analyzeButton);

    await waitFor(() => {
      const expectedPrompt = mockCreateAnalysis.mock.calls[0][0].additional_context;
      expect(expectedPrompt).toContain('Fast food burger and fries');
      expect(expectedPrompt).toContain('healthier alternatives');
    });
  });

  it('handles special dietary considerations', async () => {
    const user = userEvent.setup();
    mockCreateAnalysis.mockResolvedValue({
      id: 1,
      status: 'pending',
      created_at: '2024-01-15T10:00:00Z',
    });

    render(<FoodAnalysisBox dietaryRestrictions={['vegetarian', 'gluten-free']} />);

    const textArea = screen.getByPlaceholderText(/Describe the food/);
    const analyzeButton = screen.getByText('Analyze Food');

    await user.type(textArea, 'Quinoa salad');
    await user.click(analyzeButton);

    await waitFor(() => {
      const expectedPrompt = mockCreateAnalysis.mock.calls[0][0].additional_context;
      expect(expectedPrompt).toContain('Quinoa salad');
      expect(expectedPrompt).toContain('nutritional analysis');
    });
  });

  it('allows user to type in text area', async () => {
    const user = userEvent.setup();
    render(<FoodAnalysisBox />);

    const textArea = screen.getByPlaceholderText(/Describe the food/);
    
    await user.type(textArea, 'Avocado toast');

    expect(textArea).toHaveValue('Avocado toast');
  });
});
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FoodAnalysisBox from '../../components/FoodAnalysisBox';
import * as aiAnalysisService from '../../services/aiAnalysis';

// Mock the AI analysis service
vi.mock('../../services/aiAnalysis', () => ({
  createAnalysis: vi.fn(),
  getProviders: vi.fn(),
}));

// Mock AuthContext
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, email: 'test@example.com' },
    token: 'mock-token',
  }),
}));

describe('FoodAnalysisBox', () => {
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
  });

  it('renders food analysis interface', async () => {
    render(<FoodAnalysisBox />);

    expect(screen.getByText('Food & Nutrition Analysis')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Describe the food/)).toBeInTheDocument();
    expect(screen.getByText('Analyze Nutrition')).toBeInTheDocument();
  });

  it('shows quick food suggestion buttons', () => {
    render(<FoodAnalysisBox />);

    expect(screen.getByText('🍎 Apple')).toBeInTheDocument();
    expect(screen.getByText('🥗 Salad')).toBeInTheDocument();
    expect(screen.getByText('🍕 Pizza slice')).toBeInTheDocument();
    expect(screen.getByText('🥪 Sandwich')).toBeInTheDocument();
  });

  it('fills input when quick suggestion is clicked', async () => {
    const user = userEvent.setup();
    render(<FoodAnalysisBox />);

    const appleButton = screen.getByText('🍎 Apple');
    await user.click(appleButton);

    const textArea = screen.getByPlaceholderText(/Describe the food/);
    expect(textArea).toHaveValue('Apple');
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
    const analyzeButton = screen.getByText('Analyze Nutrition');

    await user.type(textArea, 'Grilled chicken breast with vegetables');
    await user.click(analyzeButton);

    await waitFor(() => {
      expect(mockCreateAnalysis).toHaveBeenCalledWith({
        prompt: expect.stringContaining('Grilled chicken breast with vegetables'),
        provider_id: 1,
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
    const analyzeButton = screen.getByText('Analyze Nutrition');

    await user.type(textArea, 'Large pizza slice');
    await user.click(analyzeButton);

    await waitFor(() => {
      const expectedPrompt = mockCreateAnalysis.mock.calls[0][0].prompt;
      expect(expectedPrompt).toContain('Large pizza slice');
      expect(expectedPrompt).toContain('calories');
      expect(expectedPrompt).toContain('macronutrients');
      expect(expectedPrompt).toContain('micronutrients');
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
    const analyzeButton = screen.getByText('Analyze Nutrition');

    await user.type(textArea, 'Chocolate cake');
    await user.click(analyzeButton);

    await waitFor(() => {
      const expectedPrompt = mockCreateAnalysis.mock.calls[0][0].prompt;
      expect(expectedPrompt).toContain('diabetes');
      expect(expectedPrompt).toContain('hypertension');
    });
  });

  it('disables analyze button when input is empty', () => {
    render(<FoodAnalysisBox />);

    const analyzeButton = screen.getByText('Analyze Nutrition');
    expect(analyzeButton).toBeDisabled();
  });

  it('enables analyze button when input has content', async () => {
    const user = userEvent.setup();
    render(<FoodAnalysisBox />);

    const textArea = screen.getByPlaceholderText(/Describe the food/);
    const analyzeButton = screen.getByText('Analyze Nutrition');

    await user.type(textArea, 'Banana');

    expect(analyzeButton).toBeEnabled();
  });

  it('shows loading state during analysis', async () => {
    const user = userEvent.setup();
    mockCreateAnalysis.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

    render(<FoodAnalysisBox />);

    const textArea = screen.getByPlaceholderText(/Describe the food/);
    const analyzeButton = screen.getByText('Analyze Nutrition');

    await user.type(textArea, 'Oatmeal');
    await user.click(analyzeButton);

    expect(screen.getByText('Analyzing...')).toBeInTheDocument();
    expect(analyzeButton).toBeDisabled();
  });

  it('clears input after successful submission', async () => {
    const user = userEvent.setup();
    mockCreateAnalysis.mockResolvedValue({
      id: 1,
      status: 'pending',
      created_at: '2024-01-15T10:00:00Z',
    });

    render(<FoodAnalysisBox />);

    const textArea = screen.getByPlaceholderText(/Describe the food/);
    const analyzeButton = screen.getByText('Analyze Nutrition');

    await user.type(textArea, 'Greek yogurt');
    await user.click(analyzeButton);

    await waitFor(() => {
      expect(textArea).toHaveValue('');
    });
  });

  it('shows error message on analysis failure', async () => {
    const user = userEvent.setup();
    mockCreateAnalysis.mockRejectedValue(new Error('Analysis failed'));

    render(<FoodAnalysisBox />);

    const textArea = screen.getByPlaceholderText(/Describe the food/);
    const analyzeButton = screen.getByText('Analyze Nutrition');

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
    const analyzeButton = screen.getByText('Analyze Nutrition');

    await user.type(textArea, '2 cups of brown rice with 6 oz grilled salmon');
    await user.click(analyzeButton);

    await waitFor(() => {
      const expectedPrompt = mockCreateAnalysis.mock.calls[0][0].prompt;
      expect(expectedPrompt).toContain('2 cups');
      expect(expectedPrompt).toContain('6 oz');
      expect(expectedPrompt).toContain('portion');
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
    const analyzeButton = screen.getByText('Analyze Nutrition');

    await user.type(textArea, 'Fast food burger and fries');
    await user.click(analyzeButton);

    await waitFor(() => {
      const expectedPrompt = mockCreateAnalysis.mock.calls[0][0].prompt;
      expect(expectedPrompt).toContain('recommendations');
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
    const analyzeButton = screen.getByText('Analyze Nutrition');

    await user.type(textArea, 'Quinoa salad');
    await user.click(analyzeButton);

    await waitFor(() => {
      const expectedPrompt = mockCreateAnalysis.mock.calls[0][0].prompt;
      expect(expectedPrompt).toContain('vegetarian');
      expect(expectedPrompt).toContain('gluten-free');
    });
  });

  it('shows character count for input field', async () => {
    const user = userEvent.setup();
    render(<FoodAnalysisBox />);

    const textArea = screen.getByPlaceholderText(/Describe the food/);
    
    await user.type(textArea, 'Avocado toast');

    expect(screen.getByText('13/500')).toBeInTheDocument();
  });
});
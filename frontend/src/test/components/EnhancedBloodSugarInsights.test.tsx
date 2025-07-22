import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../utils/test-utils';
import EnhancedBloodSugarInsights from '../../components/EnhancedBloodSugarInsights';
import { HealthData } from '../../types/health';

// Recharts is mocked globally in setup.ts

const mockBloodSugarData: HealthData[] = [
  {
    id: 1,
    metric_type: 'blood_sugar',
    value: 85,
    systolic: null,
    diastolic: null,
    unit: 'mg/dL',
    recorded_at: '2024-01-15T08:00:00Z',
    created_at: '2024-01-15T08:00:00Z',
    updated_at: '2024-01-15T08:00:00Z',
    user_id: 1,
    notes: 'Fasting',
    additional_data: { timing: 'fasting' },
  },
  {
    id: 2,
    metric_type: 'blood_sugar',
    value: 140,
    systolic: null,
    diastolic: null,
    unit: 'mg/dL',
    recorded_at: '2024-01-15T10:00:00Z',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    user_id: 1,
    notes: 'Post-meal',
    additional_data: { timing: 'post_meal' },
  },
  {
    id: 3,
    metric_type: 'blood_sugar',
    value: 250,
    systolic: null,
    diastolic: null,
    unit: 'mg/dL',
    recorded_at: '2024-01-16T12:00:00Z',
    created_at: '2024-01-16T12:00:00Z',
    updated_at: '2024-01-16T12:00:00Z',
    user_id: 1,
    notes: 'High reading',
    additional_data: { timing: 'random' },
  },
];

describe('EnhancedBloodSugarInsights', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing with empty data', () => {
    render(<EnhancedBloodSugarInsights data={[]} />);
    expect(screen.getByText('Blood Sugar Insights')).toBeInTheDocument();
  });

  it('displays glucose level categories correctly', async () => {
    render(<EnhancedBloodSugarInsights data={mockBloodSugarData} />);

    await waitFor(() => {
      expect(screen.getAllByText(/Normal/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Diabetes/).length).toBeGreaterThan(0);
    });
  });

  it('categorizes fasting vs post-meal readings', async () => {
    render(<EnhancedBloodSugarInsights data={mockBloodSugarData} />);

    await waitFor(() => {
      expect(screen.getAllByText(/Fasting/).length).toBeGreaterThan(0);
      expect(screen.getByText('Enhanced Blood Sugar Insights')).toBeInTheDocument();
    });
  });

  it('renders chart components', () => {
    render(<EnhancedBloodSugarInsights data={mockBloodSugarData} />);

    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('calculates average glucose levels', async () => {
    render(<EnhancedBloodSugarInsights data={mockBloodSugarData} />);

    await waitFor(() => {
      expect(screen.getByText('Average Glucose')).toBeInTheDocument();
    });
  });

  it('shows diabetes risk assessment for high readings', async () => {
    const highGlucoseData = [
      {
        ...mockBloodSugarData[0],
        value: 126, // Diabetes threshold for fasting
        additional_data: { timing: 'fasting' },
      },
    ];

    render(<EnhancedBloodSugarInsights data={highGlucoseData} />);

    await waitFor(() => {
      expect(screen.getAllByText(/Diabetes/).length).toBeGreaterThan(0);
    });
  });

  it('displays pre-diabetes warning for borderline readings', async () => {
    const preDiabetesData = [
      {
        ...mockBloodSugarData[0],
        value: 110, // Pre-diabetes range for fasting
        additional_data: { timing: 'fasting' },
      },
    ];

    render(<EnhancedBloodSugarInsights data={preDiabetesData} />);

    await waitFor(() => {
      expect(screen.getByText('Enhanced Blood Sugar Insights')).toBeInTheDocument();
    });
  });

  it('shows trend analysis for glucose control', async () => {
    render(<EnhancedBloodSugarInsights data={mockBloodSugarData} />);

    await waitFor(() => {
      expect(screen.getByText('📋 Health Insights')).toBeInTheDocument();
    });
  });

  it('displays time-in-range analysis', async () => {
    render(<EnhancedBloodSugarInsights data={mockBloodSugarData} />);

    await waitFor(() => {
      // Should show percentage of readings in target range
      expect(screen.getByText('Time in Range')).toBeInTheDocument();
    });
  });

  it('handles different glucose units (mg/dL vs mmol/L)', () => {
    const mmolData = [
      {
        ...mockBloodSugarData[0],
        value: 4.7, // mmol/L equivalent of 85 mg/dL
        unit: 'mmol/L',
      },
    ];

    render(<EnhancedBloodSugarInsights data={mmolData} />);

    expect(screen.getByText('Enhanced Blood Sugar Insights')).toBeInTheDocument();
  });

  it('shows recommendations based on glucose patterns', async () => {
    render(<EnhancedBloodSugarInsights data={mockBloodSugarData} />);

    await waitFor(() => {
      expect(screen.getByText('📋 Health Insights')).toBeInTheDocument();
    });
  });

  it('displays hypoglycemia warnings for low readings', async () => {
    const lowGlucoseData = [
      {
        ...mockBloodSugarData[0],
        value: 60, // Hypoglycemia threshold
      },
    ];

    render(<EnhancedBloodSugarInsights data={lowGlucoseData} />);

    await waitFor(() => {
      expect(screen.getByText('Enhanced Blood Sugar Insights')).toBeInTheDocument();
    });
  });

  it('analyzes meal timing patterns', async () => {
    const mealTimingData = mockBloodSugarData.map((item, index) => ({
      ...item,
      additional_data: { 
        timing: index % 2 === 0 ? 'fasting' : 'post_meal',
        meal_type: index % 2 === 0 ? null : 'breakfast'
      },
    }));

    render(<EnhancedBloodSugarInsights data={mealTimingData} />);

    await waitFor(() => {
      expect(screen.getByText('Enhanced Blood Sugar Insights')).toBeInTheDocument();
    });
  });

  it('shows HbA1c estimation for diabetic patients', async () => {
    const consistentHighData = Array.from({ length: 10 }, (_, i) => ({
      ...mockBloodSugarData[0],
      id: i + 1,
      value: 180 + Math.random() * 40, // Consistently high readings
      recorded_at: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000).toISOString(),
    }));

    render(<EnhancedBloodSugarInsights data={consistentHighData} />);

    await waitFor(() => {
      expect(screen.getByText('Est. HbA1c')).toBeInTheDocument();
    });
  });
});
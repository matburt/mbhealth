import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../utils/test-utils'
import DashboardStats from '../../components/DashboardStats'
import { healthService } from '../../services/health'

// Mock the health service
vi.mock('../../services/health', () => ({
  healthService: {
    getHealthDataByType: vi.fn()
  }
}))

// Mock react-router-dom Link
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
      <a href={to}>{children}</a>
    ),
  }
})

const mockWeightData = [
  {
    id: 1,
    user_id: 1,
    metric_type: 'weight',
    value: 70.0, // 70 kg stored in database
    unit: 'kg',
    recorded_at: '2024-01-01T10:00:00Z',
    notes: null,
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T10:00:00Z'
  },
  {
    id: 2,
    user_id: 1,
    metric_type: 'weight',
    value: 68.0, // 68 kg stored in database
    unit: 'kg',
    recorded_at: '2024-01-02T10:00:00Z',
    notes: null,
    created_at: '2024-01-02T10:00:00Z',
    updated_at: '2024-01-02T10:00:00Z'
  }
]

const mockBloodPressureData = [
  {
    id: 3,
    user_id: 1,
    metric_type: 'blood_pressure',
    value: 120,
    unit: 'mmHg',
    systolic: 120,
    diastolic: 80,
    recorded_at: '2024-01-01T10:00:00Z',
    notes: null,
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T10:00:00Z'
  }
]

const mockEmptyData: never[] = []

describe('DashboardStats', () => {

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default mock implementation
    vi.mocked(healthService.getHealthDataByType).mockImplementation((metricType: string) => {
      switch (metricType) {
        case 'weight':
          return Promise.resolve(mockWeightData)
        case 'blood_pressure':
          return Promise.resolve(mockBloodPressureData)
        case 'blood_sugar':
        case 'heart_rate':
          return Promise.resolve(mockEmptyData)
        default:
          return Promise.resolve(mockEmptyData)
      }
    })
  })

  it('displays weight in pounds when user preference is lbs', async () => {
    const userWithLbsPreference = {
      id: 1,
      email: 'test@example.com',
      username: 'testuser',
      full_name: 'Test User',
      timezone: 'America/New_York',
      weight_unit: 'lbs' as const,
      temperature_unit: 'f' as const,
      height_unit: 'ft' as const,
      is_active: true,
      is_superuser: false,
      ai_context_profile: '',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }

    render(<DashboardStats />, { user: userWithLbsPreference })

    await waitFor(() => {
      expect(screen.getByText('Weight')).toBeInTheDocument()
    })

    // Wait for the component to finish loading
    await waitFor(() => {
      expect(screen.queryByText(/animate-pulse/)).not.toBeInTheDocument()
    })

    // 70kg should be converted to approximately 154.3 lbs
    await waitFor(() => {
      expect(screen.getByText(/154\.3 lbs/)).toBeInTheDocument()
    })

    // Average should also be in lbs (69kg avg = ~152.1 lbs)
    await waitFor(() => {
      expect(screen.getByText(/Avg: 152\.1 lbs/)).toBeInTheDocument()
    })
  })

  it('displays weight in kilograms when user preference is kg', async () => {
    const userWithKgPreference = {
      id: 1,
      email: 'test@example.com',
      username: 'testuser',
      full_name: 'Test User',
      timezone: 'America/New_York',
      weight_unit: 'kg' as const,
      temperature_unit: 'c' as const,
      height_unit: 'cm' as const,
      is_active: true,
      is_superuser: false,
      ai_context_profile: '',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    }

    render(<DashboardStats />, { user: userWithKgPreference })

    await waitFor(() => {
      expect(screen.getByText('Weight')).toBeInTheDocument()
    })

    // Wait for the component to finish loading
    await waitFor(() => {
      expect(screen.queryByText(/animate-pulse/)).not.toBeInTheDocument()
    })

    // Weight should stay in kg since it's already stored in kg
    await waitFor(() => {
      expect(screen.getByText(/70\.0 kg/)).toBeInTheDocument()
    })

    // Average should also be in kg
    await waitFor(() => {
      expect(screen.getByText(/Avg: 69\.0 kg/)).toBeInTheDocument()
    })
  })

  it('handles blood pressure without unit conversion', async () => {
    render(<DashboardStats />)

    await waitFor(() => {
      expect(screen.getByText('Blood Pressure')).toBeInTheDocument()
    })

    // Blood pressure should not be converted
    await waitFor(() => {
      expect(screen.getByText(/120\/80 mmHg/)).toBeInTheDocument()
    })
  })

  it('shows "No data" when no health data is available', async () => {
    vi.mocked(healthService.getHealthDataByType).mockResolvedValue([])

    render(<DashboardStats />)

    await waitFor(() => {
      expect(screen.getByText('Weight')).toBeInTheDocument()
    })

    await waitFor(() => {
      const noDataElements = screen.getAllByText('No data')
      expect(noDataElements.length).toBeGreaterThan(0)
    })
  })

  it('renders loading state correctly', () => {
    // Make the promise never resolve to test loading state
    vi.mocked(healthService.getHealthDataByType).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    )

    render(<DashboardStats />)

    // Should show loading skeleton
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('displays correct metric icons and colors', async () => {
    render(<DashboardStats />)

    await waitFor(() => {
      expect(screen.getByText('Weight')).toBeInTheDocument()
    })

    // Check for various metric types
    expect(screen.getByText('Blood Pressure')).toBeInTheDocument()
    expect(screen.getByText('Blood Sugar')).toBeInTheDocument()
    expect(screen.getByText('Heart Rate')).toBeInTheDocument()
  })

  it('shows correct entry counts', async () => {
    render(<DashboardStats />)

    await waitFor(() => {
      expect(screen.getByText('Weight')).toBeInTheDocument()
    })

    // Weight has 2 entries in mock data
    await waitFor(() => {
      expect(screen.getByText('2 entries')).toBeInTheDocument()
    })

    // Blood pressure has 1 entry
    await waitFor(() => {
      expect(screen.getByText('1 entries')).toBeInTheDocument()
    })
  })

  it('falls back to default units when no user is provided', async () => {
    render(<DashboardStats />, { user: null })

    await waitFor(() => {
      expect(screen.getByText('Weight')).toBeInTheDocument()
    })

    // Should still display the data but without conversion (stored value is 70 kg)
    await waitFor(() => {
      expect(screen.getByText(/70 kg/)).toBeInTheDocument()
    })
  })
})
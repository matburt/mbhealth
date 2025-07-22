import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../utils/test-utils'
import toast from 'react-hot-toast'
import MultiMetricForm from '../../components/MultiMetricForm'
import { healthService } from '../../services/health'
import { useTimezone } from '../../contexts/TimezoneContext'
import { useAuth } from '../../contexts/AuthContext'
import { createUnitConverter } from '../../utils/units'

// Mock dependencies
vi.mock('../../services/health', () => ({
  healthService: {
    createHealthData: vi.fn()
  }
}))

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

vi.mock('../../contexts/TimezoneContext', () => ({
  useTimezone: vi.fn(),
  TimezoneContext: {
    Provider: ({ children }: { children: React.ReactNode }) => children,
  }
}))

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
  AuthContext: {
    Provider: ({ children }: { children: React.ReactNode }) => children,
  }
}))

vi.mock('../../utils/units', () => ({
  createUnitConverter: vi.fn(),
  getUnitLabel: vi.fn((metric, unit) => {
    const labels = {
      weight: { kg: 'kg', lbs: 'lbs' },
      temperature: { c: '°C', f: '°F' }
    }
    return labels[metric]?.[unit] || unit
  })
}))

describe('MultiMetricForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock useTimezone
    const mockTimezone = {
      getCurrentDateTimeLocal: vi.fn(() => '2024-01-01T10:00'),
      convertToUTC: vi.fn((dateTime) => `${dateTime}:00Z`)
    }
    
    const mockUnitConverter = {
      getUserUnitForMetric: vi.fn((metric) => {
        const userUnits = { weight: 'lbs', temperature: 'f' }
        return userUnits[metric] || 'metric'
      }),
      convertFromUserUnits: vi.fn((value, metric, targetUnit) => {
        if (metric === 'weight' && targetUnit === 'kg') {
          return value * 0.453592 // lbs to kg
        }
        if (metric === 'temperature' && targetUnit === 'c') {
          return (value - 32) * 5/9 // F to C
        }
        return value
      })
    }
    
    vi.mocked(useTimezone).mockReturnValue(mockTimezone)
    
    // Mock useAuth
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: 1,
        email: 'test@example.com',
        username: 'testuser',
        full_name: 'Test User',
        timezone: 'America/New_York',
        weight_unit: 'lbs',
        temperature_unit: 'f',
        height_unit: 'ft',
        is_active: true,
        is_superuser: false,
        ai_context_profile: '',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      loading: false,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
    })
    
    // Mock unit converter
    vi.mocked(createUnitConverter).mockReturnValue(mockUnitConverter)
    
    // Mock healthService
    vi.mocked(healthService.createHealthData).mockResolvedValue({
      id: 1,
      user_id: 1,
      metric_type: 'blood_pressure',
      value: 120,
      unit: 'mmHg',
      recorded_at: '2024-01-01T10:00:00Z',
      notes: '',
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-01-01T10:00:00Z'
    })
  })

  it('renders collapsed button initially', () => {
    render(<MultiMetricForm />)
    
    expect(screen.getByText('+ Multi-Metric Quick Add')).toBeInTheDocument()
    expect(screen.queryByText('Multi-Metric Health Entry')).not.toBeInTheDocument()
  })

  it('expands form when button is clicked', async () => {
    render(<MultiMetricForm />)
    
    fireEvent.click(screen.getByText('+ Multi-Metric Quick Add'))
    
    await waitFor(() => {
      expect(screen.getByText('Multi-Metric Health Entry')).toBeInTheDocument()
    })
    
    expect(screen.getByText('Quick Presets')).toBeInTheDocument()
    expect(screen.getByText('Select Metrics to Track')).toBeInTheDocument()
  })

  it('displays all metric toggles', async () => {
    render(<MultiMetricForm />)
    fireEvent.click(screen.getByText('+ Multi-Metric Quick Add'))
    
    await waitFor(() => {
      expect(screen.getByText('Blood Pressure')).toBeInTheDocument()
      expect(screen.getByText('Blood Sugar')).toBeInTheDocument()
      expect(screen.getByText('Weight')).toBeInTheDocument()
      expect(screen.getByText('Heart Rate')).toBeInTheDocument()
      expect(screen.getByText('Temperature')).toBeInTheDocument()
    })
  })

  it('displays quick preset buttons', async () => {
    render(<MultiMetricForm />)
    fireEvent.click(screen.getByText('+ Multi-Metric Quick Add'))
    
    await waitFor(() => {
      expect(screen.getByText('Morning')).toBeInTheDocument()
      expect(screen.getByText('Post-Meal')).toBeInTheDocument()
      expect(screen.getByText('All Vitals')).toBeInTheDocument()
    })
  })

  it('applies morning preset correctly', async () => {
    render(<MultiMetricForm />)
    fireEvent.click(screen.getByText('+ Multi-Metric Quick Add'))
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('Morning'))
    })
    
    // Check that weight, bp, and hr are enabled
    await waitFor(() => {
      expect(screen.getByText('3 metrics selected')).toBeInTheDocument()
    })
  })

  it('enables metric input fields when toggled', async () => {
    render(<MultiMetricForm />)
    fireEvent.click(screen.getByText('+ Multi-Metric Quick Add'))
    
    await waitFor(() => {
      // Click blood pressure toggle
      const bpToggle = screen.getByText('Blood Pressure').closest('button')
      fireEvent.click(bpToggle!)
    })
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('120')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('80')).toBeInTheDocument()
    })
  })

  it('shows correct units for weight based on user preference', async () => {
    render(<MultiMetricForm />)
    fireEvent.click(screen.getByText('+ Multi-Metric Quick Add'))
    
    await waitFor(() => {
      const weightToggle = screen.getByText('Weight').closest('button')
      fireEvent.click(weightToggle!)
    })
    
    await waitFor(() => {
      expect(screen.getByText('Weight (lbs)')).toBeInTheDocument()
    })
  })

  it('shows correct units for temperature based on user preference', async () => {
    render(<MultiMetricForm />)
    fireEvent.click(screen.getByText('+ Multi-Metric Quick Add'))
    
    await waitFor(() => {
      const tempToggle = screen.getByText('Temperature').closest('button')
      fireEvent.click(tempToggle!)
    })
    
    await waitFor(() => {
      expect(screen.getByText('Temperature (°F)')).toBeInTheDocument()
    })
  })

  it('prevents submission with no metrics selected', async () => {
    render(<MultiMetricForm />)
    fireEvent.click(screen.getByText('+ Multi-Metric Quick Add'))
    
    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: /Add 0 Metrics/ })
      expect(submitButton).toBeDisabled()
    })
  })

  it('shows validation errors when submitting with empty required fields', async () => {
    render(<MultiMetricForm />)
    fireEvent.click(screen.getByText('+ Multi-Metric Quick Add'))
    
    await waitFor(() => {
      // Enable blood pressure but don't fill values
      const bpToggle = screen.getByText('Blood Pressure').closest('button')
      fireEvent.click(bpToggle!)
    })
    
    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: /Add 1 Metric/ })
      fireEvent.click(submitButton)
    })
    
    // Should show form validation errors, not submit to API
    await waitFor(() => {
      expect(screen.getByText('Systolic is required')).toBeInTheDocument()
      expect(screen.getByText('Diastolic is required')).toBeInTheDocument()
      expect(healthService.createHealthData).not.toHaveBeenCalled()
    })
  })

  it('successfully submits blood pressure data', async () => {
    const onDataAdded = vi.fn()
    render(<MultiMetricForm onDataAdded={onDataAdded} />)
    fireEvent.click(screen.getByText('+ Multi-Metric Quick Add'))
    
    await waitFor(() => {
      // Enable blood pressure
      const bpToggle = screen.getByText('Blood Pressure').closest('button')
      fireEvent.click(bpToggle!)
    })
    
    await waitFor(() => {
      // Fill in blood pressure values
      fireEvent.change(screen.getByPlaceholderText('120'), { target: { value: '130' } })
      fireEvent.change(screen.getByPlaceholderText('80'), { target: { value: '85' } })
    })
    
    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: /Add 1 Metric/ })
      fireEvent.click(submitButton)
    })
    
    await waitFor(() => {
      expect(healthService.createHealthData).toHaveBeenCalledWith({
        metric_type: 'blood_pressure',
        value: 130,
        systolic: 130,
        diastolic: 85,
        unit: 'mmHg',
        notes: '',
        recorded_at: '2024-01-01T10:00:00Z'
      })
      expect(toast.success).toHaveBeenCalledWith('Successfully added 1 health metric!')
      expect(onDataAdded).toHaveBeenCalled()
    })
  })

  it('successfully submits weight data with unit conversion', async () => {
    render(<MultiMetricForm />)
    fireEvent.click(screen.getByText('+ Multi-Metric Quick Add'))
    
    await waitFor(() => {
      // Enable weight
      const weightToggle = screen.getByText('Weight').closest('button')
      fireEvent.click(weightToggle!)
    })
    
    await waitFor(() => {
      // Fill in weight value (lbs)
      fireEvent.change(screen.getByPlaceholderText('150'), { target: { value: '150' } })
    })
    
    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: /Add 1 Metric/ })
      fireEvent.click(submitButton)
    })
    
    await waitFor(() => {
      expect(healthService.createHealthData).toHaveBeenCalledWith({
        metric_type: 'weight',
        value: 68.0388, // 150 lbs converted to kg
        unit: 'kg',
        notes: '',
        recorded_at: '2024-01-01T10:00:00Z'
      })
    })
  })

  it('successfully submits multiple metrics at once', async () => {
    render(<MultiMetricForm />)
    fireEvent.click(screen.getByText('+ Multi-Metric Quick Add'))
    
    await waitFor(() => {
      // Apply "All Vitals" preset
      fireEvent.click(screen.getByText('All Vitals'))
    })
    
    await waitFor(() => {
      // Fill in all values
      fireEvent.change(screen.getByPlaceholderText('120'), { target: { value: '130' } })
      fireEvent.change(screen.getByPlaceholderText('80'), { target: { value: '85' } })
      fireEvent.change(screen.getByPlaceholderText('100'), { target: { value: '95' } })
      fireEvent.change(screen.getByPlaceholderText('150'), { target: { value: '150' } })
      fireEvent.change(screen.getByPlaceholderText('70'), { target: { value: '72' } })
      fireEvent.change(screen.getByPlaceholderText('98.6'), { target: { value: '98.6' } })
    })
    
    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: /Add 5 Metrics/ })
      fireEvent.click(submitButton)
    })
    
    await waitFor(() => {
      expect(healthService.createHealthData).toHaveBeenCalledTimes(5)
      expect(toast.success).toHaveBeenCalledWith('Successfully added 5 health metrics!')
    })
  })

  it('handles API errors gracefully', async () => {
    vi.mocked(healthService.createHealthData).mockRejectedValue({
      response: { data: { detail: 'Server error' } }
    })
    
    render(<MultiMetricForm />)
    fireEvent.click(screen.getByText('+ Multi-Metric Quick Add'))
    
    await waitFor(() => {
      const bpToggle = screen.getByText('Blood Pressure').closest('button')
      fireEvent.click(bpToggle!)
    })
    
    await waitFor(() => {
      fireEvent.change(screen.getByPlaceholderText('120'), { target: { value: '130' } })
      fireEvent.change(screen.getByPlaceholderText('80'), { target: { value: '85' } })
    })
    
    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: /Add 1 Metric/ })
      fireEvent.click(submitButton)
    })
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Server error')
    })
  })

  it('closes form when cancel button is clicked', async () => {
    render(<MultiMetricForm />)
    fireEvent.click(screen.getByText('+ Multi-Metric Quick Add'))
    
    await waitFor(() => {
      expect(screen.getByText('Multi-Metric Health Entry')).toBeInTheDocument()
    })
    
    fireEvent.click(screen.getByText('Cancel'))
    
    await waitFor(() => {
      expect(screen.queryByText('Multi-Metric Health Entry')).not.toBeInTheDocument()
      expect(screen.getByText('+ Multi-Metric Quick Add')).toBeInTheDocument()
    })
  })

  it('closes form when X button is clicked', async () => {
    render(<MultiMetricForm />)
    fireEvent.click(screen.getByText('+ Multi-Metric Quick Add'))
    
    await waitFor(() => {
      expect(screen.getByText('Multi-Metric Health Entry')).toBeInTheDocument()
    })
    
    fireEvent.click(screen.getByText('✕'))
    
    await waitFor(() => {
      expect(screen.queryByText('Multi-Metric Health Entry')).not.toBeInTheDocument()
      expect(screen.getByText('+ Multi-Metric Quick Add')).toBeInTheDocument()
    })
  })

  it('resets form after successful submission', async () => {
    render(<MultiMetricForm />)
    fireEvent.click(screen.getByText('+ Multi-Metric Quick Add'))
    
    await waitFor(() => {
      const bpToggle = screen.getByText('Blood Pressure').closest('button')
      fireEvent.click(bpToggle!)
    })
    
    await waitFor(() => {
      fireEvent.change(screen.getByPlaceholderText('120'), { target: { value: '130' } })
      fireEvent.change(screen.getByPlaceholderText('80'), { target: { value: '85' } })
    })
    
    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: /Add 1 Metric/ })
      fireEvent.click(submitButton)
    })
    
    await waitFor(() => {
      // Form should close and reset
      expect(screen.queryByText('Multi-Metric Health Entry')).not.toBeInTheDocument()
      expect(screen.getByText('+ Multi-Metric Quick Add')).toBeInTheDocument()
    })
  })

  it('handles missing user gracefully', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
    })
    
    vi.mocked(createUnitConverter).mockReturnValue(null)
    
    render(<MultiMetricForm />)
    fireEvent.click(screen.getByText('+ Multi-Metric Quick Add'))
    
    await waitFor(() => {
      const weightToggle = screen.getByText('Weight').closest('button')
      fireEvent.click(weightToggle!)
    })
    
    // Should still render weight input with default units
    await waitFor(() => {
      expect(screen.getByText('Weight (lbs)')).toBeInTheDocument()
    })
  })

  it('validates required fields correctly', async () => {
    render(<MultiMetricForm />)
    fireEvent.click(screen.getByText('+ Multi-Metric Quick Add'))
    
    await waitFor(() => {
      const bpToggle = screen.getByText('Blood Pressure').closest('button')
      fireEvent.click(bpToggle!)
    })
    
    await waitFor(() => {
      // Fill only systolic, leave diastolic empty
      fireEvent.change(screen.getByPlaceholderText('120'), { target: { value: '130' } })
    })
    
    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: /Add 1 Metric/ })
      fireEvent.click(submitButton)
    })
    
    await waitFor(() => {
      expect(screen.getByText('Diastolic is required')).toBeInTheDocument()
    })
  })

  it('applies presets with preset metrics prop', async () => {
    render(<MultiMetricForm presetMetrics={['weight', 'bp']} />)
    fireEvent.click(screen.getByText('+ Multi-Metric Quick Add'))
    
    // Should not automatically apply presets, user still needs to manually select
    await waitFor(() => {
      expect(screen.getByText('Select one or more metrics to track')).toBeInTheDocument()
    })
  })
})
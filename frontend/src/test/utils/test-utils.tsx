import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthContext } from '../../contexts/AuthContext'
import { TimezoneContext } from '../../contexts/TimezoneContext'
import { User } from '../../types/auth'

// Mock user for testing
const mockUser: User = {
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

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  user?: User | null
}

const AllTheProviders = ({ 
  children, 
  user = mockUser,
}: { 
  children: React.ReactNode
  user?: User | null
}) => {
  // Mock AuthContext value
  const authContextValue = {
    user,
    loading: false,
    login: async () => Promise.resolve(),
    signup: async () => Promise.resolve(),
    logout: () => {},
    updateUser: () => {},
  }

  // Mock TimezoneContext value
  const timezoneContextValue = {
    userTimezone: 'America/New_York',
    availableTimezones: ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles'],
    setUserTimezone: () => {},
    formatDateTime: (utcDatetime: string | Date) => new Date(utcDatetime).toLocaleString(),
    convertToDateTimeLocal: (utcDatetime: string) => utcDatetime.slice(0, 16),
    convertToUTC: (localDatetime: string) => localDatetime + 'Z',
    getCurrentDateTimeLocal: () => new Date().toISOString().slice(0, 16),
    loading: false,
    error: null,
  }

  return (
    <BrowserRouter>
      <AuthContext.Provider value={authContextValue}>
        <TimezoneContext.Provider value={timezoneContextValue}>
          {children}
        </TimezoneContext.Provider>
      </AuthContext.Provider>
    </BrowserRouter>
  )
}

const customRender = (
  ui: ReactElement,
  { user,  ...options }: CustomRenderOptions = {}
) => {
  return render(ui, {
    wrapper: (props) => (
      <AllTheProviders {...props} user={user} />
    ),
    ...options,
  })
}

// Mock API responses
export const mockHealthData = [
  {
    id: 1,
    user_id: 1,
    metric_type: 'blood_pressure',
    value: 120,
    unit: 'mmHg',
    recorded_at: '2024-01-01T10:00:00Z',
    notes: 'Morning reading',
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T10:00:00Z'
  },
  {
    id: 2,
    user_id: 1,
    metric_type: 'weight',
    value: 70,
    unit: 'kg',
    recorded_at: '2024-01-01T09:00:00Z',
    notes: null,
    created_at: '2024-01-01T09:00:00Z',
    updated_at: '2024-01-01T09:00:00Z'
  }
]

export const mockFamilies = [
  {
    id: 1,
    name: 'Test Family',
    description: 'A test family',
    created_by: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
]

export const mockAnalysis = {
  id: 1,
  user_id: 1,
  analysis_type: 'general',
  provider_id: 1,
  status: 'completed',
  response_content: 'Your health metrics look good overall.',
  confidence_score: 0.85,
  health_data_ids: [1, 2],
  created_at: '2024-01-01T12:00:00Z',
  updated_at: '2024-01-01T12:00:00Z',
  completed_at: '2024-01-01T12:00:00Z'
}

// Re-export everything
export * from '@testing-library/react'
export { customRender as render }
export { mockUser }
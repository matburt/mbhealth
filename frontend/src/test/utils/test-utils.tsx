import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '../../contexts/AuthContext'

// Mock user for testing
const mockUser = {
  id: 1,
  email: 'test@example.com',
  username: 'testuser',
  full_name: 'Test User',
  timezone: 'America/New_York',
  weight_unit: 'lbs',
  temperature_unit: 'f',
  height_unit: 'ft',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[]
  user?: typeof mockUser | null
}

const AllTheProviders = ({ 
  children, 
  user = mockUser,
  initialEntries = ['/']
}: { 
  children: React.ReactNode
  user?: typeof mockUser | null
  initialEntries?: string[]
}) => {
  // Mock AuthContext value
  const authContextValue = {
    user,
    login: async () => ({ success: true }),
    logout: () => {},
    register: async () => ({ success: true }),
    updateProfile: async () => ({ success: true }),
    isLoading: false
  }

  return (
    <BrowserRouter>
      <AuthProvider value={authContextValue}>
        {children}
      </AuthProvider>
    </BrowserRouter>
  )
}

const customRender = (
  ui: ReactElement,
  { user, initialEntries, ...options }: CustomRenderOptions = {}
) => {
  return render(ui, {
    wrapper: (props) => (
      <AllTheProviders {...props} user={user} initialEntries={initialEntries} />
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
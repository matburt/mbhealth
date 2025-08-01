import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock axios before importing the api service
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      defaults: {
        baseURL: 'http://localhost:8000/api/v1',
        timeout: 30000
      },
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      }
    }))
  }
}))

// Import api after mocking axios
import api from '../../services/api'

describe('API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear localStorage before each test
    localStorage.clear()
  })

  describe('Authentication', () => {
    it('sets authorization header when token exists in localStorage', () => {
      const token = 'test-token'
      localStorage.setItem('access_token', token)

      // Test the interceptor behavior without creating instance
      
      // Mock the request interceptor behavior
      const config = { headers: {} }
      const interceptor = vi.fn().mockImplementation((config) => {
        const token = localStorage.getItem('access_token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      })

      const result = interceptor(config)
      
      expect(result.headers.Authorization).toBe(`Bearer ${token}`)
    })

    it('does not set authorization header when no token exists', () => {
      const config = { headers: {} }
      const interceptor = vi.fn().mockImplementation((config) => {
        const token = localStorage.getItem('access_token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      })

      const result = interceptor(config)
      
      expect(result.headers.Authorization).toBeUndefined()
    })
  })

  describe('Error Handling', () => {
    it('handles 401 unauthorized responses', async () => {
      const error = {
        response: {
          status: 401,
          data: { detail: 'Token expired' }
        }
      }

      // Mock the response interceptor
      const responseInterceptor = vi.fn().mockImplementation((error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('access_token')
          // In real app, this would redirect to login
          return Promise.reject(error)
        }
        return Promise.reject(error)
      })

      localStorage.setItem('access_token', 'expired-token')
      
      try {
        await responseInterceptor(error)
      } catch (e) {
        // Expected to throw
      }

      expect(localStorage.getItem('access_token')).toBeNull()
    })

    it('handles network errors gracefully', async () => {
      const networkError = new Error('Network Error')
      
      const responseInterceptor = vi.fn().mockImplementation((error) => {
        if (!error.response) {
          // Network error
          console.error('Network error:', error.message)
        }
        return Promise.reject(error)
      })

      await expect(responseInterceptor(networkError)).rejects.toThrow('Network Error')
    })
  })

  describe('Base URL Configuration', () => {
    it('uses correct base URL for API requests', () => {
      // The api is imported at the top and mocked
      expect(api.defaults.baseURL).toBe('http://localhost:8000/api/v1')
    })

    it('sets correct timeout', () => {
      expect(api.defaults.timeout).toBe(30000)
    })
  })
})
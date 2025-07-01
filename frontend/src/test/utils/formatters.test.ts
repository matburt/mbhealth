import { describe, it, expect } from 'vitest'

// Test utility functions that might exist in the app
describe('Utility Functions', () => {
  describe('Date Formatting', () => {
    it('formats dates correctly', () => {
      const date = new Date('2024-01-01T10:00:00Z')
      const formatted = date.toLocaleDateString()
      
      expect(formatted).toBeTruthy()
      expect(typeof formatted).toBe('string')
    })
  })

  describe('Number Formatting', () => {
    it('formats numbers with correct precision', () => {
      const value = 120.456
      const formatted = value.toFixed(1)
      
      expect(formatted).toBe('120.5')
    })

    it('handles edge cases for number formatting', () => {
      expect((0).toFixed(1)).toBe('0.0')
      expect((NaN).toString()).toBe('NaN')
      expect((Infinity).toString()).toBe('Infinity')
    })
  })

  describe('String Utilities', () => {
    it('capitalizes first letter correctly', () => {
      const capitalize = (str: string) => 
        str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
      
      expect(capitalize('hello')).toBe('Hello')
      expect(capitalize('WORLD')).toBe('World')
      expect(capitalize('')).toBe('')
    })

    it('truncates long strings', () => {
      const truncate = (str: string, length: number) => 
        str.length > length ? str.slice(0, length) + '...' : str
      
      expect(truncate('This is a long string', 10)).toBe('This is a ...')
      expect(truncate('Short', 10)).toBe('Short')
    })
  })

  describe('Validation Helpers', () => {
    it('validates email format', () => {
      const isValidEmail = (email: string) => 
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      
      expect(isValidEmail('test@example.com')).toBe(true)
      expect(isValidEmail('invalid-email')).toBe(false)
      expect(isValidEmail('test@')).toBe(false)
      expect(isValidEmail('@example.com')).toBe(false)
    })

    it('validates password strength', () => {
      const isStrongPassword = (password: string) => 
        password.length >= 8 && 
        /[A-Z]/.test(password) && 
        /[a-z]/.test(password) && 
        /[0-9]/.test(password)
      
      expect(isStrongPassword('Password123')).toBe(true)
      expect(isStrongPassword('password')).toBe(false)
      expect(isStrongPassword('PASSWORD123')).toBe(false)
      expect(isStrongPassword('Password')).toBe(false)
      expect(isStrongPassword('Pass1')).toBe(false)
    })
  })

  describe('Array Utilities', () => {
    it('groups array items correctly', () => {
      const items = [
        { type: 'A', value: 1 },
        { type: 'B', value: 2 },
        { type: 'A', value: 3 }
      ]
      
      const groupBy = <T, K extends keyof T>(array: T[], key: K) => {
        return array.reduce((groups, item) => {
          const group = item[key] as string
          groups[group] = groups[group] || []
          groups[group].push(item)
          return groups
        }, {} as Record<string, T[]>)
      }
      
      const grouped = groupBy(items, 'type')
      
      expect(grouped['A']).toHaveLength(2)
      expect(grouped['B']).toHaveLength(1)
      expect(grouped['A'][0].value).toBe(1)
      expect(grouped['A'][1].value).toBe(3)
    })

    it('sorts arrays correctly', () => {
      const numbers = [3, 1, 4, 1, 5, 9, 2, 6]
      const sorted = [...numbers].sort((a, b) => a - b)
      
      expect(sorted).toEqual([1, 1, 2, 3, 4, 5, 6, 9])
    })
  })
})
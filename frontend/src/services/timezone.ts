import api from './api';

export interface TimezoneInfo {
  current_timezone: string;
  available_timezones: string[];
  current_time: string;
}

export interface TimezoneValidation {
  timezone: string;
  valid: boolean;
  current_time: string | null;
}

class TimezoneService {
  /**
   * Get available timezones
   */
  async getAvailableTimezones(): Promise<string[]> {
    const response = await api.get('/timezone/available');
    return response.data;
  }

  /**
   * Get current user's timezone information
   */
  async getUserTimezone(): Promise<TimezoneInfo> {
    const response = await api.get('/timezone/current');
    return response.data;
  }

  /**
   * Validate a timezone name
   */
  async validateTimezone(timezoneName: string): Promise<TimezoneValidation> {
    const response = await api.post('/timezone/validate', null, {
      params: { timezone_name: timezoneName }
    });
    return response.data;
  }

  /**
   * Convert UTC datetime to user's local timezone
   */
  convertUTCToLocal(utcDatetime: string, _timezone: string = 'America/New_York'): Date {
    const date = new Date(utcDatetime + 'Z'); // Ensure it's treated as UTC
    return date;
  }

  /**
   * Format datetime for display in user's timezone
   */
  formatDateTimeForUser(
    utcDatetime: string | Date, 
    timezone: string = 'America/New_York',
    format: 'short' | 'long' | 'datetime' | 'date' | 'time' = 'datetime'
  ): string {
    if (!utcDatetime) return '';
    
    const date = typeof utcDatetime === 'string' 
      ? new Date(utcDatetime + (utcDatetime.includes('Z') ? '' : 'Z'))
      : utcDatetime;

    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
    };

    switch (format) {
      case 'short':
        options.year = '2-digit';
        options.month = 'short';
        options.day = 'numeric';
        options.hour = 'numeric';
        options.minute = '2-digit';
        }break;break;
      case 'long':
        options.year = 'numeric';
        options.month = 'long';
        options.day = 'numeric';
        options.hour = 'numeric';
        options.minute = '2-digit';
        options.second = '2-digit';
        options.timeZoneName = 'short';
        }break;break;
      case 'date':
        options.year = 'numeric';
        options.month = 'short';
        options.day = 'numeric';
        }break;break;
      case 'time':
        options.hour = 'numeric';
        options.minute = '2-digit';
        }break;break;
      case 'datetime':
      default:
        options.year = 'numeric';
        options.month = 'short';
        options.day = 'numeric';
        options.hour = 'numeric';
        options.minute = '2-digit';
        }break;break;
    }

    return new Intl.DateTimeFormat('en-US', options).format(date);
  }

  /**
   * Convert local datetime input to UTC for API
   */
  convertLocalToUTC(localDatetime: string, timezone: string = 'America/New_York'): string {
    if (!localDatetime) return new Date().toISOString();
    
    // The input from datetime-local is in format: "2024-01-15T14:30"
    // We need to treat this as being in the user's selected timezone and convert to UTC
    
    // Parse the datetime components
    const [datePart, timePart] = localDatetime.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = timePart ? timePart.split(':').map(Number) : [0, 0];
    
    // Create a date string that can be interpreted in the target timezone
    const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
    
    // Use a trick: create the date as if it's UTC, then find what UTC time would 
    // display as this local time in the target timezone
    const targetDate = new Date(dateString + 'Z');
    
    // Format this UTC time to see what it looks like in the target timezone
    const formatter = new Intl.DateTimeFormat('sv-SE', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    const formatted = formatter.format(targetDate).replace(' ', 'T');
    
    // Calculate the difference between what we want and what we got
    const wantedTime = new Date(dateString + 'Z').getTime();
    const actualTime = new Date(formatted + 'Z').getTime();
    const diff = wantedTime - actualTime;
    
    // Apply the correction
    return new Date(targetDate.getTime() + diff).toISOString();
  }

  /**
   * Get current datetime in user's timezone formatted for datetime-local input
   */
  getCurrentDateTimeLocal(timezone: string = 'America/New_York'): string {
    const now = new Date();
    
    // Convert to user's timezone
    const localTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    
    // Format for datetime-local input (YYYY-MM-DDTHH:mm)
    const year = localTime.getFullYear();
    const month = String(localTime.getMonth() + 1).padStart(2, '0');
    const day = String(localTime.getDate()).padStart(2, '0');
    const hours = String(localTime.getHours()).padStart(2, '0');
    const minutes = String(localTime.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  /**
   * Convert UTC datetime to format suitable for datetime-local input
   */
  convertUTCToDateTimeLocal(utcDatetime: string, timezone: string = 'America/New_York'): string {
    if (!utcDatetime) return '';
    
    const date = new Date(utcDatetime + (utcDatetime.includes('Z') ? '' : 'Z'));
    const localTime = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    
    // Format for datetime-local input (YYYY-MM-DDTHH:mm)
    const year = localTime.getFullYear();
    const month = String(localTime.getMonth() + 1).padStart(2, '0');
    const day = String(localTime.getDate()).padStart(2, '0');
    const hours = String(localTime.getHours()).padStart(2, '0');
    const minutes = String(localTime.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  /**
   * Get user's detected timezone
   */
  getDetectedTimezone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  /**
   * Get timezone display name
   */
  getTimezoneDisplayName(timezone: string): string {
    const displayNames: Record<string, string> = {
      'America/New_York': 'Eastern Time (US)',
      'America/Chicago': 'Central Time (US)',
      'America/Denver': 'Mountain Time (US)', 
      'America/Los_Angeles': 'Pacific Time (US)',
      'America/Anchorage': 'Alaska Time (US)',
      'Pacific/Honolulu': 'Hawaii Time (US)',
      'UTC': 'UTC',
      'Europe/London': 'London (GMT/BST)',
      'Europe/Paris': 'Paris (CET/CEST)',
      'Europe/Berlin': 'Berlin (CET/CEST)',
      'Asia/Tokyo': 'Tokyo (JST)',
      'Asia/Shanghai': 'Shanghai (CST)',
      'Asia/Kolkata': 'India (IST)',
      'Australia/Sydney': 'Sydney (AEDT/AEST)',
      'Australia/Melbourne': 'Melbourne (AEDT/AEST)',
    };
    
    return displayNames[timezone] || timezone;
  }
}

export const timezoneService = new TimezoneService();
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { timezoneService, TimezoneInfo } from '../services/timezone';

interface TimezoneContextType {
  userTimezone: string;
  availableTimezones: string[];
  setUserTimezone: (timezone: string) => void;
  formatDateTime: (utcDatetime: string | Date, format?: 'short' | 'long' | 'datetime' | 'date' | 'time') => string;
  convertToDateTimeLocal: (utcDatetime: string) => string;
  convertToUTC: (localDatetime: string) => string;
  getCurrentDateTimeLocal: () => string;
  loading: boolean;
  error: string | null;
}

const TimezoneContext = createContext<TimezoneContextType | undefined>(undefined);

interface TimezoneProviderProps {
  children: ReactNode;
}

export const TimezoneProvider: React.FC<TimezoneProviderProps> = ({ children }) => {
  const [userTimezone, setUserTimezone] = useState<string>('America/New_York');
  const [availableTimezones, setAvailableTimezones] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTimezoneInfo();
  }, []);

  const loadTimezoneInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to get user's timezone from backend
      try {
        const timezoneInfo: TimezoneInfo = await timezoneService.getUserTimezone();
        setUserTimezone(timezoneInfo.current_timezone);
        setAvailableTimezones(timezoneInfo.available_timezones);
      } catch (err) {
        // If backend fails, use detected timezone and fallback list
        console.warn('Failed to load user timezone from backend, using detected timezone');
        const detectedTimezone = timezoneService.getDetectedTimezone();
        
        // Set to detected timezone if it's in our common list, otherwise use Eastern
        const commonTimezones = [
          'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
          'America/Anchorage', 'Pacific/Honolulu', 'UTC'
        ];
        
        setUserTimezone(commonTimezones.includes(detectedTimezone) ? detectedTimezone : 'America/New_York');
        setAvailableTimezones(commonTimezones);
      }
    } catch (err) {
      console.error('Error loading timezone info:', err);
      setError('Failed to load timezone information');
      // Set defaults
      setUserTimezone('America/New_York');
      setAvailableTimezones(['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles']);
    } finally {
      setLoading(false);
    }
  };

  const handleSetUserTimezone = async (timezone: string) => {
    setUserTimezone(timezone);
    try {
      await timezoneService.saveUserTimezone(timezone);
    } catch (err) {
      console.error('Failed to save timezone preference:', err);
      // Could show a toast notification here in the future
    }
  };

  const formatDateTime = (
    utcDatetime: string | Date, 
    format: 'short' | 'long' | 'datetime' | 'date' | 'time' = 'datetime'
  ): string => {
    return timezoneService.formatDateTimeForUser(utcDatetime, userTimezone, format);
  };

  const convertToDateTimeLocal = (utcDatetime: string): string => {
    return timezoneService.convertUTCToDateTimeLocal(utcDatetime, userTimezone);
  };

  const convertToUTC = (localDatetime: string): string => {
    return timezoneService.convertLocalToUTC(localDatetime, userTimezone);
  };

  const getCurrentDateTimeLocal = (): string => {
    return timezoneService.getCurrentDateTimeLocal(userTimezone);
  };

  const value: TimezoneContextType = {
    userTimezone,
    availableTimezones,
    setUserTimezone: handleSetUserTimezone,
    formatDateTime,
    convertToDateTimeLocal,
    convertToUTC,
    getCurrentDateTimeLocal,
    loading,
    error,
  };

  return (
    <TimezoneContext.Provider value={value}>
      {children}
    </TimezoneContext.Provider>
  );
};

export const useTimezone = (): TimezoneContextType => {
  const context = useContext(TimezoneContext);
  if (context === undefined) {
    throw new Error('useTimezone must be used within a TimezoneProvider');
  }
  return context;
};
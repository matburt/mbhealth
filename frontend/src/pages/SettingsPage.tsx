import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useTimezone } from '../contexts/TimezoneContext';
import { userService } from '../services/user';

interface SettingsFormData {
  full_name: string;
  email: string;
  timezone: string;
}

const SettingsPage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { userTimezone, availableTimezones, setUserTimezone } = useTimezone();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isDirty },
  } = useForm<SettingsFormData>();

  // Set form values when user data loads
  useEffect(() => {
    if (user) {
      setValue('full_name', user.full_name || '');
      setValue('email', user.email || '');
      setValue('timezone', user.timezone || userTimezone);
    }
  }, [user, userTimezone, setValue]);

  const onSubmit = async (data: SettingsFormData) => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Update user profile
      const updatedUser = await userService.updateProfile(user.id, {
        full_name: data.full_name,
        email: data.email,
        timezone: data.timezone,
      });

      // Update auth context
      updateUser(updatedUser);

      // Update timezone context if timezone changed
      if (data.timezone !== userTimezone) {
        setUserTimezone(data.timezone);
      }

      toast.success('Settings updated successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update settings');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">
          Manage your account settings and preferences.
        </p>
      </div>

      {/* Settings Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Settings */}
        <div className="lg:col-span-2">
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Profile Information</h2>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  {...register('full_name', { 
                    required: 'Full name is required',
                    minLength: { value: 2, message: 'Full name must be at least 2 characters' }
                  })}
                  type="text"
                  className="input-field"
                  placeholder="Enter your full name"
                />
                {errors.full_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.full_name.message}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  {...register('email', { 
                    required: 'Email is required',
                    pattern: { 
                      value: /^\S+@\S+$/i, 
                      message: 'Please enter a valid email address' 
                    }
                  })}
                  type="email"
                  className="input-field"
                  placeholder="Enter your email address"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              {/* Timezone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timezone
                </label>
                <select
                  {...register('timezone', { required: 'Timezone is required' })}
                  className="input-field"
                >
                  <option value="">Select your timezone</option>
                  {availableTimezones.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz.replace('_', ' ').replace('/', ' / ')}
                    </option>
                  ))}
                </select>
                {errors.timezone && (
                  <p className="mt-1 text-sm text-red-600">{errors.timezone.message}</p>
                )}
                <p className="mt-1 text-sm text-gray-500">
                  This affects how dates and times are displayed throughout the application.
                </p>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={isLoading || !isDirty}
                  className="btn-primary"
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Account Info Sidebar */}
        <div className="space-y-6">
          {/* Account Status */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <span className={`text-sm font-medium ${
                  user.is_active ? 'text-green-600' : 'text-red-600'
                }`}>
                  {user.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Username</span>
                <span className="text-sm font-medium text-gray-900">{user.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">User ID</span>
                <span className="text-sm font-medium text-gray-900">#{user.id}</span>
              </div>
            </div>
          </div>

          {/* Current Timezone Info */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Time</h3>
            <div className="text-center">
              <p className="text-2xl font-mono text-gray-900">
                {new Date().toLocaleTimeString([], { 
                  timeZone: userTimezone,
                  hour: '2-digit', 
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {userTimezone.replace('_', ' ')}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Updates every second
              </p>
            </div>
          </div>

          {/* Tips */}
          <div className="card bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">💡 Tips</h3>
            <ul className="text-sm text-gray-700 space-y-2">
              <li>• Changes to your timezone will affect all date displays</li>
              <li>• Your data is always stored securely in UTC</li>
              <li>• Email changes may require verification</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
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
  ai_context_profile: string;
  weight_unit: 'kg' | 'lbs';
  temperature_unit: 'c' | 'f';
  height_unit: 'cm' | 'ft';
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
      setValue('ai_context_profile', user.ai_context_profile || '');
      setValue('weight_unit', user.weight_unit || 'lbs');
      setValue('temperature_unit', user.temperature_unit || 'f');
      setValue('height_unit', user.height_unit || 'ft');
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
        ai_context_profile: data.ai_context_profile,
        weight_unit: data.weight_unit,
        temperature_unit: data.temperature_unit,
        height_unit: data.height_unit,
      });

      // Update auth context
      updateUser(updatedUser);

      // Update timezone context if timezone changed
      if (data.timezone !== userTimezone) {
        setUserTimezone(data.timezone);
      }

      toast.success('Settings updated successfully!');
    } catch (error: unknown) {
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

              {/* Unit Preferences */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Unit Preferences</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Choose your preferred units for displaying health measurements.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Weight Unit */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Weight
                    </label>
                    <select
                      {...register('weight_unit', { required: 'Weight unit is required' })}
                      className="input-field"
                    >
                      <option value="lbs">Pounds (lbs)</option>
                      <option value="kg">Kilograms (kg)</option>
                    </select>
                  </div>

                  {/* Temperature Unit */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Temperature
                    </label>
                    <select
                      {...register('temperature_unit', { required: 'Temperature unit is required' })}
                      className="input-field"
                    >
                      <option value="f">Fahrenheit (°F)</option>
                      <option value="c">Celsius (°C)</option>
                    </select>
                  </div>

                  {/* Height Unit */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Height
                    </label>
                    <select
                      {...register('height_unit', { required: 'Height unit is required' })}
                      className="input-field"
                    >
                      <option value="ft">Feet & Inches (ft)</option>
                      <option value="cm">Centimeters (cm)</option>
                    </select>
                  </div>
                </div>
                
                <div className="mt-3 text-xs text-gray-500">
                  <p>• Changes will apply to all new measurements and data displays</p>
                  <p>• Existing data will be converted automatically</p>
                  <p>• US units (lbs, °F, ft) are selected by default</p>
                </div>
              </div>

              {/* AI Context Profile */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  AI Analysis Context
                </label>
                <textarea
                  {...register('ai_context_profile')}
                  className="input-field"
                  rows={4}
                  placeholder="Optional: Provide additional context for AI analysis..."
                />
                <p className="mt-1 text-sm text-gray-500">
                  This information will be included when analyzing your health data with AI to provide more personalized insights.
                </p>
                <div className="mt-2 text-xs text-gray-600">
                  <p className="font-medium mb-1">Examples you might include:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Current medications (e.g., "Taking lisinopril 10mg daily for blood pressure")</li>
                    <li>Age and relevant medical history (e.g., "45 years old, diagnosed with Type 2 diabetes in 2020")</li>
                    <li>Lifestyle factors (e.g., "Exercises 3x per week, vegetarian diet")</li>
                    <li>Health goals (e.g., "Working to reduce blood pressure below 140/90")</li>
                    <li>Known conditions or allergies</li>
                  </ul>
                </div>
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
              <li>• Unit preferences apply to all measurements and charts</li>
              <li>• US units (lbs, °F, ft) are the default for new users</li>
              <li>• Email changes may require verification</li>
              <li>• AI context helps provide more personalized health insights</li>
              <li>• Your AI context is only used for analysis, never shared</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
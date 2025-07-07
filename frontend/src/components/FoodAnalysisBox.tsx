import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { aiAnalysisService } from '../services/aiAnalysis';
import { healthService } from '../services/health';
import { userService } from '../services/user';
import { HealthData } from '../types/health';
import { useAuth } from '../contexts/AuthContext';

interface FoodAnalysisBoxProps {
  onAnalysisCreated?: () => void;
}

const FoodAnalysisBox: React.FC<FoodAnalysisBoxProps> = ({ onAnalysisCreated }) => {
  const { user } = useAuth();
  const [foodDescription, setFoodDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getTodaysHealthData = async (): Promise<HealthData[]> => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const healthData = await healthService.getHealthData({
        start_date: today,
        end_date: today
      });
      return healthData;
    } catch (error) {
      console.error('Failed to fetch today\'s health data:', error);
      return [];
    }
  };

  const getRecentHealthData = async (): Promise<HealthData[]> => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const healthData = await healthService.getHealthData({
        start_date: sevenDaysAgo.toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0]
      });
      return healthData;
    } catch (error) {
      console.error('Failed to fetch recent health data:', error);
      return [];
    }
  };

  const buildFoodAnalysisPrompt = async (food: string): Promise<string> => {
    const todaysData = await getTodaysHealthData();
    const recentData = await getRecentHealthData();
    
    let prompt = `Please analyze this food/meal for someone monitoring their health:\n\n`;
    prompt += `Food/Meal: ${food}\n\n`;
    
    // Add user's AI context profile if available
    if (user?.ai_context_profile) {
      prompt += `User's Health Profile & Context:\n${user.ai_context_profile}\n\n`;
    }
    
    // Add today's measurements context
    if (todaysData.length > 0) {
      prompt += `Today's Health Measurements (${new Date().toLocaleDateString()}):\n`;
      todaysData.forEach(data => {
        const timestamp = new Date(data.timestamp).toLocaleTimeString();
        prompt += `- ${data.metric_type}: ${data.value} ${data.unit} (recorded at ${timestamp})\n`;
        if (data.notes) {
          prompt += `  Notes: ${data.notes}\n`;
        }
      });
      prompt += `\n`;
    } else {
      prompt += `No health measurements recorded today (${new Date().toLocaleDateString()}).\n\n`;
    }
    
    // Add recent health data patterns
    if (recentData.length > 0) {
      prompt += `Recent Health Data Context (past 7 days):\n`;
      const metricSummary = recentData.reduce((acc, data) => {
        if (!acc[data.metric_type]) {
          acc[data.metric_type] = [];
        }
        acc[data.metric_type].push(data);
        return acc;
      }, {} as Record<string, HealthData[]>);
      
      Object.entries(metricSummary).forEach(([metric, data]) => {
        const avgValue = data.reduce((sum, d) => sum + d.value, 0) / data.length;
        const latestValue = data[data.length - 1].value;
        prompt += `- ${metric}: ${data.length} readings, average ${avgValue.toFixed(1)} ${data[0].unit}, latest ${latestValue} ${data[0].unit}\n`;
      });
      prompt += `\n`;
      
      // Add condition-specific considerations
      const hasBloodPressureData = recentData.some(d => d.metric_type === 'blood_pressure_systolic' || d.metric_type === 'blood_pressure_diastolic');
      const hasGlucoseData = recentData.some(d => d.metric_type === 'blood_glucose');
      const hasWeightData = recentData.some(d => d.metric_type === 'weight');
      
      if (hasBloodPressureData || hasGlucoseData || hasWeightData) {
        prompt += `Health Monitoring Focus Areas:\n`;
        
        if (hasBloodPressureData) {
          prompt += `- Blood pressure management (consider sodium, potassium, heart-healthy aspects)\n`;
        }
        
        if (hasGlucoseData) {
          prompt += `- Blood glucose control (consider carbohydrates, glycemic index, fiber content)\n`;
        }
        
        if (hasWeightData) {
          prompt += `- Weight management (consider calories, portion sizes, satiety)\n`;
        }
        
        prompt += `\n`;
      }
    }
    
    // Add user preferences context
    if (user) {
      prompt += `User Preferences:\n`;
      prompt += `- Weight unit preference: ${user.weight_unit || 'kg'}\n`;
      prompt += `- Temperature unit preference: ${user.temperature_unit || 'c'}\n`;
      prompt += `- Timezone: ${user.timezone || 'Not set'}\n\n`;
    }
    
    prompt += `Please provide a comprehensive food analysis including:\n`;
    prompt += `1. Nutritional overview (calories, macronutrients, key vitamins/minerals)\n`;
    prompt += `2. Health implications based on the user's health profile and recent patterns\n`;
    prompt += `3. Specific recommendations considering their monitored conditions\n`;
    prompt += `4. Timing considerations (when to eat this relative to measurements)\n`;
    prompt += `5. Healthier alternatives or modifications if applicable\n`;
    prompt += `6. Portion size recommendations based on their health goals\n\n`;
    
    prompt += `Please be helpful, personalized, and encouraging. Focus on practical, actionable advice that considers their specific health monitoring patterns and profile.`;
    
    return prompt;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!foodDescription.trim()) {
      toast.error('Please describe the food or meal');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const todaysData = await getTodaysHealthData();
      const contextualPrompt = await buildFoodAnalysisPrompt(foodDescription);
      
      // For food analysis, include today's data if available, otherwise send empty array
      const healthDataIds = todaysData.map(d => d.id);
      
      // Create analysis using the existing API
      const analysisData = {
        health_data_ids: healthDataIds, // Can be empty array for general questions  
        analysis_type: 'insights' as const,
        provider: 'auto', // Let the system choose the best provider
        additional_context: contextualPrompt
      };

      const result = await aiAnalysisService.createAnalysis(analysisData);
      
      // Poll for completion
      const pollForCompletion = async () => {
        const maxAttempts = 30; // 30 seconds timeout
        let attempts = 0;
        
        while (attempts < maxAttempts) {
          try {
            const status = await aiAnalysisService.getAnalysis(result.id);
            
            if (status.status === 'completed') {
              setResponse(status.response_content);
              onAnalysisCreated?.();
              break;
            } else if (status.status === 'failed') {
              setError(status.error_message || 'Analysis failed');
              break;
            }
            
            // Wait 1 second before next poll
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
          } catch (error) {
            console.error('Error polling for completion:', error);
            break;
          }
        }
        
        if (attempts >= maxAttempts) {
          setError('Analysis is taking longer than expected. Please check the analysis history.');
        }
      };
      
      pollForCompletion();
      
    } catch (error) {
      console.error('Failed to create food analysis:', error);
      setError('Failed to analyze the food. Please try again.');
      toast.error('Failed to analyze the food');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setFoodDescription('');
    setResponse(null);
    setError(null);
  };

  const handleQuickFill = (food: string) => {
    setFoodDescription(food);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
          <span className="text-xl">🍎</span>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Food Analysis</h3>
          <p className="text-sm text-gray-600">Get nutritional insights for your health conditions</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <textarea
            value={foodDescription}
            onChange={(e) => setFoodDescription(e.target.value)}
            placeholder="Describe the food or meal you want to analyze...
Examples:
• Large pepperoni pizza with extra cheese
• Greek yogurt with berries and granola
• McDonald's Big Mac meal with fries and Coke
• Homemade chicken salad with olive oil dressing"
            className="input-field h-24 resize-none"
            disabled={isLoading}
          />
        </div>

        {/* Quick fill buttons */}
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-gray-600 mr-2">Quick examples:</span>
          <button
            type="button"
            onClick={() => handleQuickFill('Large pepperoni pizza')}
            className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
          >
            Pizza
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('Greek yogurt with berries')}
            className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
          >
            Yogurt & Berries
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('McDonald\'s Big Mac meal')}
            className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
          >
            Fast Food
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('Grilled chicken salad')}
            className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
          >
            Salad
          </button>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isLoading || !foodDescription.trim()}
            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analyzing...
              </span>
            ) : (
              'Analyze Food'
            )}
          </button>
          
          {(response || error) && (
            <button
              type="button"
              onClick={handleClear}
              className="btn-secondary"
            >
              Clear
            </button>
          )}
        </div>
      </form>

      {/* Response Display */}
      {isLoading && (
        <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-md">
          <div className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4 text-orange-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-orange-700">AI is analyzing the nutritional content...</span>
          </div>
        </div>
      )}

      {response && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-start gap-2">
            <span className="text-green-600 mt-1">✓</span>
            <div className="flex-1">
              <h4 className="font-medium text-green-800 mb-2">Nutritional Analysis:</h4>
              <div className="text-green-700 whitespace-pre-wrap">{response}</div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-start gap-2">
            <span className="text-red-600 mt-1">⚠</span>
            <div className="flex-1">
              <h4 className="font-medium text-red-800 mb-1">Error:</h4>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FoodAnalysisBox;
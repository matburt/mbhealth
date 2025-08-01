import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { aiAnalysisService } from '../services/aiAnalysis';
import { healthService } from '../services/health';
import { HealthData } from '../types/health';
import { useAuth } from '../contexts/AuthContext';
import { createUnitConverter } from '../utils/units';

interface QuickQuestionBoxProps {
  onAnalysisCreated?: () => void;
}

const QuickQuestionBox: React.FC<QuickQuestionBoxProps> = ({ onAnalysisCreated }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getTodaysHealthData = async (): Promise<HealthData[]> => {
    try {
      // Create start and end of today in ISO format
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
      
      const healthData = await healthService.getHealthData({
        start_date: startOfDay,
        end_date: endOfDay
      });
      return healthData || [];
    } catch (error) {
      console.error('Failed to fetch today\'s health data:', error);
      return [];
    }
  };

  const buildContextualPrompt = async (userQuestion: string): Promise<string> => {
    const todaysData = await getTodaysHealthData();
    
    let contextualPrompt = `You are a health advisor. Focus on answering the user's specific question. Do not provide a general health data analysis unless specifically asked. Provide direct, helpful answers based on the context provided.\n\n`;
    contextualPrompt += `User Question: ${userQuestion}\n\n`;
    
    // Add user's AI context profile if available
    if (user?.ai_context_profile) {
      contextualPrompt += `User's Health Profile & Context:\n${user.ai_context_profile}\n\n`;
    }
    
    // Add today's health measurements with user's preferred units
    if (todaysData.length > 0) {
      contextualPrompt += `Today's Health Measurements (${new Date().toLocaleDateString()}):\n`;
      const unitConverter = user ? createUnitConverter(user) : null;
      
      todaysData.forEach(data => {
        const timestamp = new Date(data.recorded_at).toLocaleTimeString();
        let displayValue = data.value;
        let displayUnit = data.unit;
        
        // Convert to user's preferred units if converter is available
        if (unitConverter) {
          const converted = unitConverter.convertToUserUnits(data.value, data.metric_type, data.unit);
          displayValue = Math.round(converted.value * 10) / 10; // Round to 1 decimal
          displayUnit = converted.unit;
        }
        
        contextualPrompt += `- ${data.metric_type}: ${displayValue} ${displayUnit} (recorded at ${timestamp})\n`;
        if (data.notes) {
          contextualPrompt += `  Notes: ${data.notes}\n`;
        }
      });
      contextualPrompt += `\n`;
    } else {
      contextualPrompt += `No health measurements recorded today (${new Date().toLocaleDateString()}).\n\n`;
    }
    
    // Add recent patterns context
    try {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();
      
      const recentData = await healthService.getHealthData({
        start_date: startDate,
        end_date: endDate,
        limit: 20
      });
      
      if (recentData && recentData.length > 0) {
        contextualPrompt += `Recent Health Data Context (past 7 days):\n`;
        const unitConverter = user ? createUnitConverter(user) : null;
        const metricSummary = recentData.reduce((acc, data) => {
          if (!acc[data.metric_type]) {
            acc[data.metric_type] = [];
          }
          acc[data.metric_type].push(data);
          return acc;
        }, {} as Record<string, HealthData[]>);
        
        Object.entries(metricSummary).forEach(([metric, data]) => {
          // Convert values to user's preferred units if converter is available
          let avgValue = data.reduce((sum, d) => sum + d.value, 0) / data.length;
          let unit = data[0].unit;
          
          if (unitConverter) {
            const converted = unitConverter.convertToUserUnits(avgValue, metric, unit);
            avgValue = converted.value;
            unit = converted.unit;
          }
          
          contextualPrompt += `- ${metric}: ${data.length} readings, average ${avgValue.toFixed(1)} ${unit}\n`;
        });
        contextualPrompt += `\n`;
      } else {
        contextualPrompt += `No recent health data available (past 7 days).\n\n`;
      }
    } catch (error) {
      console.error('Failed to get recent health data for context:', error);
      contextualPrompt += `Unable to fetch recent health data for context.\n\n`;
    }
    
    // Add user preferences context
    if (user) {
      contextualPrompt += `User Preferences:\n`;
      contextualPrompt += `- Timezone: ${user.timezone || 'Not set'}\n`;
      contextualPrompt += `- Weight unit: ${user.weight_unit || 'kg'}\n`;
      contextualPrompt += `- Temperature unit: ${user.temperature_unit || 'c'}\n\n`;
    }
    
    contextualPrompt += `Please provide a helpful, personalized, and informative response to the user's question. Use the health profile context, recent patterns, and current measurements to give relevant advice. If the question is about today's measurements and there are none, mention this and provide general guidance based on their health profile and recent patterns.`;
    
    
    return contextualPrompt;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!question.trim()) {
      toast.error('Please enter a question');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const todaysData = await getTodaysHealthData();
      const contextualPrompt = await buildContextualPrompt(question);
      
      // For quick questions, include today's data if available, otherwise send empty array
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
              // Navigate to the AI Analysis page with the analysis ID
              setTimeout(() => {
                navigate(`/ai-analysis?analysis=${result.id}`);
              }, 1500); // Give user time to see the success message
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
      console.error('Failed to create quick analysis:', error);
      setError('Failed to process your question. Please try again.');
      toast.error('Failed to process your question');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setQuestion('');
    setResponse(null);
    setError(null);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <span className="text-xl">💭</span>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Quick Question</h3>
          <p className="text-sm text-gray-600">Get instant answers about your health data</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask anything about your health data... 
Examples:
• Should I be concerned about today's blood pressure reading?
• What might be causing my elevated glucose this morning?
• Is this reading pattern normal for me?"
            className="input-field h-32 resize-none"
            disabled={isLoading}
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isLoading || !question.trim()}
            className="flex-1 btn-primary disabled:bg-gray-400 disabled:cursor-not-allowed"
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
              'Ask'
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
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-blue-700">AI is analyzing your question...</span>
          </div>
        </div>
      )}

      {response && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-start gap-2">
            <span className="text-green-600 mt-1">✓</span>
            <div className="flex-1">
              <h4 className="font-medium text-green-800 mb-2">AI Response:</h4>
              <div className="text-green-700 whitespace-pre-wrap">{response}</div>
              <div className="mt-3 pt-3 border-t border-green-200">
                <p className="text-sm text-green-600 italic">Redirecting to full analysis view...</p>
              </div>
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

export default QuickQuestionBox;
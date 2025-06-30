import React from 'react';
import AIAnalysisTabs from '../components/AIAnalysisTabs';
import MainAnalysisInterface from '../components/MainAnalysisInterface';

const AIAnalysisPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">AI Analysis Hub</h1>
        <p className="text-gray-600 mt-2">
          Manage AI analyses, providers, schedules, and workflows all in one place.
        </p>
      </div>
      
      <AIAnalysisTabs>
        <MainAnalysisInterface />
      </AIAnalysisTabs>
    </div>
  );
};

export default AIAnalysisPage;
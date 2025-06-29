import React from 'react';
import WorkflowManagement from '../components/WorkflowManagement';

const AnalysisWorkflowsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analysis Workflows</h1>
        <p className="text-gray-600 mt-2">
          Automate follow-up analyses with intelligent workflows that trigger based on analysis results and conditions.
        </p>
      </div>
      
      <WorkflowManagement />
    </div>
  );
};

export default AnalysisWorkflowsPage;
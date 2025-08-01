import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { aiAnalysisService } from '../services/aiAnalysis';
import { AIAnalysisResponse } from '../types/aiAnalysis';
import CreateAnalysisModal from './CreateAnalysisModal';
import AnalysisCard from './AnalysisCard';
import QuickQuestionBox from './QuickQuestionBox';
import FoodAnalysisBox from './FoodAnalysisBox';

const MainAnalysisInterface: React.FC = () => {
  const [analyses, setAnalyses] = useState<AIAnalysisResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [filter, setFilter] = useState('all'); // all, completed, pending, failed
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedAnalysisId, setExpandedAnalysisId] = useState<number | null>(null);

  useEffect(() => {
    fetchAnalyses();
  }, []);

  // Check for analysis query parameter and handle auto-expansion
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const analysisId = urlParams.get('analysis');
    
    if (analysisId && analyses.length > 0) {
      const targetAnalysisId = parseInt(analysisId);
      const targetAnalysis = analyses.find((a: AIAnalysisResponse) => a.id === targetAnalysisId);
      
      if (targetAnalysis) {
        setExpandedAnalysisId(targetAnalysisId);
        
        // Clear the query parameter to keep URL clean
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('analysis');
        window.history.replaceState({}, '', newUrl.toString());
        
        // Scroll to the analysis after a short delay to ensure rendering is complete
        setTimeout(() => {
          const element = document.getElementById(`analysis-${targetAnalysisId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Add a brief highlight effect
            element.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.3)';
            setTimeout(() => {
              element.style.boxShadow = '';
            }, 2000);
          }
        }, 100);
      } else {
        // Analysis not found, show a toast message
        toast.error('Analysis not found or access denied');
      }
    }
  }, [analyses]);

  const fetchAnalyses = async () => {
    setLoading(true);
    try {
      const data = await aiAnalysisService.getAnalysisHistory();
      setAnalyses(data);
    } catch (error) {
      console.error('Failed to fetch analyses:', error);
      toast.error('Failed to load analysis history');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalysisCreated = () => {
    fetchAnalyses();
  };

  const handleAnalysisDeleted = () => {
    fetchAnalyses();
  };

  const filteredAnalyses = analyses.filter(analysis => {
    // Filter by status
    if (filter !== 'all' && analysis.status !== filter) return false;
    
    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        analysis.analysis_type.toLowerCase().includes(searchLower) ||
        analysis.provider.toLowerCase().includes(searchLower) ||
        analysis.response_content.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });

  const getStats = () => {
    const total = analyses.length;
    const completed = analyses.filter(a => a.status === 'completed').length;
    const pending = analyses.filter(a => a.status === 'pending').length;
    const failed = analyses.filter(a => a.status === 'failed').length;
    return { total, completed, pending, failed };
  };

  const stats = getStats();

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-lg p-6">
              <div className="h-4 bg-gray-300 rounded w-1/3 mb-2"></div>
              <div className="h-20 bg-gray-300 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Create & Manage Analyses</h2>
          <p className="text-gray-600">
            Get intelligent insights from your health data using advanced AI
          </p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="btn-primary"
        >
          New Analysis
        </button>
      </div>

      {/* Quick Analysis Boxes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QuickQuestionBox onAnalysisCreated={handleAnalysisCreated} />
        <FoodAnalysisBox onAnalysisCreated={handleAnalysisCreated} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center">
            <span className="text-2xl mr-3">🤖</span>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-600">Total Analyses</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center">
            <span className="text-2xl mr-3">✅</span>
            <div>
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              <p className="text-sm text-gray-600">Completed</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center">
            <span className="text-2xl mr-3">⏳</span>
            <div>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              <p className="text-sm text-gray-600">Pending</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center">
            <span className="text-2xl mr-3">❌</span>
            <div>
              <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
              <p className="text-sm text-gray-600">Failed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search analyses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field w-full"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input-field"
          >
            <option value="all">All Analyses</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {filteredAnalyses.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🤖</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm || filter !== 'all' ? 'No analyses found' : 'No analyses yet'}
          </h3>
          <p className="text-gray-500 mb-6">
            {searchTerm || filter !== 'all' 
              ? 'Try adjusting your search or filters'
              : 'Create your first AI analysis to get intelligent insights from your health data'
            }
          </p>
          {!searchTerm && filter === 'all' && (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="btn-primary"
            >
              Create Your First Analysis
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {filteredAnalyses.map((analysis) => (
            <div key={analysis.id} id={`analysis-${analysis.id}`}>
              <AnalysisCard
                analysis={analysis}
                onAnalysisDeleted={handleAnalysisDeleted}
                initialExpanded={expandedAnalysisId === analysis.id}
              />
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <CreateAnalysisModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onAnalysisCreated={handleAnalysisCreated}
      />
    </div>
  );
};

export default MainAnalysisInterface;
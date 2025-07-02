import React from 'react';
import { Routes, Route, Navigate, createBrowserRouter, RouterProvider } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import RouteErrorBoundary from './components/RouteErrorBoundary';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import HealthDataPage from './pages/HealthDataPage';
import DataVisualizationPage from './pages/DataVisualizationPage';
import NotesPage from './pages/NotesPage';
import FamiliesPage from './pages/FamiliesPage';
import CareTeamsPage from './pages/CareTeamsPage';
import AIAnalysisPage from './pages/AIAnalysisPage';
import NotificationsPage from './pages/NotificationsPage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  if (user) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={
        <PublicRoute>
          <LoginPage />
        </PublicRoute>
      } errorElement={<RouteErrorBoundary />} />
      <Route path="/signup" element={
        <PublicRoute>
          <SignupPage />
        </PublicRoute>
      } errorElement={<RouteErrorBoundary />} />
      
      {/* Protected routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      } errorElement={<RouteErrorBoundary />}>
        <Route index element={<DashboardPage />} errorElement={<RouteErrorBoundary />} />
        <Route path="health-data" element={<HealthDataPage />} errorElement={<RouteErrorBoundary />} />
        <Route path="data-visualization" element={<DataVisualizationPage />} errorElement={<RouteErrorBoundary />} />
        <Route path="notes" element={<NotesPage />} errorElement={<RouteErrorBoundary />} />
        <Route path="families" element={<FamiliesPage />} errorElement={<RouteErrorBoundary />} />
        <Route path="care-teams" element={<CareTeamsPage />} errorElement={<RouteErrorBoundary />} />
        <Route path="ai-analysis" element={<AIAnalysisPage />} errorElement={<RouteErrorBoundary />} />
        <Route path="notifications" element={<NotificationsPage />} errorElement={<RouteErrorBoundary />} />
        <Route path="settings" element={<SettingsPage />} errorElement={<RouteErrorBoundary />} />
      </Route>
      
      <Route path="*" element={<NotFoundPage />} errorElement={<RouteErrorBoundary />} />
    </Routes>
  );
};

export default App; 
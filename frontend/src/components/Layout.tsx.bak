import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/health-data', label: 'Health Data' },
  { to: '/data-visualization', label: 'Data Visualization' },
  { to: '/notes', label: 'Notes' },
  { to: '/families', label: 'Families' },
  { to: '/care-teams', label: 'Care Teams' },
  { to: '/ai-analysis', label: 'AI Analysis' },
  { to: '/notifications', label: 'Notifications' },
  { to: '/settings', label: 'Settings' },
];

const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // If not authenticated, redirect to login
  if (!user) {
    return null; // Will be handled by routing
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-white border-r p-6 flex flex-col gap-4">
        <div className="text-2xl font-bold mb-8">MBHealth</div>
        
        {/* User info */}
        <div className="mb-6 p-3 bg-gray-50 rounded-lg">
          <p className="font-medium text-gray-900">{user.full_name || user.username}</p>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>
        
        <nav className="flex flex-col gap-2">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`py-2 px-3 rounded-lg font-medium transition-colors duration-200 ${
                location.pathname === item.to 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'hover:bg-primary-50'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        
        <div className="mt-auto">
          <button 
            onClick={handleLogout}
            className="btn-secondary w-full"
          >
            Logout
          </button>
        </div>
      </aside>
      
      <main className="flex-1 p-8 bg-gray-50 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout; 
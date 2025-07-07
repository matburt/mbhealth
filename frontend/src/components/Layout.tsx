import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import PWAInstallPrompt from './PWAInstallPrompt';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '🏠' },
  { to: '/health-data', label: 'Health Data', icon: '📊' },
  { to: '/data-visualization', label: 'Visualizations', icon: '📈' },
  { to: '/notes', label: 'Notes', icon: '📝' },
  { to: '/families', label: 'Families', icon: '👨‍👩‍👧‍👦' },
  { to: '/care-teams', label: 'Care Teams', icon: '🏥' },
  { to: '/ai-analysis', label: 'AI Analysis', icon: '🤖' },
  { to: '/notifications', label: 'Notifications', icon: '🔔' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

const Layout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close mobile menu when navigating
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Mobile Header */}
      {isMobile && (
        <header className="bg-white border-b px-4 py-3 flex items-center justify-between md:hidden">
          <div className="text-xl font-bold">MB Health</div>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </header>
      )}

      {/* Desktop Sidebar / Mobile Menu */}
      <aside className={`
        ${isMobile ? 'fixed inset-0 z-50' : 'w-64 border-r'} 
        bg-white flex flex-col
        ${isMobile && !isMobileMenuOpen ? 'hidden' : ''}
      `}>
        {/* Mobile Menu Header */}
        {isMobile && (
          <div className="p-4 border-b flex items-center justify-between">
            <div className="text-xl font-bold">Menu</div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-100"
              aria-label="Close menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Desktop Header */}
        {!isMobile && (
          <div className="text-2xl font-bold p-6 mb-4">MB Health</div>
        )}

        {/* User info */}
        <div className="mx-4 mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="font-medium text-gray-900">{user.full_name || user.username}</p>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 overflow-y-auto">
          <div className="flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 py-3 px-4 rounded-lg font-medium transition-colors duration-200 ${
                  location.pathname === item.to
                    ? 'bg-primary-100 text-primary-700'
                    : 'hover:bg-gray-100'
                }`}
              >
                {isMobile && <span className="text-xl">{item.icon}</span>}
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t">
          <button
            onClick={handleLogout}
            className="w-full btn-secondary flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      {isMobile && isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className={`flex-1 bg-gray-50 min-h-screen ${isMobile ? 'pb-safe' : 'p-8'}`}>
        <div className={isMobile ? 'p-4' : ''}>
          <Outlet />
        </div>
      </main>

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
    </div>
  );
};

export default Layout;
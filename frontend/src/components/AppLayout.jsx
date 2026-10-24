import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Users, UserCircle, LogOut, Download, Sun, Moon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/useAuth';
import api from '../api';

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const { user, logout } = useAuth(); 
  
  const [hasReadyBatch, setHasReadyBatch] = useState(false); 
  
  // Use only an in-app choice; device theme preferences do not change the app theme.
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('themePreference') === 'dark';
  });
  
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    const checkPendingDownloads = async () => {
      try {
        const response = await api.get('pools/my-batches/');
        if (isCurrent) {
          const batches = Array.isArray(response.data) ? response.data : [];
          setHasReadyBatch(batches.some(
            (batch) => batch.status === 'matched' && !batch.is_downloaded
          ));
        }
      } catch (error) {
        console.error('Error checking downloads:', error);
      }
    };

    checkPendingDownloads();
    window.addEventListener('downloads:updated', checkPendingDownloads);

    return () => {
      isCurrent = false;
      window.removeEventListener('downloads:updated', checkPendingDownloads);
    };
  }, [location.pathname]);

  // Apply and persist the user's explicit in-app theme choice.
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('themePreference', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('themePreference', 'light');
    }
  }, [isDarkMode]);

  // 3. PWA Install prompt listener
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    // Sometimes the event fires before React mounts. 
    // If you add a global script to capture it, we can check for it here.
    if (window.deferredPWAInstallPrompt) {
      handleBeforeInstallPrompt(window.deferredPWAInstallPrompt);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setDeferredPrompt(null);
      window.deferredPWAInstallPrompt = null; // Clear global flag if set
    }
  };

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    logout(); 
    navigate('/login'); 
  };

  const profilePhoto = user?.profile_pic; 

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC] dark:bg-[#0B1120] transition-colors duration-300">
      
      <header className="sticky top-0 bg-white/80 dark:bg-[#0B1120]/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 z-[100]">
        <div className="max-w-7xl mx-auto w-full px-3 md:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-black bg-blue-600 text-white px-2 rounded-[5px] tracking-tight">
            GE
          </h1>
          
          <div className="flex items-center gap-3 sm:gap-4">
            
            {isInstallable && (
              <button 
                onClick={handleInstallClick}
                className="text-[12px] sm:text-xs font-bold tracking-wider bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 px-3 py-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors"
              >
                Install App
              </button>
            )}

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="text-gray-400 hover:text-blue-600 dark:hover:text-yellow-400 transition-colors duration-300"
              title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <div className="w-[1px] h-5 bg-gray-200 dark:bg-slate-700"></div>

            <button 
              onClick={handleLogout}
              className="group flex items-center gap-2 hover:text-red-500 transition-all duration-300 text-blue-600"
              title="Logout"
            >
              <LogOut size={20} className="group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto w-full relative z-0">
        <div className="max-w-7xl mx-auto w-full px-3 md:px-8 pt-2 pb-20">
          <Outlet />
        </div>
      </main>

      <nav className="fixed bottom-0 w-full bg-white/90 dark:bg-[#0B1120]/90 backdrop-blur-md border-t border-gray-100 dark:border-slate-800 z-[100] pb-safe">
        <div className="max-w-7xl mx-auto w-full px-2 md:px-8 flex justify-between items-center h-16">
          
          <Link to="/dashboard" className={`relative flex flex-col items-center justify-center w-[20%] sm:w-20 transition-all duration-300 ${isActive('/dashboard') ? "text-blue-600 -translate-y-1" : "text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"}`}>
            <Home size={24} strokeWidth={isActive('/dashboard') ? 2.5 : 2} />
            <span className="text-[10px] mt-1 font-bold uppercase tracking-widest">Home</span>
            {isActive('/dashboard') && <div className="absolute -bottom-2 w-1 h-1 bg-blue-600 rounded-full" />}
          </Link>

          <Link to="/download" className={`relative flex flex-col items-center justify-center w-[20%] sm:w-20 transition-all duration-300 ${isActive('/download') ? "text-blue-600 -translate-y-1" : "text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"}`}>
            <div className="relative">
              <Download size={24} strokeWidth={isActive('/download') ? 2.5 : 2} />
              
              {hasReadyBatch && (
                <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-white"></span>
                </span>
              )}
            </div>
            <span className="text-[10px] mt-1 font-bold uppercase tracking-widest">Download</span>
            {isActive('/download') && <div className="absolute -bottom-2 w-1 h-1 bg-blue-600 rounded-full" />}
          </Link>
          
          <Link to="/matches" className={`relative flex flex-col items-center justify-center w-[20%] sm:w-20 transition-all duration-300 ${isActive('/matches') ? "text-blue-600 -translate-y-1" : "text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"}`}>
            <Users size={24} strokeWidth={isActive('/matches') ? 2.5 : 2} />
            <span className="text-[10px] mt-1 font-bold uppercase tracking-widest">C/S</span>
            {isActive('/matches') && <div className="absolute -bottom-2 w-1 h-1 bg-blue-600 rounded-full" />}
          </Link>
          
          <Link to="/profile" className={`relative flex flex-col items-center justify-center w-[20%] sm:w-20 transition-all duration-300 ${isActive('/profile') ? "text-blue-600 -translate-y-1" : "text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"}`}>
            {profilePhoto ? (
              <img 
                src={profilePhoto} 
                alt="Profile" 
                referrerPolicy="no-referrer" 
                className={`w-6 h-6 rounded-full object-cover transition-all ${isActive('/profile') ? "ring-2 ring-blue-600 ring-offset-2" : "opacity-80 grayscale-[20%]"}`}
              />
            ) : (
              <UserCircle size={24} strokeWidth={isActive('/profile') ? 2.5 : 2} />
            )}
            <span className="text-[10px] mt-1 font-bold uppercase tracking-widest">Profile</span>
            {isActive('/profile') && <div className="absolute -bottom-2 w-1 h-1 bg-blue-600 rounded-full" />}
          </Link>

        </div>
      </nav>
      
    </div>
  );
}
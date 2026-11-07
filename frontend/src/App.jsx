import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import ScrollToTop from './components/ScrollToTop';
import Analytics from './components/Analytics';
import AuthLoader from './components/AuthLoader';
import { useAuth } from './context/useAuth';
import RouteSEO from './components/RouteSEO';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Matches from './pages/Matches';
import Login from './pages/Login';
import Register from './pages/Register';
import LandingPage from './pages/LandingPage';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Downloads from './pages/Downloads';
import { PrivacyPage, TermsPage } from './pages/LegalPages';
import Guide from './pages/Guide';
import JoinChannel from './pages/JoinChannel';

// Sessions use cookies, so the real login state comes from AuthContext, not localStorage.
const PublicOnlyRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <AuthLoader />;
  return user ? <Navigate to="/dashboard" replace /> : children;
};

const HomeRoute = () => {
  const { user, loading } = useAuth();
  if (loading) return <AuthLoader />;
  if (user) return <Navigate to="/dashboard" replace />;
  if (localStorage.getItem('has_account') === 'true') return <Navigate to="/login" replace />;
  return <LandingPage />;
};

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-white dark:bg-[#0B1120]">
        <BrowserRouter>
          <ScrollToTop />
          <Analytics />
          <RouteSEO />
          <Routes>
            <Route path="/" element={<HomeRoute />} />
            <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
            <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
            
            <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPassword /></PublicOnlyRoute>} />
            <Route path="/reset-password/:uid/:token" element={<PublicOnlyRoute><ResetPassword /></PublicOnlyRoute>} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/guide" element={<Guide />} />
            <Route path="/join-channel" element={<JoinChannel />} />
            
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/download" element={<Downloads />} />
              <Route path="/matches" element={
                <ProtectedRoute requireComplete={true}>
                  <Matches />
                </ProtectedRoute>
              } />
            </Route>
            
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </div>
    </AuthProvider>
  );
}

export default App;
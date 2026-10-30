import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import ScrollToTop from './components/ScrollToTop';
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

const PublicOnlyRoute = ({ children }) => {
  const token = localStorage.getItem('access_token');
  return token ? <Navigate to="/dashboard" replace /> : children;
};

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-white">
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route 
              path="/" 
              element={
                localStorage.getItem('access_token') ? <Navigate to="/dashboard" replace /> : 
                localStorage.getItem('has_account') === 'true' ? <Navigate to="/login" replace /> : 
                <LandingPage />
              } 
            />
            <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
            <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
            
            <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPassword /></PublicOnlyRoute>} />
            <Route path="/reset-password/:uid/:token" element={<PublicOnlyRoute><ResetPassword /></PublicOnlyRoute>} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            
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
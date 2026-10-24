import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Matches from './pages/Matches';
import Login from './pages/Login';
import Register from './pages/Register';
import LandingPage from './pages/LandingPage';

// Import the new password recovery components
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// ADDED: Import the new Downloads page
import Downloads from './pages/Downloads';
import { PrivacyPage, TermsPage } from './pages/LegalPages';

// 1. FIXED: Move PublicOnlyRoute outside of App!
// Now it checks localStorage freshly every single time it tries to render.
const PublicOnlyRoute = ({ children }) => {
  const token = localStorage.getItem('access_token');
  return token ? <Navigate to="/dashboard" replace /> : children;
};

function App() {
  return (
    // Wrap the entire app in the AuthProvider
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* 1. PUBLIC LANDING PAGE: Only for total strangers */}
          {/* FIXED: Check localStorage inline so it never uses stale memory */}
          <Route 
            path="/" 
            element={
              localStorage.getItem('access_token') ? <Navigate to="/dashboard" replace /> : 
              localStorage.getItem('has_account') === 'true' ? <Navigate to="/login" replace /> : 
              <LandingPage />
            } 
          />

          {/* 2. AUTHENTICATION ROUTES (Locked down for non-authenticated users only) */}
          <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
          <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
          
          {/* Password Recovery Routes */}
          <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPassword /></PublicOnlyRoute>} />
          
          {/* FIXED: Updated route to accept both :uid and :token from the URL */}
          <Route path="/reset-password/:uid/:token" element={<PublicOnlyRoute><ResetPassword /></PublicOnlyRoute>} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          
          {/* 3. PROTECTED APP AREA (The Engine) */}
          {/* Everything inside here will automatically have the AppLayout applied */}
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            
            {/* ADDED: Downloads Route */}
            <Route path="/download" element={<Downloads />} />
            
            {/* Matches requires the 'Final Step' (Complete Profile) */}
            <Route path="/matches" element={
              <ProtectedRoute requireComplete={true}>
                <Matches />
              </ProtectedRoute>
            } />
            
          </Route>
          
          {/* 4. CATCH-ALL: Redirects to Dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
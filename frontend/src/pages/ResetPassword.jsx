import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../api';

export default function ResetPassword() {
  const { uid, token } = useParams(); 
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successToast, setSuccessToast] = useState(false);
  const [tokenStatus, setTokenStatus] = useState('checking');
  const [verificationAttempt, setVerificationAttempt] = useState(0);

  useEffect(() => {
    let isCurrent = true;

    const verifyToken = async () => {
      try {
        const response = await api.post('/users/reset-password-verify/', { uid, token });
        if (isCurrent) {
          setTokenStatus(response.data?.valid ? 'valid' : 'invalid');
        }
      } catch (err) {
        if (isCurrent) {
          setTokenStatus(err.response?.status === 400 ? 'invalid' : 'unavailable');
        }
      }
    };
    verifyToken();

    return () => {
      isCurrent = false;
    };
  }, [uid, token, verificationAttempt]);

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    
    if (formData.password.length < 8) {
      return setError("Password must be at least 8 characters.");
    }
    if (formData.password !== formData.confirmPassword) {
      return setError("Passwords do not match.");
    }

    setLoading(true);
    try {
      await api.post('/users/reset-password-confirm/', {
        uid: uid,
        token: token,
        new_password: formData.password,
      });

      setSuccessToast(true);
      
      setTimeout(() => {
        navigate('/login', { state: { message: 'Password updated! Please log in.' } });
      }, 2500);

    } catch (err) {
      const detail = err.response?.data?.detail;
      if (err.response?.status === 400 && detail) {
        setError(Array.isArray(detail) ? detail.join(' ') : detail);
      } else if (err.response) {
        setError('The password could not be updated. Please try again.');
      } else {
        setError('Could not reach the server. Check your connection and try again.');
      }
      setLoading(false); 
    } 
  };

  const preventCopyPaste = (e) => e.preventDefault();

  if (tokenStatus === 'checking') {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (tokenStatus === 'invalid') {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50 px-4 py-8 font-sans">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-red-100 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">Link Expired</h1>
          <p className="text-sm text-gray-500 mb-6 font-medium">This password reset link has expired or is invalid.</p>
          <Link className="block w-full bg-blue-600 text-white font-black py-3.5 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all uppercase tracking-wide" to="/forgot-password">
            Request New Link
          </Link>
        </div>
      </div>
    );
  }

  if (tokenStatus === 'unavailable') {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50 px-4 py-8 font-sans">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-amber-100 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">Couldn’t Verify Link</h1>
          <p className="text-sm text-gray-500 mb-6 font-medium">We couldn’t reach the password reset service. Check your connection and try again. Your link has not been marked as expired.</p>
          <button
            type="button"
            className="w-full bg-blue-600 text-white font-black py-3.5 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all uppercase tracking-wide"
            onClick={() => {
              setTokenStatus('checking');
              setVerificationAttempt((attempt) => attempt + 1);
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50 px-4 py-8 font-sans relative overflow-hidden">
      
      <div className={`fixed top-10 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-500 ease-out ${
          successToast ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-10 scale-95 pointer-events-none'
        }`}
      >
        <div className="bg-white px-6 py-4 rounded-2xl shadow-2xl border border-green-100 flex items-center gap-4">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center animate-pulse">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
          </div>
          <div>
            <h3 className="font-black text-gray-900 text-sm">Password Updated!</h3>
            <p className="text-xs font-bold text-gray-400">Taking you to login...</p>
          </div>
        </div>
      </div>

      <div className={`w-full max-w-md bg-white rounded-2xl shadow-xl p-6 border border-gray-100 transition-all duration-500 ${successToast ? 'opacity-50 scale-[0.98] blur-[2px]' : ''}`}>
        <header className="text-center mb-6">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Create New Password</h1>
          <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest mt-1">Make it a strong one</p>
        </header>
        
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs mb-4 border border-red-100 text-center font-bold animate-pulse">
            {error}
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 text-left">New Password</label>
            <input
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition-all font-bold bg-gray-50/50"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
              onCopy={preventCopyPaste}
              onCut={preventCopyPaste}
              onPaste={preventCopyPaste}
            />
          </div>
          
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 text-left">Confirm Password</label>
            <input
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              className={`w-full px-4 py-2.5 text-sm border rounded-xl focus:ring-2 outline-none transition-all font-bold bg-gray-50/50 ${
                formData.confirmPassword && formData.password !== formData.confirmPassword 
                ? 'border-red-300 focus:ring-red-500' 
                : 'border-gray-200 focus:ring-blue-600'
              }`}
              value={formData.confirmPassword}
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              required
              onCopy={preventCopyPaste}
              onCut={preventCopyPaste}
              onPaste={preventCopyPaste}
            />
          </div>

          <button
            type="submit"
            disabled={loading || successToast}
            className="w-full bg-blue-600 text-white font-black py-3.5 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all active:scale-[0.98] disabled:opacity-50 uppercase tracking-wide mt-2"
          >
            {loading ? 'Saving...' : successToast ? 'Success!' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
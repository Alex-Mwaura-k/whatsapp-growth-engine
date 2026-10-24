import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      // Your backend endpoint to trigger the email
      await api.post('/users/request-password-reset/', { email });
      setMessage("If an account exists for that email, we've sent a reset link.");
      setEmail('');
    } catch {
      // For security, it's often best to show the same success message 
      // even if the email doesn't exist to prevent email enumeration,
      // but you can handle specific errors here if preferred.
      setError('Something went wrong. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50 px-4 py-8 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
        <header className="text-center mb-6">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Reset Password</h1>
          <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest mt-1">We'll send you a recovery link</p>
        </header>
        
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs mb-4 border border-red-100 text-center font-bold animate-pulse">
            {error}
          </div>
        )}

        {message ? (
          <div className="bg-green-50 text-green-700 p-4 rounded-xl text-sm mb-4 border border-green-100 text-center font-bold">
            {message}
          </div>
        ) : (
          <form onSubmit={handleRequestReset} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 text-left">Email Address</label>
              <input
                type="email"
                placeholder="user@email.com"
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition-all font-bold bg-gray-50/50"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white font-black py-3.5 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all active:scale-[0.98] disabled:opacity-50 uppercase tracking-wide"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}
        
        <footer className="mt-6 text-center text-xs text-gray-500 font-medium">
          Remember your password? <Link to="/login" className="text-blue-600 font-black hover:underline">Log in here</Link>
        </footer>
      </div>
    </div>
  );
}
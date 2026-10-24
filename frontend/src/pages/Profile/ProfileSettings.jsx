import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, LogOut, Key, Phone, UserX, ArrowLeft, AlertTriangle, Loader2 } from 'lucide-react';
import Toast from "../../components/Toast";
import api from '../../api';
import { useAuth } from '../../context/useAuth';

const ProfileSettings = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [currentView, setCurrentView] = useState('main');
  const [contactStep, setContactStep] = useState(1);

  // --- GLOBAL UI STATE ---
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    confirmColor: '',
    onConfirm: null,
  });

  // --- PASSWORD STATE ---
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // --- ACCOUNT ACTION STATE ---
  const [isAccountLoading, setIsAccountLoading] = useState(false);

  // Prevent scrolling on background & reset view when closed
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      setTimeout(() => {
        setCurrentView('main');
        setContactStep(1);
        resetPasswordForm();
      }, 300);
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const resetPasswordForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
  };

  // --- API FORM HANDLERS ---
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    if (currentPassword === newPassword) {
      setPasswordError("New password must be different from current password.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post('change-password/', {
        old_password: currentPassword,
        new_password: newPassword
      });

      setToast({ 
        message: response.data?.message || "Password updated successfully!", 
        type: 'success' 
      });
      
      setTimeout(() => {
        resetPasswordForm();
        setCurrentView('main');
      }, 2000);

    } catch (err) {
      const backendError = err.response?.data;
      const errorMsg = backendError?.error || backendError?.message || backendError?.detail || "Failed to update password.";
      setPasswordError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOTP = (e) => {
    e.preventDefault();
    setContactStep(2);
  };

  const handleVerifyContact = (e) => {
    e.preventDefault();
  };

  // --- SECURE ACCOUNT MANAGEMENT ---
  
  // 1. Disable Account Methods
  const promptDisableAccount = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Temporarily Disable Account',
      message: 'Are you sure you want to temporarily disable your account? You will be logged out immediately.',
      confirmText: 'Yes, Disable',
      confirmColor: 'bg-yellow-500 hover:bg-yellow-600',
      onConfirm: executeDisableAccount,
    });
  };

  const executeDisableAccount = async () => {
    setConfirmDialog({ ...confirmDialog, isOpen: false });
    setIsAccountLoading(true);
    
    try {
      await api.post('account/disable/');
      setToast({ message: "Account disabled. Logging out...", type: 'success' });
      
      setTimeout(async () => {
        await logout();
        navigate('/login');
      }, 1500);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.detail || "Failed to disable account.";
      setToast({ message: errorMsg, type: 'error' });
    } finally {
      setIsAccountLoading(false);
    }
  };

  // 2. Delete Account Methods
  const promptDeleteAccount = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Permanently Delete Account',
      message: 'WARNING: This cannot be undone. Are you sure you want to permanently delete your account?',
      confirmText: 'Yes, Delete',
      confirmColor: 'bg-red-600 hover:bg-red-700',
      onConfirm: executeDeleteAccount,
    });
  };

  const executeDeleteAccount = async () => {
    setConfirmDialog({ ...confirmDialog, isOpen: false });
    setIsAccountLoading(true);

    try {
      await api.delete('account/delete/');
      setToast({ message: "Account permanently deleted.", type: 'success' });
      
      setTimeout(async () => {
        await logout();
        navigate('/login');
      }, 1500);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.detail || "Failed to delete account.";
      setToast({ message: errorMsg, type: 'error' });
    } finally {
      setIsAccountLoading(false);
    }
  };

  // --- VIEW RENDERS ---

  const renderMainView = () => (
    <>
      <div className="p-2">
        <div className="flex flex-col gap-1">
          <button 
            onClick={() => {
              resetPasswordForm();
              setCurrentView('password');
            }} 
            className="flex items-center gap-3 w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded-xl transition-colors group"
          >
            <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-2 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
              <Key size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Change Password</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Update your security credentials</p>
            </div>
          </button>

          <button 
            onClick={() => setCurrentView('contact')} 
            className="flex items-center gap-3 w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded-xl transition-colors group"
          >
            <div className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 p-2 rounded-lg group-hover:bg-green-100 dark:group-hover:bg-green-900/50 transition-colors">
              <Phone size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Update Contact</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Change phone number or email</p>
            </div>
          </button>

          <button 
            onClick={() => setCurrentView('account')} 
            className="flex items-center gap-3 w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded-xl transition-colors group"
          >
            <div className="bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 p-2 rounded-lg group-hover:bg-orange-100 dark:group-hover:bg-orange-900/50 transition-colors">
              <UserX size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Account Management</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Disable or delete your account</p>
            </div>
          </button>
        </div>
      </div>

      <div className="p-4 bg-gray-50 dark:bg-slate-800/80 border-t border-gray-100 dark:border-slate-700 mt-2">
        <button 
          className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 dark:hover:border-red-800 rounded-xl font-bold text-sm transition-all active:scale-95 shadow-sm"
          onClick={async () => {
            onClose(); 
            await logout();
            navigate('/login');
          }}
        >
          <LogOut size={16} />
          Log Out
        </button>
      </div>
    </>
  );

  const renderPasswordView = () => (
    <form onSubmit={handlePasswordSubmit} className="p-5 flex flex-col gap-4 animate-in slide-in-from-right-4 duration-200 relative">
      {passwordError && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold p-3 rounded-lg border border-red-100 dark:border-red-800/50 flex items-start gap-2">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{passwordError}</span>
        </div>
      )}

      <div>
        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Current Password</label>
        <input 
          type="password" 
          required 
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          disabled={isLoading}
          className="w-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50 disabled:bg-gray-50 dark:disabled:bg-slate-800/50" 
          placeholder="Enter current password" 
        />
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">New Password</label>
        <input 
          type="password" 
          required 
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          disabled={isLoading}
          className="w-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50 disabled:bg-gray-50 dark:disabled:bg-slate-800/50" 
          placeholder="Enter new password (min. 8 characters)" 
        />
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Confirm New Password</label>
        <input 
          type="password" 
          required 
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isLoading}
          className="w-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50 disabled:bg-gray-50 dark:disabled:bg-slate-800/50" 
          placeholder="Confirm new password" 
        />
      </div>
      
      <button 
        type="submit" 
        disabled={isLoading}
        className="mt-2 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 dark:disabled:bg-blue-800 text-white font-bold py-3 rounded-xl transition-colors active:scale-95 flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 size={18} className="animate-spin" /> Updating...
          </>
        ) : (
          "Update Password"
        )}
      </button>
    </form>
  );

  const renderContactView = () => (
    <div className="p-5 animate-in slide-in-from-right-4 duration-200">
      {contactStep === 1 ? (
        <form onSubmit={handleSendOTP} className="flex flex-col gap-4">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Enter your new phone number. We will send a verification code to confirm the change.</p>
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">New Phone Number</label>
            <input type="tel" required className="w-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="+254 XXX XXX XXX" />
          </div>
          <button type="submit" className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors active:scale-95">
            Send Verification Code
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyContact} className="flex flex-col gap-4">
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Enter the verification code sent to your new number.</p>
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Verification Code (OTP)</label>
            <input type="text" required className="w-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-center tracking-widest font-bold" placeholder="• • • • • •" maxLength={6} />
          </div>
          <button type="submit" className="mt-2 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-colors active:scale-95">
            Verify & Save
          </button>
          <button type="button" onClick={() => setContactStep(1)} className="text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
            Resend Code
          </button>
        </form>
      )}
    </div>
  );

  const renderAccountView = () => (
    <div className="p-5 flex flex-col gap-6 animate-in slide-in-from-right-4 duration-200 relative">
      <div className={`bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/50 p-4 rounded-xl flex items-start gap-3 ${isAccountLoading ? 'opacity-50 pointer-events-none' : ''}`}>
        <AlertTriangle className="text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" size={20} />
        <div>
          <h3 className="text-sm font-bold text-yellow-800 dark:text-yellow-300">Temporarily Disable</h3>
          <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">Your profile will be hidden, but you can recover it by logging back in.</p>
          <button 
            onClick={promptDisableAccount} 
            disabled={isAccountLoading}
            className="mt-3 text-xs font-bold bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 px-4 py-2 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/60 transition-colors active:scale-95 flex items-center gap-2 disabled:bg-yellow-100 dark:disabled:bg-yellow-900/20"
          >
            {isAccountLoading && <Loader2 size={14} className="animate-spin" />}
            Disable Account
          </button>
        </div>
      </div>

      <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 p-4 rounded-xl flex items-start gap-3 ${isAccountLoading ? 'opacity-50 pointer-events-none' : ''}`}>
        <AlertTriangle className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" size={20} />
        <div>
          <h3 className="text-sm font-bold text-red-800 dark:text-red-300">Permanently Delete</h3>
          <p className="text-xs text-red-700 dark:text-red-400 mt-1">This will erase all your data. This action cannot be undone.</p>
          <button 
            onClick={promptDeleteAccount} 
            disabled={isAccountLoading}
            className="mt-3 text-xs font-bold bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors active:scale-95 flex items-center gap-2 disabled:bg-red-400 dark:disabled:bg-red-800"
          >
            {isAccountLoading && <Loader2 size={14} className="animate-spin" />}
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );

  const getTitle = () => {
    switch(currentView) {
      case 'password': return 'Change Password';
      case 'contact': return 'Update Contact';
      case 'account': return 'Manage Account';
      default: return 'Settings';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Settings Modal Layer (z-100) */}
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
        <div 
          className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        ></div>

        <div className="relative w-full max-w-md bg-white dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
          
          <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-700 shrink-0 bg-white dark:bg-slate-800 z-10">
            <div className="flex items-center gap-3">
              {currentView !== 'main' && (
                <button 
                  onClick={() => setCurrentView('main')}
                  disabled={isLoading || isAccountLoading}
                  className="p-1.5 -ml-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors active:scale-95 disabled:opacity-50"
                >
                  <ArrowLeft size={20} />
                </button>
              )}
              <h2 className="text-lg font-black text-gray-900 dark:text-gray-100">{getTitle()}</h2>
            </div>
            <button 
              onClick={onClose}
              disabled={isLoading || isAccountLoading}
              className="p-2 -mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors active:scale-95 disabled:opacity-50"
            >
              <X size={20} />
            </button>
          </div>

          <div className="overflow-y-auto overscroll-contain relative">
            {currentView === 'main' && renderMainView()}
            {currentView === 'password' && renderPasswordView()}
            {currentView === 'contact' && renderContactView()}
            {currentView === 'account' && renderAccountView()}
          </div>
        </div>
      </div>

      {/* Confirmation Modal Layer (z-110) */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{confirmDialog.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">{confirmDialog.message}</p>
            
            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                className="px-4 py-2 text-sm font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDialog.onConfirm}
                className={`px-4 py-2 text-sm font-bold text-white rounded-xl transition-colors ${confirmDialog.confirmColor}`}
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Toast Layer */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </>
  );
};

export default ProfileSettings;
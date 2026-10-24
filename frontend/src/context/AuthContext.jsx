import { useState, useEffect } from 'react';
import api from '../api'; 
import { AuthContext } from './authContextValue';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetches the user data and validates the session cookie
  const refreshUser = async () => {
    try {
      // Best practice: Removed the leading slash so Axios perfectly appends to your base URL
      const res = await api.get('users/me/');
      setUser(res.data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // --- UPDATED: Centralized Login with Strict Error Logging ---
  const login = async (phone_number, password) => {
    try {
      // Removed the leading slash to prevent Axios URL conflicts
      const response = await api.post('login/', { phone_number, password });
      
      // Instantly sync the global state with the new user's data
      await refreshUser(); 
      return response.data;
    } catch (error) {
      // CRITICAL: This will print exactly why Django is rejecting the login
      console.error("🔥 Login Failed! Backend says:", error.response?.data || error.message);
      throw error; 
    }
  };

  // --- Centralized Logout (Session Based) ---
  const logout = async () => {
    try {
      await api.post('logout/');
    } catch (error) {
      console.error("Logout request failed, clearing local state anyway.", error);
    } finally {
      // CRITICAL: Wipe the user from React's memory to prevent cross-account leaks
      setUser(null);
    }
  };

  useEffect(() => {
    if (window.location.pathname.startsWith('/reset-password/')) {
      setLoading(false);
      return;
    }

    refreshUser();
  }, []);

  return (
    // Make sure to expose login and logout so your Login/Logout components can use them!
    <AuthContext.Provider value={{ user, loading, refreshUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
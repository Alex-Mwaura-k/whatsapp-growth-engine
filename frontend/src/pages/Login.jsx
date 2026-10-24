import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

export default function Login() {
  const { user, login } = useAuth(); 

  const [countryISO, setCountryISO] = useState(''); 
  const [isDetectingCountry, setIsDetectingCountry] = useState(true);
  
  const [formData, setFormData] = useState({
    country_code: '',
    local_number: '',    
    password: ''
  });
  
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); 
  
  const navigate = useNavigate();
  const location = useLocation();

  const PhoneInputComponent = PhoneInput.default || PhoneInput;

  useEffect(() => {
    if (location.state?.message) {
      setSuccessMsg(location.state.message);
    }
    if (user) {
      navigate('/dashboard');
    }

    fetch('https://ipapi.co/json/')
      .then((res) => {
        if (!res.ok) throw new Error("Network response was not ok");
        return res.json();
      })
      .then((data) => {
        if (data && data.country_code) {
          setCountryISO(data.country_code.toLowerCase());
          setFormData((prev) => ({ 
            ...prev, 
            country_code: data.country_calling_code.replace('+', '') 
          }));
        } else {
          throw new Error("Invalid API data");
        }
      })
      .catch(() => {
        setCountryISO('ke');
        setFormData((prev) => ({ ...prev, country_code: '254' }));
      })
      .finally(() => {
        setIsDetectingCountry(false);
      });
  }, [navigate, location, user]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    
    let cleanLocal = formData.local_number.replace(/\D/g, '');
    
    if (cleanLocal.startsWith(formData.country_code)) {
      cleanLocal = cleanLocal.substring(formData.country_code.length);
    }
    
    cleanLocal = cleanLocal.replace(/^0+/, '');
    
    const fullPhoneNumber = `+${formData.country_code}${cleanLocal}`;

    if (fullPhoneNumber.length < 10) {
      return setError("Please enter a valid complete phone number.");
    }
    if (!formData.password) {
      return setError("Please enter your password.");
    }

    setLoading(true);
    try {
      await login(fullPhoneNumber, formData.password);
      localStorage.setItem('has_account', 'true'); 
      navigate('/dashboard');
    } catch (err) {
      if (!err.response) {
        setError("Server is down or not responding. Please try again later.");
        return;
      }

      const data = err.response.data;
      
      if (data) {
        if (data.error) {
          setError(data.error); 
        } else if (data.detail) {
          setError(data.detail); 
        } else if (data.non_field_errors) {
          setError(data.non_field_errors[0]); 
        } else if (data.phone_number) {
          setError(`Phone: ${data.phone_number[0]}`);
        } else if (data.password) {
          setError(`Password: ${data.password[0]}`);
        } else if (err.response.status === 401 || err.response.status === 400) {
          setError("Incorrect phone number or password."); 
        } else if (err.response.status === 429) {
          setError("Too many login attempts. Please try again later.");
        } else {
          setError("Login failed. Please check your credentials and try again.");
        }
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const preventCopyPaste = (e) => {
    e.preventDefault();
  };

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50 px-4 py-8 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
        <header className="text-center mb-6">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Welcome Back</h1>
          <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest mt-1">Log in to Growth Engine</p>
        </header>
        
        {successMsg && (
          <div className="bg-green-50 text-green-700 p-3 rounded-xl text-xs mb-4 border border-green-200 text-center font-bold">
            {successMsg}
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs mb-4 border border-red-100 text-center font-bold animate-pulse">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          
          <div className="phone-container relative z-20">
            <label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 text-left">Phone Number</label>
            <div className="flex items-center w-full border border-gray-200 rounded-xl bg-gray-50/50 focus-within:ring-2 focus-within:ring-blue-600 transition-all h-[44px]">
              
              <div className="w-[105px] sm:w-[115px] flex-shrink-0 border-r border-gray-200 h-full bg-transparent rounded-l-xl relative">
                {isDetectingCountry ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100 animate-pulse rounded-l-xl">
                    <div className="w-6 h-4 bg-gray-300 rounded-sm mr-2"></div>
                    <div className="w-8 h-3 bg-gray-300 rounded-sm"></div>
                  </div>
                ) : (
                  <PhoneInputComponent
                    country={countryISO}
                    enableSearch={true}
                    value={formData.country_code}
                    onChange={(val, countryData) => {
                      setFormData({ ...formData, country_code: val });
                      setCountryISO(countryData.countryCode);
                    }}
                    containerClass="!w-full !h-full"
                    inputClass="!w-full !h-full !border-none !bg-transparent !font-bold !text-sm !pl-11 focus:!ring-0 !text-gray-800"
                    buttonClass="!border-none !bg-transparent !pl-1 hover:!bg-gray-100 !rounded-l-xl"
                  />
                )}
              </div>

              <div className="flex-1 relative h-full">
                <input
                  type="tel"
                  className="w-full h-full px-2 py-2.5 text-sm bg-transparent border-none outline-none font-bold text-gray-800 placeholder-gray-400 rounded-r-xl disabled:opacity-50"
                  value={formData.local_number}
                  onChange={(e) => setFormData({...formData, local_number: e.target.value})}
                  disabled={isDetectingCountry} 
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-end mb-1 ml-1 pr-1">
              <label className="block text-[10px] font-black text-gray-400 uppercase text-left">Password</label>
              <Link to="/forgot-password" className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline transition-colors">
                Forgot password?
              </Link>
            </div>
            
            <div className="relative flex items-center">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="w-full pl-4 pr-12 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition-all font-bold bg-gray-50/50 select-none"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
                autoComplete="current-password"
                onCopy={preventCopyPaste}
                onCut={preventCopyPaste}
                onPaste={preventCopyPaste}
                onContextMenu={preventCopyPaste} 
              />
              
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 p-1 text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                tabIndex="-1" 
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white font-black py-3.5 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all active:scale-[0.98] disabled:opacity-50 uppercase tracking-wide mt-2"
          >
            {loading ? 'Authenticating...' : 'Log In'}
          </button>
        </form>
        
        <footer className="mt-6 text-center text-xs text-gray-500 font-medium">
          Don't have an account? <Link to="/register" className="text-blue-600 font-black hover:underline">Register here</Link>
        </footer>
      </div>

      <style>{`
        .react-tel-input .form-control { box-shadow: none !important; }
        .react-tel-input .flag-dropdown { background-color: transparent !important; }
        .react-tel-input .selected-flag:hover, 
        .react-tel-input .selected-flag:focus { background-color: rgba(0,0,0,0.05) !important; }
        
        .react-tel-input .country-list {
          z-index: 50 !important;
          width: 300px !important;
          border-radius: 0.5rem !important;
          margin-top: 5px !important;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
        }
      `}</style>
    </div>
  );
}
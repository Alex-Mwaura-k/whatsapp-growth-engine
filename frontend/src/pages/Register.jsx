import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import api from '../api';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

export default function Register() {
  const [searchParams] = useSearchParams();
  const refCodeFromUrl = searchParams.get('ref') || '';
  const [countryISO, setCountryISO] = useState('ke');
  const [isDetectingCountry, setIsDetectingCountry] = useState(true);
  const countrySelectedByUser = useRef(false);

  const [formData, setFormData] = useState({
    whatsapp_name: '',
    country_code: '254', 
    local_number: '',    
    password: '',
    confirmPassword: '',
    termsAccepted: false,
    referred_by_code: refCodeFromUrl
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successToast, setSuccessToast] = useState(false); 

  const navigate = useNavigate();
  const PhoneInputComponent = PhoneInput.default || PhoneInput;

  useEffect(() => {
    if (localStorage.getItem('access_token')) {
      navigate('/dashboard');
    }
  }, [navigate]);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    let isActive = true;

    const detectCountry = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/', {
          signal: controller.signal,
          credentials: 'omit',
          cache: 'no-store'
        });
        if (!response.ok) {
          throw new Error(`Country lookup failed with status ${response.status}`);
        }

        const data = await response.json();
        const detectedISO = typeof data.country_code === 'string'
          ? data.country_code.trim().toLowerCase()
          : '';
        const detectedCallingCode = typeof data.country_calling_code === 'string'
          ? data.country_calling_code.replace(/\D/g, '')
          : '';

        if (
          !/^[a-z]{2}$/.test(detectedISO) ||
          !/^\d{1,4}$/.test(detectedCallingCode) ||
          Number(detectedCallingCode) < 1
        ) {
          throw new Error('Country lookup returned invalid country details');
        }

        if (!countrySelectedByUser.current) {
          setCountryISO(detectedISO);
          setFormData((prev) => ({ ...prev, country_code: detectedCallingCode }));
        }
      } catch (lookupError) {
        if (isActive && !(lookupError instanceof Error && lookupError.name === 'AbortError')) {
          console.warn('Unable to detect registration country; using Kenya as the default.', lookupError);
        }
      } finally {
        clearTimeout(timeoutId);
        if (isActive) {
          setIsDetectingCountry(false);
        }
      }
    };

    detectCountry();
    return () => {
      isActive = false;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    
    const sanitizedName = formData.whatsapp_name.replace(/[<>]/g, '').trim();
    let cleanLocal = formData.local_number.replace(/\D/g, '');
    if (cleanLocal.startsWith(formData.country_code)) {
      cleanLocal = cleanLocal.slice(formData.country_code.length);
    }
    cleanLocal = cleanLocal.replace(/^0+/, '');
    const fullPhoneNumber = `+${formData.country_code}${cleanLocal}`;
    
    if (sanitizedName.length < 2) {
      return setError("Please enter a valid WhatsApp name.");
    }
    if (fullPhoneNumber.length < 10) {
      return setError("Please enter a valid complete phone number.");
    }
    if (formData.password.length < 8) {
      return setError("Password must be at least 8 characters.");
    }
    if (formData.password !== formData.confirmPassword) {
      return setError("Passwords do not match.");
    }
    if (!formData.termsAccepted) {
      return setError("Please accept the terms.");
    }

    setLoading(true);
    try {
      await api.post('/users/register/', {
        whatsapp_name: sanitizedName,
        phone_number: fullPhoneNumber, 
        password: formData.password,
        referred_by_code: formData.referred_by_code,
        terms_accepted: formData.termsAccepted
      });

      localStorage.setItem('has_account', 'true');
      
      setSuccessToast(true);
      
      setTimeout(() => {
        navigate('/login', { state: { message: 'Account created! Log in below.' } });
      }, 2500);

    } catch (err) {
        const backendError = err.response?.data;
        if (err.response?.status === 400 && backendError?.phone_number) {
            setError("This phone number is already registered.");
        } else {
            setError(backendError?.detail || 'Registration failed. Try again.');
        }
        setLoading(false); 
    } 
  };

  const preventCopyPaste = (e) => {
    e.preventDefault();
  };

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50 px-4 py-8 font-sans relative overflow-hidden">
      
      <div 
        className={`fixed top-10 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-500 ease-out ${
          successToast ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-10 scale-95 pointer-events-none'
        }`}
      >
        <div className="bg-white px-6 py-4 rounded-2xl shadow-2xl border border-green-100 flex items-center gap-4">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center animate-pulse">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h3 className="font-black text-gray-900 text-sm">Account Created!</h3>
            <p className="text-xs font-bold text-gray-400">Taking you to login...</p>
          </div>
        </div>
      </div>

      <div className={`w-full max-w-md bg-white rounded-2xl shadow-xl p-6 border border-gray-100 transition-all duration-500 ${successToast ? 'opacity-50 scale-[0.98] blur-[2px]' : ''}`}>
        <header className="text-center mb-6">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Create Account</h1>
          <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest mt-1">Join the growth pool</p>
        </header>

        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs mb-4 border border-red-100 text-center font-bold animate-pulse">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label htmlFor="whatsapp_name" className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 text-left">WhatsApp Name</label>
            <input
              type="text"
              id="whatsapp_name"
              name="whatsapp_name"
              autoComplete="name"
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition-all font-bold bg-gray-50/50"
              value={formData.whatsapp_name}
              onChange={(e) => setFormData({...formData, whatsapp_name: e.target.value})}
              required
            />
          </div>

          <div className="phone-container relative z-20">
            <label htmlFor="local_number" className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 text-left">Phone Number</label>
            
            <div className="flex items-center w-full border border-gray-200 rounded-xl bg-gray-50/50 focus-within:ring-2 focus-within:ring-blue-600 transition-all h-[44px]">
              
              <div className="w-[105px] sm:w-[115px] flex-shrink-0 border-r border-gray-200 h-full bg-transparent rounded-l-xl">
                {isDetectingCountry && (
                  <span className="sr-only" role="status">Detecting your country code</span>
                )}
                <PhoneInputComponent
                  country={countryISO}
                  enableSearch={true}
                  value={formData.country_code}
                  inputProps={{
                    name: 'country_code',
                    id: 'country_code',
                    autoComplete: 'tel-country-code'
                  }}
                  onChange={(val, countryData) => {
                    countrySelectedByUser.current = true;
                    setFormData((prev) => ({ ...prev, country_code: val }));
                    if (countryData.countryCode) {
                      setCountryISO(countryData.countryCode);
                    }
                  }}
                  containerClass="!w-full !h-full"
                  inputClass="!w-full !h-full !border-none !bg-transparent !font-bold !text-sm !pl-11 focus:!ring-0 !text-gray-800"
                  buttonClass="!border-none !bg-transparent !pl-1 hover:!bg-gray-100 !rounded-l-xl"
                />
              </div>

              <div className="flex-1 relative h-full">
                <input
                  type="tel"
                  id="local_number"
                  name="local_number"
                  autoComplete="tel-national"
                  placeholder="07../ 01../ 7.. etc"
                  className="w-full h-full px-4 py-2.5 text-sm bg-transparent border-none outline-none font-bold text-gray-800 placeholder-gray-400 rounded-r-xl"
                  value={formData.local_number}
                  onChange={(e) => setFormData({...formData, local_number: e.target.value})}
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="password" className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 text-left">Password</label>
              <input
                type="password"
                id="password"
                name="password"
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
              <label htmlFor="confirmPassword" className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-1 text-left">Confirm</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
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
          </div>

          <div className="flex items-center gap-2 py-1">
            <input
              type="checkbox"
              id="terms"
              name="termsAccepted"
              required
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={formData.termsAccepted}
              onChange={(e) => setFormData({...formData, termsAccepted: e.target.checked})}
            />
            <label htmlFor="terms" className="text-[11px] text-gray-500 leading-tight text-left">
              I agree to the <Link to="/terms" className="text-blue-600 font-bold underline">Terms</Link> and acknowledge the <Link to="/privacy" className="text-blue-600 font-bold underline">Privacy Policy</Link>.
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || successToast}
            className="w-full bg-blue-600 text-white font-black py-3.5 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all active:scale-[0.98] disabled:opacity-50 uppercase tracking-wide"
          >
            {loading ? 'Processing...' : successToast ? 'Success!' : 'Create Account'}
          </button>
        </form>
        
        <footer className="mt-6 text-center text-xs text-gray-500 font-medium">
          Already a member? <Link to="/login" className="text-blue-600 font-black hover:underline">Log in here</Link>
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
import React, { useMemo, useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import Select from 'react-select';
import { Country, State } from 'country-state-city';

const ProfileForm = ({ 
  formData = {}, 
  setFormData, 
  categories = [], 
  handleSave, 
  handleCancel, 
  saving, 
  originalData 
}) => {

  // --- DYNAMIC DARK MODE DETECTION FOR REACT-SELECT ---
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // --- SECURITY: ADVANCED SANITIZATION ---
  const securitySanitize = (val) => {
    if (typeof val !== 'string') return val || '';
    return val
      .replace(/[<>]/g, '') // Strip HTML tags
      .replace(/javascript:/gi, '') // Block script execution
      .replace(/on\w+=/gi, ''); // Block inline event handlers
  };

  const handleInputChange = (field, value) => {
    // Strict length enforcement at the logic level
    if (value.length > 500) return; 
    setFormData(prev => ({ ...prev, [field]: securitySanitize(value) }));
  };

  // --- OPTIMIZED & DEFENSIVE LOCATION LOGIC ---
  const countryOptions = useMemo(() => {
    try {
      return Country.getAllCountries().map(c => ({
        label: c.name,
        value: c.isoCode,
        name: c.name
      }));
    } catch { return []; }
  }, []);

  const selectedCountry = useMemo(() => 
    countryOptions.find(c => c.name === formData?.location_country) || null,
    [formData?.location_country, countryOptions]
  );

  const stateOptions = useMemo(() => {
    if (!selectedCountry?.value) return [];
    try {
      const states = State.getStatesOfCountry(selectedCountry.value);
      return (states || []).map(s => ({
        label: s.name,
        value: s.name
      }));
    } catch (err) {
      console.error("Location Library Error:", err);
      return [];
    }
  }, [selectedCountry]);

  // Securely compute selectedState to avoid "undefined" property errors
  const selectedState = useMemo(() => {
    if (!stateOptions.length && !formData?.location_state_county) return null;
    return stateOptions.find(s => s.value === formData?.location_state_county) || 
      (formData?.location_state_county ? { label: formData.location_state_county, value: formData.location_state_county } : null);
  }, [stateOptions, formData?.location_state_county]);

  // --- REACT-SELECT DARK MODE STYLING ---
  const selectStyles = useMemo(() => ({
    control: (base, state) => ({
      ...base,
      backgroundColor: isDark ? '#334155' : '#f9fafb',
      borderColor: state.isFocused ? '#3b82f6' : isDark ? '#475569' : '#e5e7eb',
      borderRadius: '0.75rem',
      minHeight: '44px',
      fontSize: '0.875rem',
      fontWeight: '700',
      boxShadow: state.isFocused ? '0 0 0 2px rgba(59, 130, 246, 0.1)' : 'none',
      '&:hover': { borderColor: isDark ? '#64748b' : '#d1d5db' },
    }),
    menu: (base) => ({
      ...base,
      zIndex: 9999,
      borderRadius: '0.75rem',
      overflow: 'hidden',
      backgroundColor: isDark ? '#1e293b' : 'white',
      borderColor: isDark ? '#334155' : '#e5e7eb',
    }),
    singleValue: (base) => ({
      ...base,
      color: isDark ? '#f8fafc' : '#1f2937',
    }),
    input: (base) => ({
      ...base,
      color: isDark ? '#f8fafc' : '#1f2937',
    }),
    placeholder: (base) => ({
      ...base,
      color: isDark ? '#94a3b8' : '#9ca3af',
    }),
    option: (base, state) => ({
      ...base,
      fontSize: '0.875rem',
      fontWeight: '600',
      color: state.isSelected ? 'white' : isDark ? '#f1f5f9' : '#1f2937',
      backgroundColor: state.isSelected 
        ? '#3b82f6' 
        : state.isFocused 
          ? (isDark ? '#334155' : '#eff6ff') 
          : (isDark ? '#1e293b' : 'white'),
    })
  }), [isDark]);

  return (
    <form 
      onSubmit={(e) => {
        e.preventDefault();
        handleSave(e);
      }} 
      className="flex flex-col gap-3 md:gap-4"
    >
      
      {/* --- PERSONAL INFO --- */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 pb-3 mb-1 border-b border-gray-100 dark:border-slate-700/60">
        <div className="flex flex-col">
          <label className="text-[9px] md:text-[10px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest ml-1 mb-1">First Name</label>
          <input 
            type="text"
            required
            maxLength={50}
            className="p-3 bg-gray-50 dark:bg-slate-700/60 border border-gray-200 dark:border-slate-600 rounded-lg md:rounded-xl text-xs md:text-sm font-bold text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none transition min-h-[44px]"
            value={formData?.first_name || ''}
            onChange={(e) => handleInputChange('first_name', e.target.value)}
          />
        </div>
        <div className="flex flex-col">
          <label className="text-[9px] md:text-[10px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest ml-1 mb-1">Last Name</label>
          <input 
            type="text"
            required
            maxLength={50}
            className="p-3 bg-gray-50 dark:bg-slate-700/60 border border-gray-200 dark:border-slate-600 rounded-lg md:rounded-xl text-xs md:text-sm font-bold text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none transition min-h-[44px]"
            value={formData?.last_name || ''}
            onChange={(e) => handleInputChange('last_name', e.target.value)}
          />
        </div>
        <div className="flex flex-col col-span-2">
          <label className="text-[9px] md:text-[10px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest ml-1 mb-1">Email</label>
          <input 
            type="email"
            required
            className="p-3 bg-gray-50 dark:bg-slate-700/60 border border-gray-200 dark:border-slate-600 rounded-lg md:rounded-xl text-xs md:text-sm font-bold text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none transition min-h-[44px]"
            value={formData?.email || ''}
            onChange={(e) => handleInputChange('email', e.target.value)}
          />
        </div>
      </div>

      {/* --- BUSINESS DETAILS --- */}
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        <div className="flex flex-col col-span-2">
          <label className="text-[9px] md:text-[10px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest ml-1 mb-1">Public Display Name</label>
          <input 
            type="text"
            required
            maxLength={50}
            placeholder="e.g. John's Photography"
            className="p-3 bg-gray-50 dark:bg-slate-700/60 border border-gray-200 dark:border-slate-600 rounded-lg md:rounded-xl text-xs md:text-sm font-bold text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none transition min-h-[44px]"
            value={formData?.whatsapp_name || ''}
            onChange={(e) => handleInputChange('whatsapp_name', e.target.value)}
          />
        </div>

        <div className="flex flex-col col-span-2">
          <label className="text-[9px] md:text-[10px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest ml-1 mb-1">Category</label>
          <select 
            required
            className="p-3 bg-gray-50 dark:bg-slate-700/60 border border-gray-200 dark:border-slate-600 rounded-lg md:rounded-xl text-xs md:text-sm font-bold text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none transition min-h-[44px] appearance-none"
            value={formData?.category || ''}
            onChange={(e) => handleInputChange('category', e.target.value)}
          >
            <option value="" className="dark:bg-slate-800 dark:text-gray-300">Select a category...</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id} className="dark:bg-slate-800 dark:text-gray-100">{cat.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-[9px] md:text-[10px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest ml-1 mb-1">Country</label>
          <Select
            options={countryOptions}
            value={selectedCountry}
            styles={selectStyles}
            onChange={(opt) => setFormData({...formData, location_country: opt?.name || '', location_state_county: ''})}
            placeholder="Select..."
          />
        </div>
        
        <div className="flex flex-col">
          <label className="text-[9px] md:text-[10px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest ml-1 mb-1">City/State</label>
          <Select
            options={stateOptions}
            value={selectedState}
            styles={selectStyles}
            isDisabled={!selectedCountry}
            onChange={(opt) => setFormData({...formData, location_state_county: opt?.value || ''})}
            placeholder="Select..."
          />
        </div>

        <div className="flex flex-col">
          <label className="text-[9px] md:text-[10px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest ml-1 mb-1">Gender</label>
          <select 
            className="p-3 bg-gray-50 dark:bg-slate-700/60 border border-gray-200 dark:border-slate-600 rounded-lg md:rounded-xl text-xs md:text-sm font-bold text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none transition min-h-[44px]"
            value={formData?.gender || ''}
            onChange={(e) => handleInputChange('gender', e.target.value)}
            required
          >
            <option value="" className="dark:bg-slate-800 dark:text-gray-300">Select...</option>
            <option value="M" className="dark:bg-slate-800 dark:text-gray-100">Male</option>
            <option value="F" className="dark:bg-slate-800 dark:text-gray-100">Female</option>
            <option value="O" className="dark:bg-slate-800 dark:text-gray-100">Other</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-[9px] md:text-[10px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest ml-1 mb-1">Age Range</label>
          <select 
            className="p-3 bg-gray-50 dark:bg-slate-700/60 border border-gray-200 dark:border-slate-600 rounded-lg md:rounded-xl text-xs md:text-sm font-bold text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none transition min-h-[44px]"
            value={formData?.age_range || ''}
            onChange={(e) => handleInputChange('age_range', e.target.value)}
            required
          >
            <option value="" className="dark:bg-slate-800 dark:text-gray-300">Select...</option>
            {["18-24", "25-29", "30-34", "35-39", "40-44", "45-49", "50-54", "55+"].map(range => (
              <option key={range} value={range} className="dark:bg-slate-800 dark:text-gray-100">{range}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col col-span-2">
          <div className="flex justify-between items-end ml-1 mb-1">
            <label className="text-[9px] md:text-[10px] font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest">Short Bio</label>
            <span className="text-[9px] text-gray-400 dark:text-slate-400 font-medium">{formData?.bio?.length || 0}/120</span>
          </div>
          <textarea 
            maxLength={120}
            rows={2}
            required
            placeholder="Tell people about what you do..."
            className="p-3 bg-gray-50 dark:bg-slate-700/60 border border-gray-200 dark:border-slate-600 rounded-lg md:rounded-xl text-xs md:text-sm font-medium text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 resize-none focus:ring-2 focus:ring-blue-500 outline-none transition"
            value={formData?.bio || ''}
            onChange={(e) => handleInputChange('bio', e.target.value)}
          />
        </div>
      </div>

      {/* --- ACTIONS --- */}
      <div className="flex items-center gap-3 mt-4 mb-2">
        {originalData?.is_profile_complete && (
          <button 
            type="button" 
            onClick={handleCancel}
            disabled={saving}
            className="flex items-center justify-center p-3 text-gray-500 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-600 transition-all active:scale-95 disabled:opacity-50 min-w-[50px]"
          >
            <X size={20} />
          </button>
        )}
        <button 
          type="submit" 
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-black text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 active:scale-[0.98] disabled:opacity-50"
        >
          <Save size={18} />
          {saving ? "SAVING..." : "SAVE PROFILE"}
        </button>
      </div>
    </form>
  );
};

export default ProfileForm;
import { useEffect } from 'react';
import { X, CheckCircle2, ArrowRight } from 'lucide-react';
import { Country, State } from 'country-state-city';

const JoinPoolModal = ({ 
  show, onClose, poolToJoin,
  filteredCategories, selectedCategory, setSelectedCategory,
  selectedCountry, setSelectedCountry, selectedState, setSelectedState,
  selectedAge, setSelectedAge, selectedGender, setSelectedGender,
  AGE_CHOICES, GENDER_CHOICES, onConfirm, isSubmitting = false
}) => {

  const sortedCategories = [...filteredCategories].sort((a, b) => {
    if (a.name.toLowerCase() === 'general') return -1;
    if (b.name.toLowerCase() === 'general') return 1;
    return 0;
  });

  useEffect(() => {
    if (show && sortedCategories.length > 0 && !selectedCategory) {
      setSelectedCategory(sortedCategories[0]);
    }
  }, [show, sortedCategories, selectedCategory, setSelectedCategory]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh] transition-colors">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/40">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-gray-100">
              {poolToJoin?.type === 'filtered' ? 'Set Target Filters' : 'Select Category'}
            </h3>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide font-black mt-0.5">
              Pool: {poolToJoin?.type} • {poolToJoin?.count} Contacts
            </p>
          </div>
          <button 
            onClick={onClose} 
            disabled={isSubmitting}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-4 flex-1 overflow-y-auto space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
              Who do you want to connect with?
            </label>
            
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1 border border-gray-100 dark:border-slate-800 rounded-xl p-1 bg-gray-50/50 dark:bg-slate-800/30">
              {sortedCategories.length > 0 ? sortedCategories.map(category => (
                <button 
                  key={category.id} 
                  disabled={isSubmitting}
                  onClick={() => setSelectedCategory(category)} 
                  className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-all flex justify-between items-center ${
                    selectedCategory?.id === category.id 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 font-bold' 
                      : 'border-transparent text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-slate-800'
                  }`}
                >
                  {category.name}
                  {selectedCategory?.id === category.id && <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                </button>
              )) : (
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">No categories available</p>
              )}
            </div>
          </div>

          {/* Advanced Filters */}
          {poolToJoin?.type === 'filtered' && (
            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-2 duration-300">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                  2. Location Details
                </label>
                <div className="flex gap-2">
                  <select 
                    value={selectedCountry} 
                    disabled={isSubmitting}
                    onChange={e => {
                      setSelectedCountry(e.target.value);
                      setSelectedState('');
                    }} 
                    className="w-1/2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-gray-100 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value="" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100">Select Country</option>
                    {Country.getAllCountries().map(country => (
                      <option key={country.isoCode} value={country.isoCode} className="bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100">
                        {country.name}
                      </option>
                    ))}
                  </select>

                  <select 
                    value={selectedState} 
                    onChange={e => setSelectedState(e.target.value)} 
                    disabled={!selectedCountry || isSubmitting} 
                    className="w-1/2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-gray-100 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100">Select State</option>
                    {selectedCountry && State.getStatesOfCountry(selectedCountry).map(state => (
                      <option key={state.isoCode} value={state.isoCode} className="bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100">
                        {state.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-1/2">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Age Range</label>
                  <select 
                    value={selectedAge} 
                    disabled={isSubmitting}
                    onChange={e => setSelectedAge(e.target.value)} 
                    className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-gray-100 rounded-xl py-2 px-3 text-sm focus:outline-none"
                  >
                    <option value="" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100">Any</option>
                    {AGE_CHOICES.map(age => (
                      <option key={age} value={age} className="bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100">{age}</option>
                    ))}
                  </select>
                </div>
                
                <div className="w-1/2">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Gender</label>
                  <select 
                    value={selectedGender} 
                    disabled={isSubmitting}
                    onChange={e => setSelectedGender(e.target.value)} 
                    className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-gray-100 rounded-xl py-2 px-3 text-sm focus:outline-none"
                  >
                    <option value="" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100">Any</option>
                    {GENDER_CHOICES.map(g => (
                      <option key={g.value} value={g.value} className="bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100">{g.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/40">
          <button 
            disabled={!selectedCategory || isSubmitting} 
            onClick={onConfirm} 
            className={`w-full py-2.5 text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-colors ${
              !selectedCategory || isSubmitting
                ? 'bg-gray-200 dark:bg-slate-800 text-gray-400 dark:text-slate-500 cursor-not-allowed' 
                : poolToJoin?.type === 'filtered' 
                  ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
            }`}
          >
            {isSubmitting ? 'Joining Pool...' : 'Confirm Category'} <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};

export default JoinPoolModal;
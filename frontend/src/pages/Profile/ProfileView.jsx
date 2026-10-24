import React from 'react';
import { Edit2, Briefcase, MapPin, User as UserIcon, Calendar } from 'lucide-react';

const ProfileView = ({ formData, getCategoryName, setIsEditing }) => {
  return (
    <div className="flex flex-col w-full h-full">
      
      <div className="hidden md:flex justify-end mb-4">
        <button 
          onClick={() => setIsEditing(true)}
          className="flex items-center justify-center gap-2 bg-gray-900 dark:bg-blue-600 text-white px-5 py-2.5 min-h-[44px] rounded-full text-sm font-bold hover:bg-gray-800 dark:hover:bg-blue-500 transition shadow-md hover:shadow-lg active:scale-95"
        >
          <Edit2 size={16} /> Edit Profile
        </button>
      </div>

      <div className="flex flex-col gap-4 md:gap-6 h-full justify-center">
        
        <div className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-y-6 md:gap-x-10">
          
          <div className="flex items-center gap-3 md:items-start md:gap-4">
            <div className="p-2 md:p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg shrink-0">
              <Briefcase size={16} className="md:w-5 md:h-5" />
            </div>
            <div className="flex-1 flex items-center justify-between md:flex-col md:items-start min-w-0 border-b border-gray-50 dark:border-slate-700/50 md:border-none pb-2 md:pb-0">
              <p className="text-[9px] md:text-xs font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest md:mb-1">Category</p>
              <p className="font-bold text-gray-900 dark:text-gray-100 text-xs md:text-base truncate text-right md:text-left pl-2 md:pl-0">{getCategoryName()}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 md:items-start md:gap-4">
            <div className="p-2 md:p-3 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg shrink-0">
              <MapPin size={16} className="md:w-5 md:h-5" />
            </div>
            <div className="flex-1 flex items-center justify-between md:flex-col md:items-start min-w-0 border-b border-gray-50 dark:border-slate-700/50 md:border-none pb-2 md:pb-0">
              <p className="text-[9px] md:text-xs font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest md:mb-1">Location</p>
              <p className="font-bold text-gray-900 dark:text-gray-100 text-xs md:text-base truncate text-right md:text-left pl-2 md:pl-0">
                {[formData.location_state_county, formData.location_country].filter(Boolean).join(', ') || '-'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 md:items-start md:gap-4">
            <div className="p-2 md:p-3 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg shrink-0">
              <UserIcon size={16} className="md:w-5 md:h-5" />
            </div>
            <div className="flex-1 flex items-center justify-between md:flex-col md:items-start min-w-0 border-b border-gray-50 dark:border-slate-700/50 md:border-none pb-2 md:pb-0">
              <p className="text-[9px] md:text-xs font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest md:mb-1">Gender</p>
              <p className="font-bold text-gray-900 dark:text-gray-100 text-xs md:text-base truncate text-right md:text-left pl-2 md:pl-0">
                {formData.gender === 'M' ? 'Male' : formData.gender === 'F' ? 'Female' : formData.gender === 'O' ? 'Other' : '-'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 md:items-start md:gap-4">
            <div className="p-2 md:p-3 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg shrink-0">
              <Calendar size={16} className="md:w-5 md:h-5" />
            </div>
            <div className="flex-1 flex items-center justify-between md:flex-col md:items-start min-w-0 border-b border-gray-50 dark:border-slate-700/50 md:border-none pb-2 md:pb-0">
              <p className="text-[9px] md:text-xs font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest md:mb-1">Age Range</p>
              <p className="font-bold text-gray-900 dark:text-gray-100 text-xs md:text-base truncate text-right md:text-left pl-2 md:pl-0">{formData.age_range || '-'}</p>
            </div>
          </div>
        </div>

        {formData.bio && (
          <div className="p-4 md:p-5 bg-gray-50 dark:bg-slate-700/40 rounded-xl border border-gray-100 dark:border-slate-700 mt-1 md:mt-0 transition-colors">
            <p className="text-[9px] md:text-xs font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest mb-1.5">About</p>
            <p className="text-gray-700 dark:text-gray-300 text-xs md:text-sm leading-relaxed break-words">{formData.bio}</p>
          </div>
        )}

      </div>
    </div>
  );
};

export default ProfileView;
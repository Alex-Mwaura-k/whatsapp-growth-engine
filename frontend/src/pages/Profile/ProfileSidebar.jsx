import React, { useState, useRef, useEffect } from 'react';
import { User, Camera, Edit2, Settings, Upload, Trash2 } from 'lucide-react';

const ProfileSidebar = ({ 
  formData, 
  imagePreview, 
  isEditing, 
  setIsEditing, 
  handleFileSelect, 
  getCategoryName,
  setIsViewingImage,
  setIsSettingsOpen,
  handleRemovePhoto
}) => {
  const [isPhotoMenuOpen, setIsPhotoMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close the photo menu if the user clicks outside of it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsPhotoMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative bg-gray-50/50 dark:bg-slate-800/50 p-5 md:p-6 flex items-center md:flex-col md:items-center gap-4 border-b md:border-b-0 md:border-r border-gray-100 dark:border-slate-700 md:w-[35%] shrink-0 transition-colors">

      {/* --- AVATAR SECTION --- */}
      <div className="relative group shrink-0">
        <div 
          onClick={() => imagePreview && setIsViewingImage && setIsViewingImage(true)}
          className={`w-16 h-16 md:w-36 md:h-36 rounded-full border-2 md:border-4 border-white dark:border-slate-800 shadow-sm md:shadow-lg overflow-hidden bg-gray-200 dark:bg-slate-700 flex items-center justify-center transition ${imagePreview ? 'cursor-pointer hover:opacity-90 hover:scale-105 duration-300' : ''}`}
          title={imagePreview ? "Click to view full image" : ""}
        >
          {imagePreview ? (
            <img src={imagePreview} alt="User Profile Avatar" className="w-full h-full object-cover" />
          ) : (
            <User className="w-8 h-8 md:w-16 md:h-16 text-gray-400 dark:text-slate-400" aria-label="Default avatar icon" />
          )}
        </div>
        
        {/* Camera Upload Button & Menu (Only shows when editing) */}
        {isEditing && (
          <div className="absolute -bottom-1 -right-1 md:bottom-2 md:right-2" ref={menuRef}>
            {!imagePreview ? (
              <label htmlFor="profile_pic_upload" className="bg-blue-600 text-white p-2 md:p-3 rounded-full cursor-pointer hover:bg-blue-700 active:scale-95 transition-all shadow-lg border-2 border-white dark:border-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center">
                <Camera size={16} className="md:w-5 md:h-5" />
                <input 
                  id="profile_pic_upload" 
                  type="file" 
                  className="hidden" 
                  accept="image/jpeg, image/png, image/webp" 
                  onChange={handleFileSelect} 
                />
              </label>
            ) : (
              <div className="relative">
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPhotoMenuOpen(!isPhotoMenuOpen);
                  }} 
                  className="bg-blue-600 text-white p-2 md:p-3 rounded-full cursor-pointer hover:bg-blue-700 active:scale-95 transition-all shadow-lg border-2 border-white dark:border-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Manage photo"
                  aria-expanded={isPhotoMenuOpen}
                >
                  <Camera size={16} className="md:w-5 md:h-5" />
                </button>
                
                {/* Photo Action Dropdown Menu */}
                {isPhotoMenuOpen && (
                  <div className="absolute top-full right-0 md:left-1/2 md:-translate-x-1/2 mt-2 w-44 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden z-20 animate-in fade-in zoom-in-95">
                    <label className="flex items-center gap-2 px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer text-sm font-bold text-gray-700 dark:text-gray-200 w-full transition">
                      <Upload size={16} className="text-blue-500 dark:text-blue-400" /> Upload New
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/jpeg, image/png, image/webp" 
                        onChange={(e) => {
                          setIsPhotoMenuOpen(false);
                          handleFileSelect(e);
                        }} 
                      />
                    </label>
                    <button 
                      type="button" 
                      onClick={() => {
                        setIsPhotoMenuOpen(false);
                        handleRemovePhoto();
                      }} 
                      className="flex items-center gap-2 px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer text-sm font-bold text-red-600 dark:text-red-400 w-full text-left transition border-t border-gray-50 dark:border-slate-700"
                    >
                      <Trash2 size={16} /> Remove Photo
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* --- USER INFO SECTION --- */}
      <div className="flex flex-1 w-full items-center justify-between min-w-0 md:mt-2 gap-2">
        
        <div className="flex flex-col flex-1 min-w-0 justify-center">
          <h1 className="text-lg md:text-2xl font-black text-gray-900 dark:text-gray-100 leading-tight truncate w-full text-left">
            {formData.whatsapp_name || "New User"}
          </h1>
          <p className="text-blue-600 dark:text-blue-400 font-bold text-[10px] md:text-xs uppercase tracking-wide truncate w-full text-left mt-0.5 md:mt-1">
            {getCategoryName()}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          
          {/* Settings Button */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center justify-center bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white min-h-[44px] min-w-[44px] rounded-full transition-all active:scale-95 shadow-sm"
            aria-label="Account Settings"
          >
            <Settings size={18} />
          </button>

          {/* Mobile Edit Button */}
          {!isEditing && (
            <button 
              onClick={() => setIsEditing(true)}
              className="md:hidden flex items-center justify-center gap-1 bg-gray-900 dark:bg-blue-600 text-white px-4 py-2 min-h-[44px] rounded-full text-[10px] font-bold shadow-sm active:scale-95 shrink-0"
            >
              <Edit2 size={12} /> EDIT
            </button>
          )}
          
        </div>
        
      </div>

    </div>
  );
};

export default ProfileSidebar;
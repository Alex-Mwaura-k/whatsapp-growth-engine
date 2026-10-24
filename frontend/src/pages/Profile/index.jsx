import { useState, useEffect } from 'react';
import api from '../../api';
import { useAuth } from '../../context/useAuth';
import { X, ZoomIn } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import Cropper from 'react-easy-crop';
import Toast from '../../components/Toast';

import ProfileSidebar from './ProfileSidebar';
import ProfileView from './ProfileView';
import ProfileForm from './ProfileForm';
import ReferralCard from './ReferralCard';
import ProfileSettings from './ProfileSettings';
import GrowthBanner from '../../components/GrowthBanner';

// --- HELPER FUNCTIONS FOR CROPPING ---
const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

async function getCroppedImg(imageSrc, pixelCrop) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  canvas.width = 500;
  canvas.height = 500;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    500,
    500
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) return;
      blob.name = 'cropped.jpg';
      resolve(blob);
    }, 'image/jpeg', 0.95);
  });
}

const Profile = () => {
  const { user, refreshUser } = useAuth(); 

  const [categories, setCategories] = useState([]);
  const [telemetry, setTelemetry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [toast, setToast] = useState(null); 
  
  const [isEditing, setIsEditing] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [isViewingImage, setIsViewingImage] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const [copied, setCopied] = useState(false);

  const [originalData, setOriginalData] = useState(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    gender: '',
    age_range: '',
    location_country: '',
    location_state_county: '',
    bio: '',
    category: '',
    whatsapp_name: '',
    profile_pic: null
  });

  useEffect(() => {
    if (!user) return;

    // Fetch categories and pool status directly matching core/urls.py
    Promise.all([
      api.get('/categories/'),
      api.get('/pools/status/').catch((err) => {
        console.error("Pool status fetch error:", err);
        return { data: null };
      })
    ])
      .then(([catRes, poolRes]) => {
        setCategories(catRes.data);
        if (poolRes?.data) setTelemetry(poolRes.data);
        
        const initialData = {
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          email: user.email || '',
          gender: user.gender || '',
          age_range: user.age_range || '',
          location_country: user.location_country || '',
          location_state_county: user.location_state_county || '',
          bio: user.bio || '',
          category: user.category || '',
          whatsapp_name: user.whatsapp_name || '',
          profile_pic: user.profile_pic || null,
          referral_code: user.referral_code || '' 
        };

        setFormData(initialData);
        setOriginalData({ ...initialData, is_profile_complete: user.is_profile_complete });

        if (user.profile_pic) setImagePreview(user.profile_pic);
        if (!user.is_profile_complete) setIsEditing(true);
        setLoading(false);
      })
      .catch(err => console.error("Error loading profile data", err));
  }, [user]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validImageTypes.includes(file.type)) {
      setToast({ type: 'error', message: "Please upload a valid image file (JPG, PNG, WEBP)." });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = null; 
  };

  const onCropComplete = (croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleCropSave = async () => {
    try {
      const croppedBlob = await getCroppedImg(imageToCrop, croppedAreaPixels);
      const croppedFile = new File([croppedBlob], 'profile_pic.jpg', { type: 'image/jpeg' });

      const options = {
        maxSizeMB: 0.2,             
        maxWidthOrHeight: 500,      
        useWebWorker: true,
        fileType: 'image/jpeg'      
      };
      
      const compressedBlob = await imageCompression(croppedFile, options);
      const finalFile = new File([compressedBlob], 'profile_pic.jpg', {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });

      setFormData({ ...formData, profile_pic: finalFile });
      setImagePreview(URL.createObjectURL(finalFile));
      
      setCropModalOpen(false);
      setImageToCrop(null);
      setZoom(1);
    } catch (error) {
      console.error("Cropping/Compression Error:", error);
      setToast({ type: 'error', message: "Failed to process image." });
    }
  };

  const handleRemovePhoto = async () => {
    if (!window.confirm("Are you sure you want to remove your profile photo?")) return;
    
    try {
      setSaving(true);
      const data = new FormData();
      data.append('profile_pic', ''); 
      
      await api.patch('/profile/', data);
      
      setFormData({ ...formData, profile_pic: null });
      setImagePreview(null);
      
      await refreshUser();

      setToast({ type: 'success', message: "Photo removed successfully." });
    } catch (err) {
      console.error("Error removing photo:", err);
      setToast({ type: 'error', message: "Failed to remove photo." });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(originalData);
    setImagePreview(originalData.profile_pic);
    setIsEditing(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const requiredFields = ['first_name', 'last_name', 'email', 'whatsapp_name', 'category', 'location_country', 'location_state_county', 'gender', 'age_range', 'bio'];
    const missing = requiredFields.filter(field => !formData[field] || String(formData[field]).trim() === '');
    
    if (missing.length > 0) {
      setToast({ type: 'error', message: "Please fill in all required fields." });
      return;
    }

    setSaving(true);

    const data = new FormData();
    Object.keys(formData).forEach(key => {
      if (key === 'profile_pic') {
        if (formData.profile_pic instanceof File) {
          data.append('profile_pic', formData.profile_pic);
        }
      } else if (formData[key] !== null && key !== 'referral_code') {
        data.append(key, String(formData[key]).trim());
      }
    });
    
    data.append('is_profile_complete', 'true');

    try {
      await api.patch('/profile/', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      await refreshUser();

      setOriginalData({ ...formData, is_profile_complete: true, referral_code: originalData.referral_code });
      setIsEditing(false);
      
      setToast({ type: 'success', message: "Identity Updated Successfully!" });
      
    } catch (err) {
      console.error("Backend Error occurred during save.", err);
      setToast({ type: 'error', message: "Update failed. Please check your details." });
    } finally {
      setSaving(false);
    }
  };

  const getCategoryName = () => {
    const cat = categories.find(c => String(c.id) === String(formData.category));
    return cat ? cat.name : 'Not Specified';
  };

  const referralLink = originalData?.referral_code 
    ? `${window.location.origin}/register?ref=${originalData.referral_code}` 
    : '';

  const handleCopy = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!referralLink) return;
    
    const shareData = {
      title: 'Join me on Growth Engine',
      text: 'Get targeted business leads directly to your WhatsApp! Use my invite link to get started:',
      url: referralLink
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('User cancelled share or share failed', err);
      }
    } else {
      const text = encodeURIComponent(`${shareData.text} ${shareData.url}`);
      window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank', 'noopener,noreferrer');
    }
  };

  if (loading) return <div className="flex h-[50vh] items-center justify-center font-black text-blue-600 dark:text-blue-400 italic">Syncing Profile...</div>;

  return (
    <div className="flex flex-col w-full h-full animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      {/* FULL SCREEN IMAGE VIEWER MODAL */}
      {isViewingImage && imagePreview && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-sm cursor-zoom-out"
          onClick={() => setIsViewingImage(false)}
        >
          <button 
            aria-label="Close image viewer"
            className="absolute top-4 right-4 md:top-8 md:right-8 text-gray-400 hover:text-white transition bg-gray-900/50 p-2 rounded-full z-10"
          >
            <X size={24} />
          </button>
          <img 
            src={imagePreview} 
            alt="Full size profile preview" 
            className="w-auto h-auto max-w-[300px] md:max-w-[500px] max-h-[80vh] rounded-2xl object-contain shadow-2xl cursor-default border-4 border-gray-800 bg-gray-900"
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}

      {/* CROPPER MODAL */}
      {cropModalOpen && imageToCrop && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/95 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md bg-gray-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-gray-800">
            
            <div className="p-4 border-b border-gray-800 flex justify-between items-center">
              <h3 className="text-white font-bold text-sm uppercase tracking-wider">Position Photo</h3>
              <button aria-label="Close image cropper" onClick={() => setCropModalOpen(false)} className="text-gray-400 hover:text-white p-2 min-w-[44px] min-h-[44px] flex items-center justify-center">
                <X size={20} />
              </button>
            </div>

            <div className="relative w-full h-[400px] bg-black">
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={1} 
                cropShape="round" 
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>

            <div className="p-4 md:p-6 flex flex-col gap-4 bg-gray-900">
              <div className="flex items-center gap-3 text-gray-400">
                <ZoomIn size={18} />
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-label="Zoom image"
                  onChange={(e) => setZoom(e.target.value)}
                  className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setCropModalOpen(false)} 
                  className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold transition active:scale-95 text-sm min-h-[48px]"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCropSave} 
                  className="flex-[2] py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition active:scale-[0.98] shadow-lg shadow-blue-900/20 text-sm uppercase tracking-wide min-h-[48px]"
                >
                  Crop & Save
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Main card wrapper */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col md:flex-row overflow-hidden w-full transition-colors">
        
        {/* LEFT COLUMN: Avatar & Name */}
        <ProfileSidebar 
           formData={formData}
           imagePreview={imagePreview}
           isEditing={isEditing}
           setIsEditing={setIsEditing}
           handleFileSelect={handleFileSelect}
           getCategoryName={getCategoryName}
           setIsViewingImage={setIsViewingImage}
           setIsSettingsOpen={setIsSettingsOpen} 
           handleRemovePhoto={handleRemovePhoto} 
        />

        {/* RIGHT COLUMN: Form & Details */}
        <div className="p-5 md:p-6 flex-1 flex flex-col justify-center">
          {!isEditing ? (
            <ProfileView 
              formData={formData} 
              getCategoryName={getCategoryName} 
              setIsEditing={setIsEditing} 
            />
          ) : (
            <ProfileForm 
              formData={formData}
              setFormData={setFormData}
              categories={categories}
              handleSave={handleSave}
              handleCancel={handleCancel}
              saving={saving}
              originalData={originalData}
            />
          )}
        </div>
      </div>

      <ProfileSettings 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />

      {/* REFERRAL SECTION */}
      {originalData?.is_profile_complete && originalData?.referral_code && (
        <>
          <ReferralCard 
            referralLink={referralLink}
            handleCopy={handleCopy}
            handleShare={handleShare}
            copied={copied}
          />
          <GrowthBanner telemetry={telemetry} />
        </>
      )}
    </div>
  );
};

export default Profile;
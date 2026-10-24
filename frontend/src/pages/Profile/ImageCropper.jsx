import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X, Check } from 'lucide-react';

const ImageCropper = ({ imageSrc, onCropComplete, onCancel }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropChange = (crop) => {
    setCrop(crop);
  };

  const onZoomChange = (zoom) => {
    setZoom(zoom);
  };

  const handleCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    // We store the pixel values to do the actual cropping when the user clicks "Apply"
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = () => {
    // Pass the exact crop coordinates back to the parent to generate the final image
    onCropComplete(croppedAreaPixels);
  };

  if (!imageSrc) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* --- HEADER --- */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="text-sm md:text-base font-black text-gray-900 uppercase tracking-wide">
            Adjust Profile Picture
          </h3>
          <button 
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors active:scale-95"
            aria-label="Cancel cropping"
          >
            <X size={20} />
          </button>
        </div>

        {/* --- CROPPER AREA --- */}
        <div className="relative w-full h-[300px] md:h-[400px] bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round" // Creates a circular mask to visualize the avatar
            showGrid={false}
            onCropChange={onCropChange}
            onCropComplete={handleCropComplete}
            onZoomChange={onZoomChange}
          />
        </div>

        {/* --- CONTROLS & FOOTER --- */}
        <div className="p-4 md:p-5 flex flex-col gap-5 bg-gray-50">
          
          {/* Zoom Slider */}
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest w-10">
              Zoom
            </span>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(e.target.value)}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={onCancel}
              className="flex-1 py-3 md:py-3.5 text-xs md:text-sm font-black text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-gray-700 transition-colors active:scale-95 shadow-sm"
            >
              CANCEL
            </button>
            <button
              onClick={handleSave}
              className="flex-[2] flex items-center justify-center gap-2 py-3 md:py-3.5 text-xs md:text-sm font-black text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 active:scale-95"
            >
              <Check size={18} />
              APPLY CROP
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ImageCropper;
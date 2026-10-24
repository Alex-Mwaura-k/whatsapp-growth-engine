import React, { useState } from 'react';
import { Copy, Share2, Check } from 'lucide-react';
import Toast from '../../components/Toast';

const ReferralCard = ({ referralLink, handleCopy, handleShare, copied }) => {
  const [showToast, setShowToast] = useState(false);

  if (!referralLink) return null;

  const onCopyClick = () => {
    if (handleCopy) handleCopy();
    setShowToast(true);
  };

  return (
    <>
      {showToast && (
        <Toast 
          message="Referral link copied to clipboard!" 
          type="success" 
          onClose={() => setShowToast(false)} 
        />
      )}

      <div className="mt-6 md:mt-8 w-full shrink-0">
        <div className="p-4 md:p-5 bg-blue-50/50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/50 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 transition-colors">
          
          {/* Text Section */}
          <div>
            <h2 className="text-xs md:text-sm font-black text-blue-900 dark:text-blue-300 mb-0.5 md:mb-1 uppercase tracking-wider">
              Referral Link
            </h2>
            <p className="text-[10px] md:text-xs text-blue-700 dark:text-blue-400 font-medium">
              Invite friends to earn tokens for free downloads.
            </p>
          </div>

          {/* Link and Buttons Section */}
          <div className="flex items-center gap-2 md:w-1/2">
            
            {/* Link Display */}
            <div className="flex-1 bg-white dark:bg-slate-800 border border-blue-200 dark:border-slate-700 rounded-lg p-2.5 md:p-3 overflow-hidden shadow-sm min-h-[44px] flex items-center transition-colors">
              <p className="text-[10px] md:text-xs text-gray-600 dark:text-gray-300 font-medium truncate select-all">
                {referralLink}
              </p>
            </div>

            {/* Copy Button */}
            <button 
              onClick={onCopyClick}
              className="p-2.5 md:p-3 bg-white dark:bg-slate-800 border border-blue-200 dark:border-slate-700 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 transition-all shadow-sm min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95"
              aria-label="Copy referral link"
              title="Copy Link"
            >
              {copied ? <Check size={18} className="text-green-600 dark:text-green-400" /> : <Copy size={18} />}
            </button>

            {/* Share Button */}
            <button 
              onClick={handleShare}
              className="p-2.5 md:p-3 bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 text-white transition-all shadow-sm min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95"
              aria-label="Share referral link"
              title="Share Link"
            >
              <Share2 size={18} />
            </button>

          </div>
        </div>
      </div>
    </>
  );
};

export default ReferralCard;
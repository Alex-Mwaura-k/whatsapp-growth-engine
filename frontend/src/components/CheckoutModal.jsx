import React, { useState, useEffect } from 'react';
import { useMpesaCheckout } from '../hooks/useMpesaCheckout';

export const CheckoutModal = ({ isOpen, onClose, batch, breakdown, onUnlockSuccess }) => {
  const [phoneNumber, setPhoneNumber] = useState(batch?.user_phone || '');

  const { startCheckout, resumeCheckoutIfPending, loading, statusMessage, statusType } = useMpesaCheckout(
    (data) => {
      setTimeout(() => {
        if (onUnlockSuccess) onUnlockSuccess(data);
        if (onClose) onClose();
      }, 1500);
    },
    (err) => console.error('Checkout error:', err)
  );

  const batchId = batch?.batch_id || batch?.id;

  useEffect(() => {
    if (isOpen && batchId) {
      resumeCheckoutIfPending(batchId);
    }
  }, [isOpen, batchId, resumeCheckoutIfPending]);

  if (!isOpen || !breakdown) return null;

  const basePrice = Number(
    breakdown?.base_price ??
    breakdown?.base_price_kes ??
    breakdown?.full_cash_price ??
    0
  );

  const netAmount = Number(
    breakdown?.net_cash_required ??
    breakdown?.net_amount ??
    0
  );

  const discountAmount = Number(
    breakdown?.discount_amount ??
    breakdown?.token_discount_cash ??
    breakdown?.discount ??
    breakdown?.referral_discount ??
    breakdown?.discount_value_kes ??
    Math.max(0, basePrice - netAmount)
  );

  const tokensUsed = breakdown?.tokens_used ?? 0;
  const isFullyCovered = breakdown?.is_fully_covered_by_tokens ?? (netAmount === 0);

  const textColorClass = statusType === 'error'
    ? 'text-red-600 dark:text-red-400 font-semibold'
    : 'text-emerald-600 dark:text-emerald-400 font-semibold';

  const handleConfirmCheckout = (e) => {
    e.preventDefault();
    startCheckout({
      batchId: batch?.batch_id || batch?.id,
      phoneNumber: phoneNumber,
      targetSize: batch?.target_size || 20
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900 dark:text-white">
        
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">
            {isFullyCovered ? 'Free Unlock Available' : 'Unlock Contact Batch'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
            aria-label="Close modal"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-2 rounded-xl bg-gray-50 p-4 dark:bg-gray-800 text-sm mb-6">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-300">Base Price</span>
            <span className="font-medium">KES {basePrice.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
            <span>Referral Discount ({tokensUsed} Tokens)</span>
            <span>- KES {discountAmount.toFixed(2)}</span>
          </div>
          <hr className="border-gray-200 dark:border-gray-700 my-1" />
          <div className="flex justify-between text-base font-bold">
            <span>Net Amount Due</span>
            <span className="text-emerald-600 dark:text-emerald-400">KES {netAmount.toFixed(2)}</span>
          </div>
        </div>

        <form onSubmit={handleConfirmCheckout} className="space-y-4">
          {!isFullyCovered && (
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                M-Pesa Phone Number
              </label>
              <input
                type="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="0712345678"
                disabled={loading}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          )}

          {statusMessage && (
            <p className={`text-xs text-center ${textColorClass} ${loading ? 'animate-pulse' : ''}`}>
              {statusMessage}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Processing...' : isFullyCovered ? 'Unlock Free' : 'Pay via M-Pesa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
import { useCallback, useState, useRef, useEffect } from 'react';
import api from '../api';

const PENDING_KEY = 'growth_engine_pending_mpesa';

const savePendingCheckout = (batchId, checkoutRequestId) => {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(PENDING_KEY, JSON.stringify({ batchId, checkoutRequestId }));
};

export const clearPendingCheckout = () => {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(PENDING_KEY);
};

export const getPendingCheckout = () => {
  if (typeof window === 'undefined') return null;
  try {
    const data = sessionStorage.getItem(PENDING_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

export const sanitizeKenyanPhone = (phone) => {
  if (!phone) {
    return { isValid: false, formatted: '', error: 'Phone number is required.' };
  }

  let cleaned = phone.toString().replace(/[\s+-]/g, '');

  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.slice(1);
  } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
    cleaned = '254' + cleaned;
  }

  const isValid = /^254[71]\d{8}$/.test(cleaned);

  if (!isValid) {
    return {
      isValid: false,
      formatted: cleaned,
      error: 'Please enter a valid Safaricom phone number (e.g., 0712345678 or 0112345678).',
    };
  }

  return { isValid: true, formatted: cleaned, error: null };
};

export const useMpesaCheckout = (onSuccess, onError) => {
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState('info');
  const pollIntervalRef = useRef(null);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  }, [onSuccess, onError]);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const pollPaymentStatus = useCallback((checkoutRequestId) => {
    stopPolling();
    let attempts = 0;
    const maxAttempts = 60;

    pollIntervalRef.current = setInterval(async () => {
      attempts += 1;

      if (attempts > maxAttempts) {
        stopPolling();
        clearPendingCheckout();
        setLoading(false);
        const timeoutMsg = 'Payment verification timed out. Please check your transaction status.';
        setStatusMessage(timeoutMsg);
        setStatusType('error');
        if (onErrorRef.current) onErrorRef.current(timeoutMsg);
        return;
      }

      try {
        const response = await api.get(`payments/status/${checkoutRequestId}/`);
        const { status, mpesa_receipt, result_desc } = response.data;

        if (status === 'COMPLETED') {
          stopPolling();
          clearPendingCheckout();
          setLoading(false);
          setStatusMessage(`Payment Confirmed! Receipt: ${mpesa_receipt}`);
          setStatusType('success');
          if (onSuccessRef.current) onSuccessRef.current(response.data);
        } else if (status === 'FAILED' || status === 'CANCELLED') {
          stopPolling();
          clearPendingCheckout();
          setLoading(false);
          const errorMsg = result_desc || 'Payment failed or was cancelled.';
          setStatusMessage(errorMsg);
          setStatusType('error');
          if (onErrorRef.current) onErrorRef.current(errorMsg);
        } else {
          setStatusMessage('Waiting for PIN confirmation on your phone...');
          setStatusType('info');
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2000);
  }, [stopPolling]);

  const resumeCheckoutIfPending = useCallback((batchId) => {
    const pending = getPendingCheckout();
    if (pending && pending.batchId === batchId) {
      setLoading(true);
      setStatusMessage('Resuming previous payment verification...');
      setStatusType('info');
      pollPaymentStatus(pending.checkoutRequestId);
      return true;
    }
    return false;
  }, [pollPaymentStatus]);

  const startCheckout = async ({ batchId, phoneNumber, targetSize = 20 }) => {
    setLoading(true);

    const { isValid, formatted: formattedPhone, error } = sanitizeKenyanPhone(phoneNumber);
    if (!isValid) {
      setLoading(false);
      setStatusMessage(error);
      setStatusType('error');
      if (onError) onError(error);
      return;
    }

    setStatusMessage('Initiating STK Push...');
    setStatusType('info');

    try {
      const response = await api.post(
        'payments/stk-push/',
        {
          batch_id: batchId,
          phone_number: formattedPhone,
          target: targetSize,
        }
      );

      const data = response.data;

      if (data.is_free_or_token_covered || data.is_already_unlocked) {
        clearPendingCheckout();
        setLoading(false);
        setStatusMessage(data.message || 'Unlocked successfully!');
        setStatusType('success');
        if (onSuccess) onSuccess(data);
        return;
      }

      if (data.success && data.checkout_request_id) {
        savePendingCheckout(batchId, data.checkout_request_id);
        setStatusMessage(data.message || 'STK Push sent! Please enter your M-Pesa PIN on your phone.');
        setStatusType('info');
        pollPaymentStatus(data.checkout_request_id);
      } else {
        clearPendingCheckout();
        setLoading(false);
        setStatusMessage(data.message || 'Failed to initiate STK Push.');
        setStatusType('error');
        if (onError) onError(data.message);
      }
    } catch (err) {
      clearPendingCheckout();
      setLoading(false);
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Checkout failed.';
      setStatusMessage(msg);
      setStatusType('error');
      if (onError) onError(msg);
    }
  };

  return {
    startCheckout,
    resumeCheckoutIfPending,
    stopPolling,
    clearPendingCheckout,
    loading,
    statusMessage,
    statusType,
  };
};
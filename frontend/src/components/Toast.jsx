import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, X } from 'lucide-react';

const Toast = ({ message, type = 'success', onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Mount off-screen, then slide in smoothly 10ms later
    const showTimer = setTimeout(() => {
      setIsVisible(true);
    }, 10);

    // Trigger the slide-out animation after 2.5 seconds
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
    }, 2500);

    // Fully remove the component after the animation finishes
    const unmountTimer = setTimeout(() => {
      onClose();
    }, 2800); 

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      clearTimeout(unmountTimer);
    };
  }, [onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); 
  };

  const isSuccess = type === 'success';

  const toastContent = (
    <div className="fixed inset-x-0 top-2 z-[99999] pointer-events-none flex justify-center px-4 sm:px-8 overflow-hidden">
      
      {/* 1300px boundary container using Flexbox to align toast right */}
      <div className="w-full max-w-[1300px] flex justify-end">
        
        {/* Actual toast container */}
        <div 
          className={`pointer-events-auto w-[calc(100vw-2rem)] sm:w-auto sm:min-w-[280px] max-w-sm transition-all duration-300 ease-in-out ${
            isVisible 
              ? 'translate-x-0 opacity-100' 
              : 'translate-x-[150%] opacity-0' 
          }`}
        >
          <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl border transition-colors ${
            isSuccess 
              ? 'bg-white dark:bg-slate-800 border-green-200 dark:border-green-900/50 text-gray-800 dark:text-gray-100' 
              : 'bg-white dark:bg-slate-800 border-red-200 dark:border-red-900/50 text-gray-800 dark:text-gray-100'
          }`}>
            {isSuccess ? (
              <CheckCircle className="text-green-500 w-5 h-5 shrink-0" />
            ) : (
              <XCircle className="text-red-500 w-5 h-5 shrink-0" />
            )}
            
            <p className="font-medium text-sm leading-tight flex-1">
              {message}
            </p>
            
            <button 
              onClick={handleClose} 
              className="ml-1 p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md transition-colors shrink-0"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        
      </div>
    </div>
  );

  return createPortal(toastContent, document.body);
};

export default Toast;
import React from 'react';
import { Download, FileText, CheckCircle2, Loader2 } from 'lucide-react';

const VcfBundleRow = ({ bundle, displayNum, isDownloaded, isDownloading = false, onDownload }) => {
    return (
        <div 
            className={`flex items-center justify-between p-3 md:p-4 border-b border-gray-100 dark:border-slate-700/60 last:border-b-0 transition-colors duration-200 ${
                isDownloaded 
                    ? 'bg-gray-50/70 dark:bg-slate-800/50 opacity-80' 
                    : 'bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700/50'
            }`}
        >
            {/* Left side: Number + Info */}
            <div className="flex items-center gap-3 overflow-hidden pr-2">
                <span className="text-gray-400 dark:text-slate-500 font-black text-xs md:text-sm w-5 md:w-6 text-right shrink-0">
                    {displayNum}.
                </span>
                
                <div className={`p-2.5 md:p-3 rounded-lg flex-shrink-0 ${isDownloaded ? 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}`}>
                    <FileText className="w-4 h-4 md:w-5 md:h-5" />
                </div>
                
                <div className="truncate">
                    <h3 className={`font-bold text-sm md:text-base truncate ${isDownloaded ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
                        {bundle.name || `${bundle.contact_count || '20'} Contacts Ready`}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[9px] md:text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wide ${isDownloaded ? 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}`}>
                            VCF
                        </span>
                        <span className="text-[10px] md:text-xs text-gray-400 dark:text-slate-500 font-medium">
                            • {new Date(bundle.created_at).toLocaleDateString()}
                        </span>
                    </div>
                </div>
            </div>
            
            {/* Right side: Download Action Button */}
            <button 
                type="button"
                onClick={onDownload}
                disabled={isDownloading}
                className={`flex items-center justify-center gap-1.5 md:gap-2 px-3 py-2 md:px-4 md:py-2 rounded-lg font-bold text-[10px] md:text-xs uppercase tracking-wider transition-all shrink-0 ${
                    isDownloading
                        ? 'bg-blue-100 dark:bg-slate-700 text-blue-500 cursor-wait'
                        : isDownloaded 
                            ? 'bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-600 cursor-pointer' 
                            : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white shadow-sm cursor-pointer'
                }`}
            >
                {isDownloading ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
                        <span className="hidden sm:inline">Downloading...</span>
                    </>
                ) : isDownloaded ? (
                    <>
                        <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <span className="hidden sm:inline">Downloaded</span>
                    </>
                ) : (
                    <>
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Download</span>
                    </>
                )}
            </button>
        </div>
    );
};

export default VcfBundleRow;
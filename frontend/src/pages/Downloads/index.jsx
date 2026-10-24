import React, { useCallback, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Download as DownloadIcon, X } from 'lucide-react';
import api from '../../api';
import Toast from '../../components/Toast';
import VcfBundleRow from './VcfBundleRow';
import { CheckoutModal } from '../../components/CheckoutModal';

const Downloads = () => {
    const [bundles, setBundles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [downloadingId, setDownloadingId] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    
    const [confirmModal, setConfirmModal] = useState({ show: false, bundle: null });

    const [checkoutModal, setCheckoutModal] = useState({ 
        show: false, 
        bundle: null, 
        breakdown: null 
    });

    const itemsPerPage = 5;

    const showToast = useCallback((message, type = 'success') => {
        setToast({ show: true, message, type });
    }, []);
    const hideToast = () => setToast(prev => ({ ...prev, show: false }));

    const fetchBundles = useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get('pools/my-batches/');
            setBundles(response.data || []);
        } catch (error) {
            console.error('Error fetching bundles:', error);
            showToast('Failed to load contact bundles.', 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        fetchBundles();
    }, [fetchBundles]);

    const handleDownloadClick = (bundle) => {
        if (downloadingId) return;

        if (bundle.is_downloaded || bundle.status === 'completed') {
            setConfirmModal({ show: true, bundle });
        } else {
            executeDownload(bundle);
        }
    };

    const executeDownload = async (bundle) => {
        if (!bundle) return;
        
        const targetBatchId = bundle.batch_id || bundle.id;
        setDownloadingId(bundle.id);
        showToast(`Preparing ${bundle.name || 'VCF Batch'}...`, 'info');

        try {
            const response = await api.get(`pools/download/?batch_id=${targetBatchId}`, {
                responseType: 'blob'
            });

            const blob = new Blob([response.data], { type: 'text/vcard' });
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            
            const safeFileName = `${(bundle.name || 'contacts').replace(/\s+/g, '_')}.vcf`;
            link.setAttribute('download', safeFileName);
            
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);

            setBundles(prev => prev.map(b => (b.id === bundle.id || b.batch_id === targetBatchId) ? { ...b, is_downloaded: true, status: 'completed' } : b));
            window.dispatchEvent(new Event('downloads:updated'));
            showToast(`${bundle.name || 'Batch'} downloaded successfully!`, 'success');
        } catch (error) {
            if (error.response && error.response.status === 402) {
                hideToast();
                let breakdownData = null;
                
                try {
                    const errorText = await error.response.data.text();
                    const errorJson = JSON.parse(errorText);
                    breakdownData = errorJson.breakdown;
                } catch (parseErr) {
                    console.error("Could not parse 402 blob payload:", parseErr);
                }

                setCheckoutModal({
                    show: true,
                    bundle: bundle,
                    breakdown: breakdownData
                });
            } else {
                console.error('VCF Download Error:', error);
                showToast('Failed to download VCF bundle. Please try again.', 'error');
            }
        } finally {
            setDownloadingId(null);
        }
    };

    const handleConfirmRedownload = () => {
        if (confirmModal.bundle) {
            const targetBundle = confirmModal.bundle;
            setConfirmModal({ show: false, bundle: null });
            executeDownload(targetBundle);
        }
    };

    const handleCancelRedownload = () => {
        setConfirmModal({ show: false, bundle: null });
    };

    const totalPages = Math.ceil(bundles.length / itemsPerPage);
    const paginatedBundles = bundles.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="w-full flex flex-col h-full overflow-hidden relative">
            {toast.show && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}

            <div className="mb-4 shrink-0">
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">Your Downloads</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">
                    Download your generated contact bundles here and import them to your phonebook.
                </p>
            </div>

            <div className="w-full h-[550px] flex flex-col p-2 bg-gray-50 dark:bg-slate-800/40 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-2xl overflow-hidden justify-between transition-colors">
                {loading ? (
                    <div className="flex-1 flex justify-center items-center">
                        <p className="text-gray-500 dark:text-gray-400 animate-pulse font-medium">Loading your contact bundles...</p>
                    </div>
                ) : bundles.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <div className="text-5xl mb-4">📭</div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">No downloads available yet</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm text-center mt-2 max-w-sm leading-relaxed">
                            You haven't generated any contact bundles. Head over to the Home tab and join a pool to get new contacts.
                        </p>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col justify-between overflow-hidden">
                        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden flex flex-col shadow-sm transition-colors">
                            {paginatedBundles.map((bundle, index) => {
                                const globalIndex = (currentPage - 1) * itemsPerPage + index;
                                const displayNum = bundles.length - globalIndex;
                                
                                return (
                                    <VcfBundleRow 
                                        key={bundle.id || bundle.batch_id}
                                        bundle={bundle}
                                        displayNum={displayNum}
                                        isDownloaded={bundle.is_downloaded || bundle.status === 'completed'}
                                        isDownloading={downloadingId === bundle.id}
                                        onDownload={() => handleDownloadClick(bundle)}
                                    />
                                );
                            })}
                        </div>

                        {totalPages > 1 && (
                            <div className="flex items-center justify-between mt-auto pt-4 shrink-0">
                                <span className="text-[10px] md:text-xs font-medium text-gray-500 dark:text-gray-400">
                                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, bundles.length)} of {bundles.length}
                                </span>
                                <div className="flex items-center gap-1 md:gap-2">
                                    <button 
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="p-1.5 md:p-2 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 bg-transparent transition-colors"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <span className="text-xs md:text-sm font-bold text-gray-700 dark:text-gray-300 px-1 md:px-2">
                                        {currentPage} / {totalPages}
                                    </span>
                                    <button 
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="p-1.5 md:p-2 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 bg-transparent transition-colors"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {confirmModal.show && confirmModal.bundle && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-2xl max-w-sm w-full p-6 relative flex flex-col items-center text-center transition-colors">
                        <button 
                            onClick={handleCancelRedownload}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 shrink-0">
                            <DownloadIcon className="w-6 h-6" />
                        </div>

                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                            Re-download Contacts?
                        </h3>

                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed mb-6">
                            You have already downloaded <span className="font-bold text-gray-800 dark:text-gray-200">"{confirmModal.bundle.name}"</span>. Do you want to download this file again?
                        </p>

                        <div className="flex items-center justify-end gap-3 w-full">
                            <button
                                type="button"
                                onClick={handleCancelRedownload}
                                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-slate-700/60 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmRedownload}
                                className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md transition-all active:scale-[0.98]"
                            >
                                Yes, Download
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <CheckoutModal
                isOpen={checkoutModal.show}
                onClose={() => setCheckoutModal({ show: false, bundle: null, breakdown: null })}
                batch={{ 
                    batch_id: checkoutModal.bundle?.batch_id || checkoutModal.bundle?.id, 
                    target_size: checkoutModal.bundle?.contact_count || 20 
                }}
                breakdown={checkoutModal.breakdown}
                onUnlockSuccess={async () => {
                    showToast('Payment confirmed! Starting download...', 'success');
                    const targetBundle = checkoutModal.bundle;
                    setCheckoutModal({ show: false, bundle: null, breakdown: null });
                    
                    await fetchBundles();
                    if (targetBundle) {
                        executeDownload(targetBundle);
                    }
                }}
            />
        </div>
    );
};

export default Downloads;
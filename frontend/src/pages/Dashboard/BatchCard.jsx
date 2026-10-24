import { CheckCircle2, ArrowRight, Info, Download, Loader2, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const THEMES = {
  blue: { 
    main: 'blue', 
    bg: 'bg-blue-50 dark:bg-blue-900/30', 
    text: 'text-blue-700 dark:text-blue-400', 
    border: 'border-blue-100 dark:border-blue-800/50', 
    ring: 'hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm', 
    btn: 'bg-blue-600 hover:bg-blue-700 text-white', 
    progress: 'bg-blue-600 dark:bg-blue-500'
  },
  indigo: { 
    main: 'indigo', 
    bg: 'bg-indigo-50 dark:bg-indigo-900/30', 
    text: 'text-indigo-700 dark:text-indigo-400', 
    border: 'border-indigo-100 dark:border-indigo-800/50', 
    ring: 'hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-sm', 
    btn: 'bg-indigo-600 hover:bg-indigo-700 text-white', 
    progress: 'bg-indigo-600 dark:bg-indigo-500'
  },
  amber: { 
    main: 'amber', 
    bg: 'bg-amber-50 dark:bg-amber-900/30', 
    text: 'text-amber-800 dark:text-amber-400', 
    border: 'border-amber-200 dark:border-amber-800/50', 
    ring: 'hover:border-amber-300 dark:hover:border-amber-600 hover:shadow-sm', 
    btn: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white', 
    progress: 'bg-amber-500'
  },
  orange: { 
    main: 'orange', 
    bg: 'bg-orange-50 dark:bg-orange-900/30', 
    text: 'text-orange-800 dark:text-orange-400', 
    border: 'border-orange-200 dark:border-orange-800/50', 
    ring: 'hover:border-orange-300 dark:hover:border-orange-600 hover:shadow-sm', 
    btn: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white', 
    progress: 'bg-orange-500'
  },
};

const BatchCard = ({ 
  type, 
  target, 
  tokens = 20, 
  basePriceKes = 0,
  currentPhase = 'PHASE_1_BOOTSTRAP',
  title, 
  description, 
  imageUrl, 
  Icon, 
  themeColor, 
  badgeText, 
  infoMessage, 
  isBestValue, 
  pendingPool, 
  isLoadingQueue = false, 
  isLocked = false, 
  onJoin 
}) => {
  const navigate = useNavigate();
  const t = THEMES[themeColor] || THEMES.blue;

  const normalizeTarget = (val) => {
    const num = Number(val);
    if (num === 21) return 20;
    if (num === 101) return 100;
    return num;
  };

  const displayTarget = normalizeTarget(target);

  const renderPriceTag = () => {
    const multiplier = type === 'filtered' ? 2 : 1;
    const baseTokenCost = displayTarget === 100 ? 100 : 20;
    const effectiveTokens = (tokens || baseTokenCost) * multiplier;

    if (currentPhase === 'PHASE_1_BOOTSTRAP') {
      return (
        <span className="bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-700 text-[9px] sm:text-[10px] font-black uppercase tracking-wider py-1 px-2 rounded-md">
          Free
        </span>
      );
    }

    if (currentPhase === 'PHASE_2_VIRAL_LOOP' || currentPhase === 'PHASE_2_VIRAL') {
      return (
        <span className="bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-slate-700 text-[9px] sm:text-[10px] font-black uppercase tracking-wider py-1 px-2 rounded-md">
          {effectiveTokens} Tokens
        </span>
      );
    }

    const fallbackPrice = displayTarget === 100 
      ? (currentPhase === 'PHASE_4_SQUEEZED' ? 120 : 80)
      : (currentPhase === 'PHASE_4_SQUEEZED' ? 40 : 30);
    
    const activeBase = basePriceKes > 0 ? basePriceKes : fallbackPrice;
    const activePrice = activeBase * multiplier;

    return (
      <span className="bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 text-[9px] sm:text-[10px] font-black uppercase tracking-wider py-1 px-2 rounded-md">
        KES {activePrice} / {effectiveTokens} Tokens
      </span>
    );
  };

  const poolType = pendingPool?.type || 'normal';
  const backendTarget = Number(pendingPool?.target || target);
  const backendCurrent = Number(pendingPool?.current || 0);

  const isThisCardActive = pendingPool !== null && 
    poolType === type && 
    normalizeTarget(pendingPool?.target) === normalizeTarget(target);

  const isAnyPoolActive = pendingPool !== null;

  const isMatchReady = isThisCardActive && (
    pendingPool?.status === 'matched' || backendCurrent >= backendTarget
  );

  const peerCount = Math.max(0, backendCurrent - 1);
  const displayCurrent = isMatchReady ? displayTarget : Math.min(peerCount, displayTarget);

  const isPendingWaiting = isThisCardActive && !isMatchReady;
  const progressPercentage = isThisCardActive 
    ? Math.min((displayCurrent / displayTarget) * 100, 100) 
    : 0;

  const isInteractive = !isLoadingQueue && !isLocked && (isMatchReady || (!isAnyPoolActive && !isThisCardActive));

  const handleCardClick = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (isLoadingQueue || isLocked) return;

    if (isMatchReady) {
      navigate('/download');
    } else if (!isAnyPoolActive) {
      onJoin(type, target);
    }
  };

  return (
    <div 
      onClick={isInteractive ? handleCardClick : undefined}
      className={`group rounded-2xl overflow-hidden flex flex-col relative transition-all duration-300 border h-full select-none
        ${isLoadingQueue ? 'opacity-60 cursor-wait pointer-events-none animate-pulse' : ''}
        ${isLocked && !isThisCardActive ? 'opacity-60 grayscale cursor-not-allowed' : ''}
        ${isInteractive ? 'cursor-pointer' : ''} 
        ${isThisCardActive 
          ? (isMatchReady 
              ? 'border-green-500 dark:border-green-600 bg-green-50/20 dark:bg-green-900/10 shadow-md ring-2 ring-green-500/30' 
              : 'border-blue-300 dark:border-slate-700 bg-blue-50/30 dark:bg-slate-900/80 shadow-inner'
            ) 
          : isAnyPoolActive 
            ? 'border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/30 opacity-40 grayscale cursor-not-allowed'
            : `border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 ${t.ring}`
        }`}
    >

      {/* Best Value Badge */}
      {isBestValue && !isThisCardActive && !isLocked && (
        <div className="absolute top-3 right-3 z-20 bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest py-1.5 px-3 rounded-full shadow-sm">
          ★ Best Value
        </div>
      )}

      {/* Header Image Container */}
      <div className="h-40 sm:h-56 relative overflow-hidden bg-gray-900 shrink-0">
        <img 
          src={imageUrl} 
          alt={title} 
          className={`w-full h-full object-cover transition-all duration-500 ${
            isPendingWaiting 
              ? 'opacity-40 grayscale' 
              : 'opacity-70 group-hover:scale-[1.02]'
          }`} 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950/90 via-gray-950/40 to-transparent"></div>

        {/* Status Tag on Top Left */}
        {isThisCardActive && (
          <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-700">
            {isMatchReady ? (
              <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-green-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> Match Ready!
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-400">
                <Loader2 className="w-3 h-3 animate-spin text-amber-400" /> Pooling Active
              </span>
            )}
          </div>
        )}

        <div className="absolute bottom-3 left-4 flex items-center gap-2.5 text-white">
          <div className={`p-1.5 rounded-xl backdrop-blur-md border ${isPendingWaiting ? 'bg-slate-800/60 border-slate-700' : 'bg-white/20 border-white/20'}`}>
            <Icon className={`w-4 h-4 ${isPendingWaiting ? 'text-gray-300' : `text-${t.main}-400`}`} />
          </div>
          <span className="font-extrabold text-lg tracking-tight">{title}</span>
        </div>
      </div>

      {/* Body Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col">

        <div className="mb-auto">
          <div className="flex justify-between items-center mb-3">
            <span className={`${isPendingWaiting ? 'bg-gray-200 dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-slate-700' : `${t.bg} ${t.text}${t.border}`} text-[9px] sm:text-[10px] font-black uppercase tracking-wider py-1 px-2 rounded-md border`}>
              {badgeText}
            </span>
            
            {/* Dynamic VCF Download Price Tag (KES / Tokens) */}
            {renderPriceTag()}
          </div>

          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-normal leading-relaxed">{description}</p>

          {infoMessage && (
            <div className={`${t.bg} ${t.text} text-xs font-medium p-2.5 rounded-xl flex items-start gap-2 mt-3 border ${t.border}`}>
              <Info className="w-4 h-4 mt-0.5 shrink-0 text-current opacity-80" />
              <span>{infoMessage}</span>
            </div>
          )}
        </div>

        {/* Action Button & Live Progress Bar */}
        <div className="mt-auto pt-4">
          {isLoadingQueue ? (
            <div className="w-full bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 font-black py-3 rounded-xl flex items-center justify-center gap-2 uppercase text-[11px] border border-gray-200 dark:border-slate-700 cursor-wait">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking Status...
            </div>
          ) : isLocked && !isThisCardActive ? (
            <div className="w-full bg-slate-100 dark:bg-slate-900 text-slate-500 font-black py-3 rounded-xl flex items-center justify-center gap-2 uppercase text-[11px] border border-slate-200 dark:border-slate-800 cursor-not-allowed">
              <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" /> High Traffic Unlock Only
            </div>
          ) : isThisCardActive ? (
            <div className="bg-white/80 dark:bg-slate-800/90 p-3 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <span className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${isMatchReady ? 'text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>
                  {isMatchReady ? 'Contacts Ready!' : 'Live Peer Count'}
                </span>

                <span className={`text-xs font-black px-2 py-0.5 rounded-md ${
                  isMatchReady 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 border border-green-300 dark:border-green-800' 
                    : 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                }`}>
                  {displayCurrent} / {displayTarget}
                </span>
              </div>

              <div className="w-full bg-gray-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden mb-3">
                <div 
                  className={`h-full transition-all duration-500 rounded-full ${isMatchReady ? 'bg-green-500' : t.progress}`} 
                  style={{ width: `${progressPercentage}%` }} 
                />
              </div>

              {isMatchReady ? (
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/download');
                  }} 
                  className="w-full bg-green-600 hover:bg-green-700 active:scale-[0.98] transition-all text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 uppercase text-[11px] tracking-wider shadow-md cursor-pointer"
                >
                  Download Contacts <Download className="w-4 h-4" />
                </button>
              ) : (
                <div className="relative w-full bg-gray-100 dark:bg-slate-900 overflow-hidden font-black py-2.5 rounded-lg flex items-center justify-center gap-2 uppercase text-[11px] cursor-not-allowed border border-gray-200 dark:border-slate-700">
                  <span className="relative z-10 text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 dark:text-blue-400" />
                    Finding Matches ({displayCurrent}/{displayTarget})
                  </span>
                </div>
              )}
            </div>
          ) : (
            <button
              disabled={isAnyPoolActive || isLoadingQueue}
              type="button"
              onClick={handleCardClick}
              className={`w-full font-black py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 uppercase text-[11px] tracking-wider ${
                isAnyPoolActive 
                  ? 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 border border-gray-200 dark:border-slate-700 cursor-not-allowed pointer-events-none' 
                  : `${t.btn} cursor-pointer`
              }`}
            >
              {isAnyPoolActive ? (
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> Pool in Progress
                </span>
              ) : (
                <>
                  Get {displayTarget}
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default BatchCard;
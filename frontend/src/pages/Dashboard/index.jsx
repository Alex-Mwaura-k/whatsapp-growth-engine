import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { Loader2, Zap, Filter, Users } from 'lucide-react';
import api from '../../api'; 

import StatsGrid from './StatsGrid';
import BatchCard from './BatchCard';
import JoinPoolModal from './JoinPoolModal';

const GENDER_CHOICES = [{ value: 'M', label: 'Male' }, { value: 'F', label: 'Female' }, { value: 'O', label: 'Other' }];
const AGE_CHOICES = ['18-24', '25-29', '30-34', '35-39', '40-44', '45-49', '50-54', '55+'];

export default function Dashboard() {
  const { user, loading } = useAuth();
  
  const [activeTab, setActiveTab] = useState('normal'); 
  const [pendingPool, setPendingPool] = useState(null);
  const [isLoadingQueue, setIsLoadingQueue] = useState(true);
  const [queueStatusUnavailable, setQueueStatusUnavailable] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Traffic-Adaptive Pool, Filtered Unlock & Dynamic Phase State
  const [poolStatus, setPoolStatus] = useState({ 
    pool_100_unlocked: false, 
    is_filtered_unlocked: false, 
    total_active_users: 0,
    current_phase: 'PHASE_1_BOOTSTRAP'
  });

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [poolToJoin, setPoolToJoin] = useState(null);
  const [categories, setCategories] = useState([]);
  const [searchCategory, setSearchCategory] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedAge, setSelectedAge] = useState('');
  const [selectedGender, setSelectedGender] = useState('');

  // 1. FETCH CATEGORIES
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get('categories/');
        setCategories(response.data);
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      }
    };

    fetchCategories();
  }, []);

  // 2. CHECK ACTIVE QUEUE & TRAFFIC LOCK STATUS ON MOUNT OR REFRESH
  useEffect(() => {
    const checkActiveQueueAndPoolStatus = async () => {
      if (!user?.is_profile_complete) {
        setIsLoadingQueue(false);
        return;
      }

      setIsLoadingQueue(true);
      try {
        const [queueRes, statusRes] = await Promise.allSettled([
          api.get('queue/my-match/'),
          api.get('pools/status/')
        ]);

        // Process pool lock status, platform phase & network thresholds
        if (statusRes.status === 'fulfilled' && statusRes.value?.data) {
          setPoolStatus(statusRes.value.data);
        }

        // Process active queue status
        if (queueRes.status === 'fulfilled' && queueRes.value?.data) {
          setQueueStatusUnavailable(false);
          const data = queueRes.value.data;

          if (data.status === 'pending') {
            const poolType = data.type || 'normal';
            setPendingPool({
              status: 'pending',
              type: poolType,
              target: Number(data.target) || 20,
              current: Number(data.current) || 1,
              category_id: data.category_id
            });
            setActiveTab(poolType);
          } else if (data.status === 'matched') {
            const poolType = data.type || 'normal';
            setPendingPool({
              status: 'matched',
              type: poolType,
              target: Number(data.target) || 20,
              current: Number(data.target) || 20,
              category_id: data.category_id
            });
            setActiveTab(poolType);
          } else {
            setPendingPool(null);
          }
        } else {
          setQueueStatusUnavailable(true);
        }
      } catch (err) {
        console.error("Error loading queue/pool status:", err);
        setQueueStatusUnavailable(true);
      } finally {
        setIsLoadingQueue(false);
      }
    };

    if (user) {
      checkActiveQueueAndPoolStatus();
    }
  }, [user]);

  useEffect(() => {
    if (!user || !queueStatusUnavailable) return undefined;

    const retryQueueStatus = async () => {
      try {
        const response = await api.get('queue/my-match/');
        const data = response.data;
        setQueueStatusUnavailable(false);

        if (data.status === 'pending' || data.status === 'matched') {
          const poolType = data.type || 'normal';
          const target = Number(data.target) || 20;
          setPendingPool({
            status: data.status,
            type: poolType,
            target,
            current: data.status === 'matched' ? target : Number(data.current) || 1,
            category_id: data.category_id
          });
          setActiveTab(poolType);
        } else {
          setPendingPool(null);
        }
      } catch (err) {
        console.error("Error retrying queue status:", err);
      }
    };

    const retryInterval = setInterval(retryQueueStatus, 5000);
    return () => clearInterval(retryInterval);
  }, [user, queueStatusUnavailable]);

  // 3. LIVE 3-SECOND POLLING EFFECT WHILE WAITING IN QUEUE
  useEffect(() => {
    let pollInterval;

    if (pendingPool && pendingPool.status === 'pending') {
      pollInterval = setInterval(async () => {
        try {
          const res = await api.get('queue/my-match/');
          const data = res.data;

          if (data.status === 'pending') {
            setQueueStatusUnavailable(false);
            setPendingPool(prev => ({
              ...prev,
              status: 'pending',
              current: Number(data.current) || prev.current
            }));
          } else if (data.status === 'matched') {
            setQueueStatusUnavailable(false);
            setPendingPool(prev => ({
              ...prev,
              status: 'matched',
              current: Number(data.target) || 20
            }));
          } else if (data.status === 'idle') {
            setQueueStatusUnavailable(false);
            setPendingPool(null);
          }
        } catch (err) {
          console.error("Error polling match status:", err);
          setQueueStatusUnavailable(true);
        }
      }, 3000);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [pendingPool]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getReferralCount = () => user?.referrals_count ?? user?.referral_count ?? user?.total_referrals ?? (user?.referrals?.length || 0);

  const resetFilters = () => {
    setSelectedCategory(null); 
    setSearchCategory(''); 
    setSelectedCountry('');
    setSelectedState(''); 
    setSelectedAge(''); 
    setSelectedGender('');
  };

  const openCategorySelection = (type, count) => {
    if (pendingPool !== null || isLoadingQueue || queueStatusUnavailable) return;
    setPoolToJoin({ type, count });
    resetFilters();
    setShowCategoryModal(true);
  };

  const confirmJoinPool = async () => {
    if (!selectedCategory || isSubmitting) return;
    
    setIsSubmitting(true);
    const payload = {
      type: poolToJoin.type, 
      target: poolToJoin.count, 
      category_id: selectedCategory.id,
      ...(poolToJoin.type === 'filtered' && { 
        country: selectedCountry, 
        state_county: selectedState, 
        age_range: selectedAge, 
        gender: selectedGender 
      })
    };
    
    try {
      const response = await api.post('pools/join/', payload);
      const data = response.data;
      setQueueStatusUnavailable(false);
      
      const isMatched = data.status === 'matched';
      setPendingPool({
        status: data.status || 'pending',
        type: poolToJoin.type,
        target: poolToJoin.count,
        current: isMatched ? poolToJoin.count : (Number(data.current) || 1),
        category_id: selectedCategory.id
      }); 

      setShowCategoryModal(false);
      setPoolToJoin(null);
    } catch (err) {
      console.error("Failed to join pool:", err);
      const errorMsg = err.response?.data?.error || err.response?.data?.detail || "Failed to join the pool.";
      alert(errorMsg); 
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="flex h-[60vh] flex-col items-center justify-center gap-3"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;
  if (!user) return <div className="p-6 text-center"><p className="text-red-500 font-bold">Failed to load dashboard.</p></div>;

  return (
    <div className="w-full relative space-y-4">
      
      {/* Header aligned with Stats Cards */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="flex-shrink-0">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100">{getGreeting()}, {user?.whatsapp_name || 'User'}!</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">Here is your current growth summary.</p>
        </div>
        
        {/* Render Stats inline if profile is complete */}
        {user?.is_profile_complete && (
          <div className="w-full md:w-[60%] lg:w-[55%] max-w-2xl">
            <StatsGrid user={user} referralCount={getReferralCount()} />
          </div>
        )}
      </div>
      
      {!user?.is_profile_complete ? (
        <div className="p-5 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl shadow-sm animate-in fade-in zoom-in-95 duration-500">
          <h3 className="font-bold text-amber-800 dark:text-amber-400 text-sm">Action Required: Complete Profile</h3>
          <p className="text-amber-700 dark:text-amber-500 text-xs mt-1">You must specialize in a category to start earning tokens and matching with leads.</p>
          <Link to="/profile" className="mt-4 inline-block bg-amber-500 hover:bg-amber-600 transition-colors text-white px-5 py-2 rounded-xl font-bold text-xs shadow-sm">
            Complete Profile Now
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-2 animate-in fade-in slide-in-from-bottom-6 duration-700">
            
            {/* Get New Contacts Title and Tabs aligned inline */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
              <h2 className="text-lg font-black text-gray-900 dark:text-gray-100 px-1 shrink-0">Get New Contacts</h2>
              
              <div className="w-full md:w-[60%] lg:w-[55%] max-w-2xl flex bg-gray-100/80 dark:bg-gray-800 p-1.5 rounded-xl">
                <button 
                  onClick={() => setActiveTab('normal')} 
                  className={`flex-1 py-2 text-[11px] font-black uppercase flex justify-center items-center gap-1.5 rounded-lg ${activeTab === 'normal' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                >
                  <Zap className="w-3.5 h-3.5"/> Normal
                </button>
                <button 
                  onClick={() => setActiveTab('filtered')} 
                  className={`flex-1 py-2 text-[11px] font-black uppercase flex justify-center items-center gap-1.5 rounded-lg ${activeTab === 'filtered' ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                >
                  <Filter className="w-3.5 h-3.5"/> Filtered
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activeTab === 'normal' && (
                <>
                  <BatchCard 
                    type="normal" 
                    target={20} 
                    tokens={20} 
                    currentPhase={poolStatus.current_phase}
                    title="Get 20 Contacts" 
                    description="Enter the pool to swap numbers with 20 users in your industry." 
                    imageUrl="https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&w=800&q=80" 
                    Icon={Zap} 
                    themeColor="blue" 
                    badgeText="Category Match" 
                    pendingPool={pendingPool} 
                    isLoadingQueue={isLoadingQueue || queueStatusUnavailable}
                    isLocked={false}
                    onJoin={openCategorySelection} 
                  />
                  <BatchCard 
                    type="normal" 
                    target={100} 
                    tokens={20} 
                    currentPhase={poolStatus.current_phase}
                    title="Get 100 Contacts" 
                    description="Queue up to exchange contacts with 100 industry members." 
                    infoMessage="Wait times depend on active users." 
                    imageUrl="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=800&q=80" 
                    Icon={Users} 
                    themeColor="indigo" 
                    badgeText={poolStatus.pool_100_unlocked ? "Category Match" : "Traffic Locked"} 
                    pendingPool={pendingPool} 
                    isLoadingQueue={isLoadingQueue || queueStatusUnavailable}
                    isLocked={!poolStatus.pool_100_unlocked}
                    onJoin={openCategorySelection} 
                  />
                </>
              )}

              {activeTab === 'filtered' && (
                !poolStatus.is_filtered_unlocked ? (
                  <div className="col-span-full bg-gradient-to-br from-amber-50/90 via-white to-amber-100/60 dark:from-slate-900 dark:to-amber-950 border border-amber-300/70 dark:border-amber-500/30 rounded-2xl p-6 text-center text-slate-800 dark:text-white shadow-lg dark:shadow-2xl animate-in fade-in zoom-in-95 duration-500">
                    <div className="w-12 h-12 mx-auto mb-3 bg-amber-500/10 dark:bg-amber-500/20 rounded-2xl border border-amber-500/30 dark:border-amber-500/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
                      <Filter className="w-6 h-6" />
                    </div>
                    
                    <h3 className="text-lg font-black tracking-tight text-amber-900 dark:text-amber-300">
                      Targeted Match Unlocks at 1,000 Members
                    </h3>
                    
                    <p className="text-xs text-slate-600 dark:text-gray-300 max-w-md mx-auto mt-2 leading-relaxed font-medium">
                      Precision targeting (by location, age, and gender) requires network density to guarantee 100% exact, 2-way mutual contact matching.
                    </p>

                    {/* Live Community Growth Bar */}
                    <div className="max-w-md mx-auto mt-5 bg-white/90 dark:bg-slate-800/80 p-3.5 rounded-xl border border-amber-200/80 dark:border-slate-700 shadow-sm">
                      <div className="flex justify-between items-center text-xs font-bold mb-2">
                        <span className="text-amber-800 dark:text-amber-400 uppercase tracking-wider text-[10px]">Network Growth</span>
                        <span className="text-slate-900 dark:text-white font-extrabold">{poolStatus.total_active_users || 0} / 1,000 Users</span>
                      </div>
                      <div className="w-full bg-amber-100 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-amber-500 to-orange-500 h-full transition-all duration-500 rounded-full"
                          style={{ width: `${Math.min(((poolStatus.total_active_users || 0) / 1000) * 100, 100)}%` }}
                        />
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-gray-400 mt-4 font-medium">
                      💡 <span className="font-bold text-amber-800 dark:text-amber-400">Pro Tip:</span> Invite peers using your referral link to reach 1,000 members faster and earn free tokens!
                    </p>
                  </div>
                ) : (
                  <>
                    <BatchCard 
                      type="filtered" 
                      target={20} 
                      tokens={20} 
                      currentPhase={poolStatus.current_phase}
                      title="Targeted 20" 
                      description="Queue for 20 precise mutual leads. Filter by gender, country, and age." 
                      imageUrl="https://images.unsplash.com/photo-1552581234-26160f608093?auto=format&fit=crop&w=800&q=80" 
                      Icon={Filter} 
                      themeColor="amber" 
                      badgeText="Highly Targeted" 
                      pendingPool={pendingPool} 
                      isLoadingQueue={isLoadingQueue || queueStatusUnavailable}
                      isLocked={false}
                      onJoin={openCategorySelection} 
                    />
                    <BatchCard 
                      type="filtered" 
                      target={100} 
                      tokens={20} 
                      currentPhase={poolStatus.current_phase}
                      title="Targeted 100" 
                      description="Queue for a massive batch of fully filtered mutual leads." 
                      infoMessage="Because you request exact filters, it may take time." 
                      isBestValue={true} 
                      imageUrl="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80" 
                      Icon={Users} 
                      themeColor="orange" 
                      badgeText={poolStatus.pool_100_unlocked ? "Highly Targeted" : "Traffic Locked"} 
                      pendingPool={pendingPool} 
                      isLoadingQueue={isLoadingQueue || queueStatusUnavailable}
                      isLocked={!poolStatus.pool_100_unlocked}
                      onJoin={openCategorySelection} 
                    />
                  </>
                )
              )}
            </div>
          </div>
        </>
      )}

      <JoinPoolModal 
        show={showCategoryModal} 
        onClose={() => { setShowCategoryModal(false); resetFilters(); }} 
        poolToJoin={poolToJoin} 
        filteredCategories={categories.filter(c => c.name.toLowerCase().includes(searchCategory.toLowerCase()))} 
        selectedCategory={selectedCategory} 
        setSelectedCategory={setSelectedCategory}
        selectedCountry={selectedCountry} 
        setSelectedCountry={setSelectedCountry} 
        selectedState={selectedState} 
        setSelectedState={setSelectedState}
        selectedAge={selectedAge} 
        setSelectedAge={setSelectedAge} 
        selectedGender={selectedGender} 
        setSelectedGender={setSelectedGender}
        AGE_CHOICES={AGE_CHOICES} 
        GENDER_CHOICES={GENDER_CHOICES} 
        onConfirm={confirmJoinPool}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
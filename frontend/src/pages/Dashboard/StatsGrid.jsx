import { Coins, Download, Users } from 'lucide-react';

const StatsGrid = ({ user, referralCount }) => {
  // Safely parse wallet balance, handling strings, numbers, or null/undefined
  const rawBalance = user?.wallet_balance;
  const walletBalance = rawBalance != null && !isNaN(rawBalance)
    ? parseFloat(rawBalance).toFixed(2)
    : "0.00";

  // Real-time downloads count directly from UserSerializer / UnlockedContact
  const totalContacts = user?.total_downloads ?? 0;

  // Fallback chain: passed prop -> user profile field -> default 0
  const totalReferrals = referralCount ?? user?.referral_count ?? 0;

  return (
    <div className="grid grid-cols-3 gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Wallet Tokens */}
      <div className="bg-white dark:bg-slate-800 py-2.5 px-2 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col items-center text-center transition-all duration-300 hover:border-amber-200 dark:hover:border-amber-800/40">
        <Coins className="w-4 h-4 text-amber-500 mb-1 shrink-0" />
        <p className="text-base font-black text-gray-900 dark:text-white leading-none mb-1 transition-all">
          {walletBalance}
        </p>
        <p className="text-[8px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest">Tokens</p>
      </div>

      {/* Downloaded Contacts */}
      <div className="bg-white dark:bg-slate-800 py-2.5 px-2 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col items-center text-center transition-all duration-300 hover:border-blue-200 dark:hover:border-blue-800/40">
        <Download className="w-4 h-4 text-blue-500 mb-1 shrink-0" />
        <p className="text-base font-black text-gray-900 dark:text-white leading-none mb-1 transition-all">
          {totalContacts}
        </p>
        <p className="text-[8px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest">Contacts</p>
      </div>

      {/* Referrals */}
      <div className="bg-white dark:bg-slate-800 py-2.5 px-2 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col items-center text-center transition-all duration-300 hover:border-green-200 dark:hover:border-green-800/40">
        <Users className="w-4 h-4 text-green-500 mb-1 shrink-0" />
        <p className="text-base font-black text-gray-900 dark:text-white leading-none mb-1 transition-all">
          {totalReferrals}
        </p>
        <p className="text-[8px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-widest">Referrals</p>
      </div>
    </div>
  );
};

export default StatsGrid;
import React from 'react';

const GrowthBanner = ({ telemetry }) => {
  // If telemetry is loading or unavailable, wait or hide
  if (!telemetry || telemetry.referral_reward_tokens == null) {
    return null;
  }

  // Convert string or decimal response into integer (e.g. 10.00 -> 10, 2.00 -> 2, 1.00 -> 1)
  const rewardTokens = Math.floor(Number(telemetry.referral_reward_tokens));

  return (
    <div className="mt-3 w-full shrink-0">
      <div className="p-3.5 md:p-4 bg-blue-50/50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/50 flex items-center justify-center text-center transition-colors">
        <p className="text-[11px] md:text-xs text-blue-900 dark:text-blue-200 leading-snug">
          Earn <span className="font-bold text-blue-600 dark:text-blue-400 underline decoration-blue-300 dark:decoration-blue-600">
            {rewardTokens} {rewardTokens === 1 ? 'Token' : 'Tokens'}
          </span> for every friend who signs up using your link and completes their profile.
        </p>
      </div>
    </div>
  );
};

export default GrowthBanner;
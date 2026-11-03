import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  isInstalledApp,
  requestPushPermission,
  shouldAskForPermission,
  syncPushSubscription,
} from '../lib/push';
import { queryKeys } from './queries';

// Installed-app notifications: asks on the first tap after install, keeps the
// subscription in sync, and mirrors ready bundles on the app icon badge.
export function usePwaNotifications(readyCount) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isInstalledApp()) return undefined;

    syncPushSubscription().catch((error) => console.error('Push sync failed', error));

    if (!shouldAskForPermission()) return undefined;

    const ask = () => requestPushPermission().catch((error) => console.error('Push permission failed', error));
    window.addEventListener('pointerdown', ask, { once: true });
    return () => window.removeEventListener('pointerdown', ask);
  }, []);

  useEffect(() => {
    const onMessage = (event) => {
      if (event.data?.type === 'push-received') {
        queryClient.invalidateQueries({ queryKey: queryKeys.batches });
      }
    };
    navigator.serviceWorker?.addEventListener('message', onMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', onMessage);
  }, [queryClient]);

  useEffect(() => {
    if (readyCount > 0 && navigator.setAppBadge) {
      navigator.setAppBadge(readyCount).catch(() => {});
    } else if (navigator.clearAppBadge) {
      navigator.clearAppBadge().catch(() => {});
    }
  }, [readyCount]);
}

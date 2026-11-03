import api from '../api';

const ASKED_KEY = 'push_prompt_asked_at';
const ASK_AGAIN_AFTER_MS = 14 * 24 * 60 * 60 * 1000;

export const isPushSupported = () =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

export const isInstalledApp = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;

const urlBase64ToUint8Array = (base64) => {
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
};

// Registers this device with the backend; safe to call repeatedly.
export async function syncPushSubscription() {
  if (!isPushSupported() || Notification.permission !== 'granted') return;

  const { data } = await api.get('push/public-key/');
  if (!data?.enabled || !data.public_key) return;

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.public_key),
    });
  }

  await api.post('push/subscribe/', subscription.toJSON());
}

export function shouldAskForPermission() {
  if (!isPushSupported() || Notification.permission !== 'default') return false;
  const lastAsked = Number(localStorage.getItem(ASKED_KEY) || 0);
  return Date.now() - lastAsked >= ASK_AGAIN_AFTER_MS;
}

// Asks at most once per 14 days; call from a user gesture because iOS requires it.
export async function requestPushPermission() {
  if (!shouldAskForPermission()) return;
  localStorage.setItem(ASKED_KEY, String(Date.now()));

  const result = await Notification.requestPermission();
  if (result === 'granted') await syncPushSubscription();
}

// Detaches this device from the account so the next user on it gets nothing.
export async function removePushSubscription() {
  if (!isPushSupported()) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;
    await api.post('push/unsubscribe/', { endpoint: subscription.endpoint });
    await subscription.unsubscribe();
  } catch (error) {
    console.error('Could not remove push subscription', error);
  }
}

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const GA_ID = import.meta.env.VITE_GA_ID;

function loadGa() {
  if (!GA_ID || window.gtag) return;
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
  document.head.appendChild(script);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  // Page views are sent manually on route change; IP anonymised
  window.gtag('config', GA_ID, { send_page_view: false, anonymize_ip: true });
}

// Strip tokens (e.g. /reset-password/<uid>/<token>) so secrets never reach Google
function safePath(pathname) {
  if (pathname.startsWith('/reset-password')) return '/reset-password';
  return pathname;
}

export default function Analytics() {
  const { pathname } = useLocation();

  useEffect(() => {
    loadGa();
  }, []);

  useEffect(() => {
    if (!GA_ID || !window.gtag) return;
    window.gtag('event', 'page_view', {
      page_path: safePath(pathname),
      page_location: window.location.origin + safePath(pathname),
    });
  }, [pathname]);

  return null;
}

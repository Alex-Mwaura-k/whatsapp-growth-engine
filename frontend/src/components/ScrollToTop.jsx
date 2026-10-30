import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll to the top-left corner of the page
    window.scrollTo(0, 0);
  }, [pathname]); // This effect runs every time the URL path changes

  return null; // This component doesn't render any UI
}
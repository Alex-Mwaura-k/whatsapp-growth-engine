import { useLocation } from 'react-router-dom';
import SEO from './SEO';

const PAGES = {
  '/login': { title: 'Log in', description: 'Log in to Growth Engine to swap WhatsApp contacts with people who opt in.' },
  '/register': { title: 'Sign up', description: 'Create a free Growth Engine account and exchange WhatsApp contacts with people who choose to connect.' },
};

const PRIVATE_PREFIXES = ['/forgot-password', '/reset-password', '/dashboard', '/profile', '/download', '/matches'];

// Landing, Terms and Privacy render their own <SEO>; this covers all other routes.
export default function RouteSEO() {
  const { pathname } = useLocation();

  if (PAGES[pathname]) return <SEO {...PAGES[pathname]} />;
  if (PRIVATE_PREFIXES.some((p) => pathname.startsWith(p))) {
    return <SEO title="Account" noindex />;
  }
  return null;
}

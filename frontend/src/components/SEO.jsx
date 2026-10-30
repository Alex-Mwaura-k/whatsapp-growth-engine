import { Helmet } from 'react-helmet-async';

export default function SEO({ title, description, url, image, noindex = false }) {
  const baseUrl = import.meta.env.VITE_SITE_URL || 'https://whatsapp-growth-engine.onrender.com';
  
  const siteTitle = title ? `${title} Growth Engine` : 'Growth Engine - Meaningful WhatsApp Connections';
  const defaultDesc = 'Save for Save made easier. Connect and exchange WhatsApp Contact details effortlessly for free.';
  const finalDescription = description || defaultDesc;
  
  const defaultImage = `${baseUrl}/pwa-192x192.png`;
  const finalImage = image || defaultImage;
  const finalUrl = url || baseUrl;

  return (
    <Helmet>
      <title>{siteTitle}</title>
      <meta name="description" content={finalDescription} />
      <link rel="canonical" href={finalUrl} />

      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow" />
      )}

      <meta property="og:type" content="website" />
      <meta property="og:url" content={finalUrl} />
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:image" content={finalImage} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={finalUrl} />
      <meta name="twitter:title" content={siteTitle} />
      <meta name="twitter:description" content={finalDescription} />
      <meta name="twitter:image" content={finalImage} />
    </Helmet>
  );
}
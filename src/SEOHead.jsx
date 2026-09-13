import { useEffect } from 'react';

const SITE_URL = 'https://voice-bussiness-tracker.vercel.app';
const DEFAULT_IMAGE = `${SITE_URL}/assets/trinetr-logo.jpg`;

export function SEOHead({
  title = 'Trinetr Business Suite — Smart ERP & Online Store',
  description = 'Track sales, expenses, inventory, customers, invoices, and business performance using natural voice commands. Complete with a modern D2C online storefront.',
  canonicalUrl = SITE_URL,
  ogImage = DEFAULT_IMAGE,
  ogType = 'website',
  noIndex = false,
  jsonLd = null,
}) {
  useEffect(() => {
    // 1. Update Title
    if (title) {
      document.title = title;
    }

    // 2. Helper to set or create meta tag
    const setMeta = (nameOrProp, key, val) => {
      if (!val) return;
      let el = document.querySelector(`meta[${nameOrProp}="${key}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(nameOrProp, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', val);
    };

    // 3. Set Standard Meta Tags
    setMeta('name', 'description', description);
    setMeta('name', 'robots', noIndex ? 'noindex, nofollow' : 'index, follow');

    // 4. Set Open Graph Tags (Must be absolute URLs)
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:url', canonicalUrl);
    setMeta('property', 'og:type', ogType);
    const resolvedImage = ogImage.startsWith('http')
      ? ogImage
      : `${SITE_URL}${ogImage.startsWith('/') ? '' : '/'}${ogImage}`;
    setMeta('property', 'og:image', resolvedImage);

    // 5. Set Twitter Card Tags
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', resolvedImage);

    // 6. Set Canonical Link
    let canon = document.querySelector('link[rel="canonical"]');
    if (!canon) {
      canon = document.createElement('link');
      canon.setAttribute('rel', 'canonical');
      document.head.appendChild(canon);
    }
    canon.setAttribute('href', canonicalUrl);

    // 7. Inject JSON-LD Schema
    const scriptId = 'trinetr-dynamic-jsonld';
    let script = document.getElementById(scriptId);
    if (jsonLd) {
      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.type = 'application/ld+json';
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(jsonLd);
    } else if (script) {
      script.remove();
    }
  }, [title, description, canonicalUrl, ogImage, ogType, noIndex, jsonLd]);

  return null;
}

export default SEOHead;

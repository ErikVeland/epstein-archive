import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  type?: string;
  url?: string;
  noindex?: boolean;
}

export const SEO: React.FC<SEOProps> = ({
  title = 'Epstein Files Archive',
  description = 'Comprehensive archive of the Epstein files, documents, and photos.',
  image = 'https://epstein.academy/og-image.png',
  type = 'website',
  url,
  noindex = false,
}) => {
  const siteTitle = 'Epstein Files Archive';
  const fullTitle = title === siteTitle ? siteTitle : `${title} | ${siteTitle}`;
  const currentUrl = url || window.location.href;
  const canonicalUrl = (() => {
    try {
      const parsed = new URL(currentUrl);
      return `${parsed.origin}${parsed.pathname}`;
    } catch {
      return currentUrl;
    }
  })();

  return (
    <Helmet>
      {/* Standard Metadata */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta
        name="robots"
        content={
          noindex
            ? 'noindex,nofollow'
            : 'index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1'
        }
      />
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={siteTitle} />
      <meta property="og:image:alt" content={fullTitle} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:image:alt" content={fullTitle} />
      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: fullTitle,
          description,
          url: canonicalUrl,
          isPartOf: {
            '@type': 'WebSite',
            name: siteTitle,
            url: 'https://epstein.academy/',
          },
        })}
      </script>
    </Helmet>
  );
};

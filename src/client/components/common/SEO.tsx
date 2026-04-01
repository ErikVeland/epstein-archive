import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  imageAlt?: string;
  type?: string;
  url?: string;
  canonical?: string;
  keywords?: string[];
  schema?: Record<string, unknown> | Array<Record<string, unknown>>;
  twitterCard?: 'summary' | 'summary_large_image';
  noindex?: boolean;
}

export const SEO: React.FC<SEOProps> = ({
  title = 'Epstein Files Archive',
  description = 'Comprehensive archive of the Epstein files, documents, and photos.',
  image = 'https://epstein.academy/og-image.png',
  imageAlt,
  type = 'website',
  url,
  canonical,
  keywords = [],
  schema,
  twitterCard = 'summary_large_image',
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
  const explicitCanonical = canonical || canonicalUrl;
  const defaultSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: fullTitle,
    description,
    url: explicitCanonical,
    isPartOf: {
      '@type': 'WebSite',
      name: siteTitle,
      url: 'https://epstein.academy/',
    },
  };
  const schemaPayload = Array.isArray(schema) ? schema : schema ? [schema] : [defaultSchema];

  return (
    <Helmet>
      {/* Standard Metadata */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords.length > 0 && <meta name="keywords" content={keywords.join(', ')} />}
      <meta
        name="robots"
        content={
          noindex
            ? 'noindex,nofollow'
            : 'index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1'
        }
      />
      <link rel="canonical" href={explicitCanonical} />

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={siteTitle} />
      <meta property="og:image:alt" content={imageAlt || fullTitle} />

      {/* Twitter */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:image:alt" content={imageAlt || fullTitle} />
      {schemaPayload.map((schemaItem, index) => (
        <script key={`seo-schema-${index}`} type="application/ld+json">
          {JSON.stringify(schemaItem)}
        </script>
      ))}
    </Helmet>
  );
};

import { Helmet } from "react-helmet-async";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  /** Optional schema.org structured data (e.g. Product) emitted as JSON-LD. */
  jsonLd?: Record<string, unknown>;
}

export function SEO({
  title = "Shankeshwar Traders",
  description = "Shankeshwar Traders - Your trusted local grocery store.",
  image = "/banner.jpg",
  url = "https://shankeshwartraders.in",
  jsonLd,
}: SEOProps) {
  const fullTitle = title === "Shankeshwar Traders" ? title : `${title} | Shankeshwar Traders`;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={url} />
      <meta property="twitter:title" content={fullTitle} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={image} />

      {/* Structured data */}
      {jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}
    </Helmet>
  );
}

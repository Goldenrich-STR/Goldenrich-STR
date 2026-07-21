import React from "react";
import { Helmet } from "react-helmet-async";
import { organizationSchema } from "../lib/seoSchemas";

const SITE_NAME = "X-Space360";
const SITE_URL = "https://x-space360.in";
const DEFAULT_IMAGE = `${SITE_URL}/images/xspace360-og-image.jpg`;

const DEFAULT_WEBSITE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://x-space360.in/#website",
  "url": "https://x-space360.in",
  "name": "X-Space360",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://x-space360.in/guest/browse?city={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
};

const DEFAULT_LOCAL_BUSINESS_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://x-space360.in/#localbusiness",
  "name": "X-Space360 Head Office",
  "image": "https://x-space360.in/favicon_rich.jpg",
  "telephone": "+919876543210",
  "email": "support@x-space360.in",
  "url": "https://x-space360.in",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Goldenrich STR Tower, Hiranandani Gardens",
    "addressLocality": "Mumbai",
    "addressRegion": "Maharashtra",
    "postalCode": "400076",
    "addressCountry": "IN"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 19.1176,
    "longitude": 72.9060
  },
  "openingHoursSpecification": {
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday"
    ],
    "opens": "00:00",
    "closes": "23:59"
  }
};

const SEO = ({
  title,
  description,
  path = "/",
  image = DEFAULT_IMAGE,
  keywords = [],
  noIndex = false,
  schema = null,
  canonicalUrl,
  robots,
  type = "website", // website, property, listing, blog, host, faq
  data = {},
  breadcrumbs = [],
  seo = null // API returned seo object: {title, description, keywords, canonical, image, robots}
}) => {
  const baseTitle = seo?.title || title || "Short-term Rentals & Event Venues";
  const pageTitle = baseTitle.includes(SITE_NAME) ? baseTitle : `${baseTitle} | ${SITE_NAME}`;
  const pageDesc = seo?.description || description || "Explore short-term rentals, premium villas, commercial spaces, and event venues across India on X-Space360.";
  const resolvedKeywords = seo?.keywords || keywords;
  const pageKeywords = Array.isArray(resolvedKeywords)
    ? resolvedKeywords.join(", ")
    : (resolvedKeywords || "short term rentals, luxury villas, event venues, banquet halls, co-working spaces, offices");
  const normalizedPath = path === "/" ? "/" : `/${String(path || "/").replace(/^\/+/, "")}`;
  const pageCanonical = seo?.canonical || canonicalUrl || `${SITE_URL}${normalizedPath}`;
  const pageRobots = seo?.robots || robots || (
    noIndex
      ? "noindex, nofollow"
      : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
  );
  const pageImage = seo?.image || image || DEFAULT_IMAGE;

  // 1. Generate BreadcrumbList Schema
  let breadcrumbSchema = null;
  if (breadcrumbs && breadcrumbs.length > 0) {
    breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": breadcrumbs.map((crumb, idx) => ({
        "@type": "ListItem",
        "position": idx + 1,
        "name": crumb.name,
        "item": crumb.url.startsWith("http") ? crumb.url : `https://x-space360.in${crumb.url}`
      }))
    };
  }

  // 2. Main Page Schema
  let pageSchema = null;

  if (type === "website") {
    pageSchema = [
      organizationSchema,
      DEFAULT_WEBSITE_SCHEMA,
      DEFAULT_LOCAL_BUSINESS_SCHEMA
    ];
  } else if (type === "property" && data) {
    const p = data;
    const basePrice = p.price_per_night || p.price || 0;
    const cleanImages = Array.isArray(p.images) && p.images.length > 0
      ? p.images.map(img => img.startsWith("http") ? img : `https://x-space360.in/api/uploads/${img}`)
      : [pageImage];

    const accommodationSchema = {
      "@context": "https://schema.org",
      "@type": p.category === "commercial" ? "CommercialProperties" : "Accommodation",
      "@id": `https://x-space360.in/property/${p.property_id}#accommodation`,
      "name": p.title,
      "description": p.description,
      "image": cleanImages,
      "address": {
        "@type": "PostalAddress",
        "streetAddress": p.address || "",
        "addressLocality": p.city || "",
        "addressRegion": p.state || "",
        "postalCode": p.pin_code || "",
        "addressCountry": "IN"
      },
      "geo": p.latitude && p.longitude ? {
        "@type": "GeoCoordinates",
        "latitude": parseFloat(p.latitude),
        "longitude": parseFloat(p.longitude)
      } : undefined,
      "offers": {
        "@type": "Offer",
        "price": basePrice,
        "priceCurrency": p.currency || "INR",
        "availability": p.status === "live" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        "url": `https://x-space360.in/property/${p.property_id}`
      },
      "amenityFeature": Array.isArray(p.amenities) ? p.amenities.map(amenity => ({
        "@type": "LocationFeatureSpecification",
        "name": amenity,
        "value": true
      })) : []
    };

    if (p.host) {
      accommodationSchema.provider = {
        "@type": p.host.role === "host" ? "Person" : "Organization",
        "name": p.host.full_name,
        "image": p.host.profile_image ? (p.host.profile_image.startsWith("http") ? p.host.profile_image : `https://x-space360.in/api/uploads/${p.host.profile_image}`) : undefined
      };
    }

    if (p.rating && p.review_count) {
      accommodationSchema.aggregateRating = {
        "@type": "AggregateRating",
        "ratingValue": parseFloat(p.rating),
        "reviewCount": parseInt(p.review_count),
        "bestRating": "5",
        "worstRating": "1"
      };
    }

    if (Array.isArray(data.reviews) && data.reviews.length > 0) {
      accommodationSchema.review = data.reviews.map(rev => ({
        "@type": "Review",
        "author": {
          "@type": "Person",
          "name": rev.guest_name || "Guest"
        },
        "datePublished": rev.created_at ? rev.created_at.substring(0, 10) : undefined,
        "reviewBody": rev.comment || "",
        "reviewRating": {
          "@type": "Rating",
          "ratingValue": parseFloat(rev.rating || 5)
        }
      }));
    }

    pageSchema = accommodationSchema;
  } else if (type === "listing" && Array.isArray(data.properties)) {
    const listItems = data.properties.map((p, idx) => ({
      "@type": "ListItem",
      "position": idx + 1,
      "url": `https://x-space360.in/property/${p.property_id}`,
      "name": p.title,
      "image": p.images && p.images[0] ? (p.images[0].startsWith("http") ? p.images[0] : `https://x-space360.in/api/uploads/${p.images[0]}`) : undefined
    }));

    pageSchema = {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": title || "Browse Properties",
      "description": pageDesc,
      "url": pageCanonical,
      "mainEntity": {
        "@type": "ItemList",
        "numberOfItems": listItems.length,
        "itemListElement": listItems
      }
    };
  } else if (type === "blog" && data) {
    const post = data;
    pageSchema = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": post.title || title,
      "image": post.image ? [post.image] : [pageImage],
      "datePublished": post.date || new Date().toISOString().substring(0, 10),
      "dateModified": post.date || new Date().toISOString().substring(0, 10),
      "author": {
        "@type": "Person",
        "name": post.author || "X-Space360 Editor"
      },
      "publisher": organizationSchema,
      "description": post.excerpt || pageDesc
    };
  } else if (type === "host" && data) {
    const host = data;
    pageSchema = {
      "@context": "https://schema.org",
      "@type": "Person",
      "name": host.full_name,
      "image": host.profile_image ? (host.profile_image.startsWith("http") ? host.profile_image : `https://x-space360.in/api/uploads/${host.profile_image}`) : undefined,
      "jobTitle": "Property Host",
      "worksFor": organizationSchema
    };
  } else if (type === "faq" && Array.isArray(data.faqs)) {
    pageSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": data.faqs.map(faq => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer
        }
      }))
    };
  }

  const finalSchemas = [];
  if (pageSchema) {
    if (Array.isArray(pageSchema)) {
      finalSchemas.push(...pageSchema);
    } else {
      finalSchemas.push(pageSchema);
    }
  }
  if (breadcrumbSchema) {
    finalSchemas.push(breadcrumbSchema);
  }
  if (schema) {
    if (Array.isArray(schema)) {
      finalSchemas.push(...schema);
    } else {
      finalSchemas.push(schema);
    }
  }

  return (
    <Helmet>
      {/* Basic SEO */}
      <title>{pageTitle}</title>
      <meta name="description" content={pageDesc} />
      {pageKeywords && <meta name="keywords" content={pageKeywords} />}
      <meta name="robots" content={pageRobots} />

      {/* Canonical */}
      <link rel="canonical" href={pageCanonical} />

      {/* Multilingual hreflang Support */}
      <link rel="alternate" hrefLang="en" href={pageCanonical} />
      <link rel="alternate" hrefLang="hi" href={pageCanonical} />
      <link rel="alternate" hrefLang="mr" href={pageCanonical} />
      <link rel="alternate" hrefLang="x-default" href={pageCanonical} />

      {/* Open Graph Tags */}
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDesc} />
      <meta property="og:image" content={pageImage} />
      <meta property="og:image:alt" content={`${baseTitle} - ${SITE_NAME}`} />
      <meta property="og:url" content={pageCanonical} />
      <meta property="og:type" content={type === "blog" ? "article" : type === "property" ? "place" : "website"} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_IN" />

      {/* Twitter Card Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDesc} />
      <meta name="twitter:image" content={pageImage} />
      <meta name="twitter:url" content={pageCanonical} />

      {/* JSON-LD Schemas */}
      {finalSchemas.map((schema, idx) => (
        <script key={idx} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
};

export default SEO;

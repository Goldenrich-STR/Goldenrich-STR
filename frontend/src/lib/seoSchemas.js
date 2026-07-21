const SITE_URL = "https://x-space360.in";

const organizationSocialLinks = [
  // Add official social URLs here when they are live.
].filter((url) => /^https?:\/\//i.test(url));

export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: "X-Space360",
  url: `${SITE_URL}/`,
  logo: {
    "@type": "ImageObject",
    url: `${SITE_URL}/images/logo.png`,
  },
  image: `${SITE_URL}/images/xspace360-og-image.jpg`,
  description:
    "X-Space360 is a smart booking and property discovery platform for residential stays, commercial workspaces and event venues.",
  foundingOrganization: {
    "@type": "Organization",
    name: "Golden Rich Financial & Real Estate Solutions Pvt. Ltd.",
  },
  address: {
    "@type": "PostalAddress",
    addressLocality: "Nashik",
    addressRegion: "Maharashtra",
    addressCountry: "IN",
  },
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    areaServed: "IN",
    availableLanguage: ["English", "Marathi", "Hindi"],
  },
  ...(organizationSocialLinks.length ? { sameAs: organizationSocialLinks } : {}),
};

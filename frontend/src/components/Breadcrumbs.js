import React from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";

const SITE_URL = "https://x-space360.in";

const normalizePath = (path = "/") => {
  if (!path || path === "/") return "/";
  if (/^https?:\/\//i.test(path)) return path;
  return `/${String(path).replace(/^\/+/, "")}`;
};

const toAbsoluteUrl = (path = "/") => {
  const normalizedPath = normalizePath(path);
  return normalizedPath.startsWith("http")
    ? normalizedPath
    : `${SITE_URL}${normalizedPath}`;
};

function Breadcrumbs({ items = [], className = "" }) {
  const safeItems = items
    .filter((item) => item?.name && item?.path)
    .map((item) => ({
      ...item,
      path: normalizePath(item.path),
    }));

  if (!safeItems.length) return null;

  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: safeItems.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: toAbsoluteUrl(item.path),
    })),
  };

  return (
    <>
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      </Helmet>

      <nav aria-label="Breadcrumb" className={className}>
        <ol className="flex flex-wrap items-center gap-2 text-xs font-semibold text-charcoal-muted">
          {safeItems.map((item, index) => {
            const isLast = index === safeItems.length - 1;
            return (
              <li key={`${item.path}-${index}`} className="flex items-center gap-2">
                {index > 0 && <span className="text-charcoal-muted/50">/</span>}
                {isLast ? (
                  <span aria-current="page" className="text-charcoal">
                    {item.name}
                  </span>
                ) : (
                  <Link to={item.path} className="hover:text-terracotta transition-colors">
                    {item.name}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}

export default Breadcrumbs;

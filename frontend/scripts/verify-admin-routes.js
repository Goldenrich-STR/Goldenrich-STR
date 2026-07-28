const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const appFile = path.join(root, 'src', 'App.js');
const navFile = path.join(root, 'src', 'pages', 'admin', 'adminNavigation.js');

const appSource = fs.readFileSync(appFile, 'utf8');
const navSource = fs.readFileSync(navFile, 'utf8');

const routeMatches = [...appSource.matchAll(/<Route\s+path="([^"]+)"/g)].map((match) => match[1]);
const nestedAdminRoutes = new Set(
  routeMatches
    .filter((route) => !route.startsWith('/'))
    .map((route) => `/admin/${route}`)
);

const absoluteAdminRoutes = new Set(routeMatches.filter((route) => route.startsWith('/admin')));
const adminRoutes = new Set([...nestedAdminRoutes, ...absoluteAdminRoutes]);
const navPaths = [...navSource.matchAll(/path:\s*'([^']+)'/g)].map((match) => match[1]);

const missing = navPaths.filter((navPath) => !adminRoutes.has(navPath));

if (missing.length) {
  console.error('Admin navigation paths missing matching routes:');
  missing.forEach((route) => console.error(`- ${route}`));
  process.exit(1);
}

console.log(`Admin route coverage OK: ${navPaths.length} navigation paths verified.`);

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const appFile = path.join(root, 'src', 'App.js');
const navFile = path.join(root, 'src', 'pages', 'admin', 'adminNavigation.js');
const buildIndex = path.join(root, 'build', 'index.html');

const appSource = fs.readFileSync(appFile, 'utf8');
const navSource = fs.readFileSync(navFile, 'utf8');
const apiSource = fs.readFileSync(path.join(root, 'src', 'services', 'api.js'), 'utf8');

const lazyImports = [...appSource.matchAll(/lazy\(\(\) => import\("([^"]+)"\)\)/g)]
  .map((match) => match[1])
  .filter((importPath) => importPath.includes('/admin/'));

const missingImports = lazyImports
  .map((importPath) => {
    const resolved = path.join(root, 'src', `${importPath.replace('./', '')}.js`);
    return fs.existsSync(resolved) ? null : `${importPath}.js`;
  })
  .filter(Boolean);

const navPaths = [...navSource.matchAll(/path:\s*'([^']+)'/g)].map((match) => match[1]);
const duplicateNavPaths = navPaths.filter((route, index) => navPaths.indexOf(route) !== index);

const requiredAdminShellMarkers = [
  'AdminLayout',
  'ProtectedRoute allowedRoles={["admin"]}',
  'path="/admin"',
  '<Outlet />',
];

const missingShellMarkers = requiredAdminShellMarkers.filter((marker) => !appSource.includes(marker) && !fs.readFileSync(path.join(root, 'src', 'pages', 'admin', 'AdminLayout.js'), 'utf8').includes(marker));

const buildMissing = !fs.existsSync(buildIndex);
const apiTimeoutMissing = !apiSource.includes('timeout: 60000');
const apiErrorHelperMissing = !apiSource.includes('getApiErrorMessage');

const failures = [
  ...missingImports.map((item) => `Missing lazy import file: ${item}`),
  ...duplicateNavPaths.map((item) => `Duplicate admin nav path: ${item}`),
  ...missingShellMarkers.map((item) => `Missing admin shell marker: ${item}`),
  ...(buildMissing ? ['Production build index.html is missing. Run npm run build first.'] : []),
  ...(apiTimeoutMissing ? ['API client timeout hardening is missing.'] : []),
  ...(apiErrorHelperMissing ? ['API error message helper is missing.'] : []),
];

if (failures.length) {
  console.error('Admin smoke check failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Admin smoke OK: ${navPaths.length} nav paths, ${lazyImports.length} admin page imports and production build verified.`);

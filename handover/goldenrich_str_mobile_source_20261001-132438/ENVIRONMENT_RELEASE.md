# X-Space360 Mobile Environment Separation

## Environments

| Flavor | App label | Application ID | API source |
| --- | --- | --- | --- |
| `dev` | `X-Space360 Dev` | `com.xspace360.app.dev` | Required `--dart-define=API_BASE_URL=...` |
| `uat` | `X-Space360 UAT` | `com.xspace360.app.uat` | Required `--dart-define=API_BASE_URL=...` |
| `prod` | `X-Space360` | `com.xspace360.app` | `https://api.x-space360.in` only |

Non-production builds must explicitly provide `APP_ENV` and `API_BASE_URL`.
Production builds may omit `API_BASE_URL`; if provided, it must be exactly `https://api.x-space360.in`.

## Build Guard

Run before CI builds:

```powershell
dart run tool/build_guard.dart --APP_ENV=production --API_BASE_URL=https://api.x-space360.in --PAYMENT_MODE=live
```

## Build Commands

Development:

```powershell
flutter run --flavor dev --dart-define=APP_ENV=dev --dart-define=API_BASE_URL=<DEV_API_URL> --dart-define=PAYMENT_MODE=test
```

UAT:

```powershell
flutter build apk --flavor uat --dart-define=APP_ENV=uat --dart-define=API_BASE_URL=<UAT_API_URL> --dart-define=PAYMENT_MODE=test
```

Production:

```powershell
dart run tool/build_guard.dart --APP_ENV=production --API_BASE_URL=https://api.x-space360.in --PAYMENT_MODE=live
flutter build appbundle --release --flavor prod --dart-define=APP_ENV=production --dart-define=API_BASE_URL=https://api.x-space360.in --dart-define=PAYMENT_MODE=live
powershell -ExecutionPolicy Bypass -File tool/scan_production_artifact.ps1 -ArtifactPath build/app/outputs/bundle/prodRelease/app-prod-release.aab
```

## Release Checklist

- Flavor is `prod`.
- Build mode is `release`.
- API is `https://api.x-space360.in`.
- `PAYMENT_MODE=live`.
- `MOCK_MODE=false`.
- `DEMO_MODE=false`.
- No runtime API/environment switch is present.
- Android production cleartext traffic is disabled.
- iOS ATS broad arbitrary loads are disabled.
- Final AAB scan passes.

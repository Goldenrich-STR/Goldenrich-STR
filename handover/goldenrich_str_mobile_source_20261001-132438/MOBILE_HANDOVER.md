# X-Space360 Flutter Mobile Handover

## Source

- Project: `goldenrich_str_mobile`
- App version: `1.0.2+8`
- Flutter: `3.44.1` stable
- Dart: `3.12.1`
- Verified commands:
  - `flutter pub get`
  - `flutter test`
  - `dart run tool/build_guard.dart --APP_ENV=production --API_BASE_URL=https://api.x-space360.in --PAYMENT_MODE=live`

## App IDs

- Android production package/application ID: `com.xspace360.app`
- Android dev package/application ID: `com.xspace360.app.dev`
- Android UAT package/application ID: `com.xspace360.app.uat`
- iOS bundle ID: `com.goldenrich.str.goldenrichStrMobile`
- iOS deployment target: `13.0`
- iOS signing style: Automatic

## API And Environment

Production uses:

```sh
APP_ENV=production
API_BASE_URL=https://api.x-space360.in
PAYMENT_MODE=live
```

Production build:

```sh
flutter pub get
dart run tool/build_guard.dart --APP_ENV=production --API_BASE_URL=https://api.x-space360.in --PAYMENT_MODE=live
flutter build appbundle --release --flavor prod --dart-define=APP_ENV=production --dart-define=API_BASE_URL=https://api.x-space360.in --dart-define=PAYMENT_MODE=live
```

Development run:

```sh
flutter pub get
flutter run --flavor dev --dart-define=APP_ENV=dev --dart-define=API_BASE_URL=<DEV_API_URL> --dart-define=PAYMENT_MODE=test
```

UAT build:

```sh
flutter pub get
flutter build apk --flavor uat --dart-define=APP_ENV=uat --dart-define=API_BASE_URL=<UAT_API_URL> --dart-define=PAYMENT_MODE=test
```

## Third-Party Integrations

- Razorpay is used through `razorpay_flutter`. The app receives `razorpay_key_id`, `razorpay_order_id`, and amount from backend APIs; static Razorpay secret keys are not stored in the mobile source.
- Maps use `flutter_map` with OpenStreetMap/CARTO tiles. Defaults can be overridden with:
  - `MAP_TILE_URL`
  - `MAP_ATTRIBUTION`
  - `MAP_USER_AGENT`
- OTP is handled by backend APIs:
  - `/api/auth/send-otp`
  - `/api/auth/verify-otp`
- In-app notifications are loaded from backend notification APIs. No Firebase Cloud Messaging package/config is present in this Flutter project.
- No `google-services.json` or `GoogleService-Info.plist` exists in this source tree.

## Test Credentials Found In Repo Tests

These are repository test/demo credentials, not verified against production:

- Guest: `guest@propnest.com` / `guest123`
- Host: `host@propnest.com` / `host123`
- Broker: `broker@propnest.com` / `broker123`
- Employee: `employee@propnest.com` / `employee123`
- Admin: `admin@propnest.com` / `admin123`

Production credentials should be provided by the backend/admin owner if these accounts are not enabled in the target environment.

## iOS Notes

For iOS Simulator:

```sh
flutter pub get
flutter run -d ios --dart-define=APP_ENV=production --dart-define=API_BASE_URL=https://api.x-space360.in --dart-define=PAYMENT_MODE=live
```

For physical device or App Store builds, open `ios/Runner.xcworkspace` in Xcode and select the correct Apple Team/signing profile for bundle ID `com.goldenrich.str.goldenrichStrMobile`.

## Android Release Signing

Android release signing is configured through `android/key.properties` and the referenced release keystore file. If building release artifacts on another machine, keep the referenced keystore path valid or update `android/key.properties`.

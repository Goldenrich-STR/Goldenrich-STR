# iOS development on this Mac

The project uses Flutter, Xcode, Swift Package Manager, and CocoaPods. Open the
workspace, rather than the `.xcodeproj`, when working in Xcode.

```bash
cd mobile
flutter pub get
cd ios
pod install
cd ..
open ios/Runner.xcworkspace
```

Minimum iOS version: **15.0**.
Current bundle identifier: `com.goldenrich.str.goldenrichStrMobile`.

Use Flutter **3.47.8** (Dart **3.13.7**) to reproduce the verified local setup.
The dependency lockfile requires Flutter >=3.44 and Dart >=3.12; these minimums
are declared in `pubspec.yaml`. Keep `pubspec.lock` and `ios/Podfile.lock` when
moving the source to another Mac. Regenerate local paths with `flutter pub get`
and `pod install`; do not copy absolute paths from generated configuration.

Camera video capture includes a microphone usage description. The launch screen
uses the existing X-Space360 logo; original launch image assets are retained.

## OTP verification status

The mobile OTP countdown uses the server's `expires_in` and an absolute expiry
time, so backgrounding the app does not extend validity. Verification errors
from the server are displayed instead of treating every failure as an invalid
code. The first OTP field advertises iOS one-time-code AutoFill support.

The backend now normalizes phone numbers consistently for send and verify.
Deploy the backend and updated mobile code together to use the full fix.
Existing resend cooldown, send limits, failed-delivery invalidation, and
non-disclosure of OTPs are preserved from `release/ios-otp-only`.
After a backend update, request a fresh OTP rather than reusing a code issued
under the old phone-number storage format.

Local checks passed: nine Flutter tests, six backend OTP regression tests, and
an iOS Simulator debug build. Tests mock SMS delivery; they do not confirm live
delivery. Local `.env` currently enables MSG91 demo mode and has no SMS auth key
or template configured. Real SMS requires the existing production gateway's
valid configuration and a separately authorized live test. No production
credentials, endpoints, or signing settings were changed for these fixes.

```bash
# From mobile/
flutter test
# From backend/
.venv/bin/python -m pytest tests/test_otp_flow.py -q
```

## Run in the Simulator

```bash
xcrun simctl list devices available
xcrun simctl boot <simulator-device-id>
flutter run -d <simulator-device-id>
```

The default app configuration connects to the production API. Use a development
or UAT API explicitly when testing changes:

```bash
flutter run -d <simulator-device-id> \
  --dart-define=APP_ENV=uat \
  --dart-define=API_BASE_URL=https://your-uat-api.example.com \
  --dart-define=PAYMENT_MODE=test
```

iOS does not have the Android `dev`, `uat`, and `prod` schemes configured. Use the
commands above without `--flavor` for the current iOS project.

On this Mac, the iOS 27 iPhone 18 Pro simulator used for verification has ID
`342AEC88-E51E-42B4-ACE3-C9868A2554DE`. It is already booted after setup; skip
the boot command when a device is already running. The standalone
`Simulator.app` was not found, but command-line simulator installation, launch,
and screenshot capture succeeded.

## Run on a physical iPhone

1. Sign in with your Apple account in Xcode Settings > Accounts.
2. Open `ios/Runner.xcworkspace`, select Runner > Signing & Capabilities, and
   choose your team with automatic signing enabled.
3. Verify the bundle identifier against the existing live app's App Store
   Connect record before editing any identifier. The Android application ID in
   `ENVIRONMENT_RELEASE.md` does not establish the live iOS Bundle ID.
4. Connect and trust the iPhone, enable Developer Mode if prompted, and select
   it as the run destination.
5. Run from Xcode or use `flutter run -d <iphone-device-id>`.

The project specifies a development team. An unrestricted system-keychain check
found development/distribution certificates and App Store provisioning profiles
for the current Bundle ID; sandboxed checks had reported no identities. The
main project's automatic-signing/distribution-identity conflict must be resolved
for a signed archive. Deployment preparation uses a separate project/workspace
copy so the original signing settings remain intact. The live App Store app
record and latest uploaded build still need verification before upload.

## Prepare a distribution build

An Apple Developer Program membership, registered app identifier, distribution
signing, and App Store Connect app record are needed for TestFlight/App Store.
After account setup:

```bash
flutter build ipa --release \
  --dart-define=APP_ENV=production \
  --dart-define=API_BASE_URL=https://api.x-space360.in \
  --dart-define=PAYMENT_MODE=live
```

Review the archive and upload through Xcode Organizer. This setup does not
publish an app or create an App Store Connect record.

## Branch safety

These changes are prepared on `release/ios-otp-only`. No frontend source,
production credentials, or deployment workflows are changed. A branch push is
not a production rollout; review any external branch-triggered deployment hooks
before merging or deploying. The temporary signing project copies and IPA/build
outputs are local artifacts and are excluded from this source commit.

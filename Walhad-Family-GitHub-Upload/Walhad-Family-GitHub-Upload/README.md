# Walhad Family — native iOS & Android app

A green-and-white React Native + Expo messaging application. **Development version, not release-ready and not published.** No conversations, users, or call buttons are simulated.

**Start here:** [Quick start](docs/QUICK_START_WINDOWS.md) · [Verification report](VERIFICATION.md) · [Real-phone test checklist](docs/DEVICE_TESTS.md).

## What is implemented

- Email/password registration, persistent login, email verification, password reset and sign-out.
- Verified-user discovery, editable display names/bios, profile-picture upload and approximate online status.
- Firestore-backed private one-to-one text chats, real-time listeners, message history pagination and last-message previews.
- Stream Video native WebRTC audio/video calls, two-member rooms, server-created call invites, accept/decline/end, microphone/camera controls through the SDK and missed-call cleanup.
- Standard Expo push notifications for messages and incoming calls; taps open the relevant conversation or call. Server-side Expo ticket/receipt handling removes expired device tokens.
- User blocking enforced for new messages and call creation; report submission for operator review.
- Account deletion in the app, with recent-login check, deletion of profile/photos/private conversations and Stream user data.
- Firestore/Storage rules, Cloud Functions, EAS build profiles, automated tests and CI configuration.

## What is NOT yet provided or verified

- No APK, AAB, IPA, TestFlight upload or store submission has been produced. JavaScript bundling is **not** native compilation or a device test.
- **No native CallKit/PushKit or Android full-screen incoming-call interface.** This version sends ordinary notifications. Incoming-call notification delivery in the background/terminated state depends on OS settings, APNs/FCM, Expo and network conditions. Tap a timely notification to open the call. There is no guarantee of a loud/continuous ring, locked-screen call UI or wake-up after force-stop. `ringing: false` in the native Stream plugin is intentional. Full native ringing is a separate integration and physical-device test milestone.
- Calls, real service authentication, photo uploads and push delivery have not been exercised on phones. The automated real-time messaging test uses the real Firestore emulator, not the production project.
- Messages are **not end-to-end encrypted**. Firebase and Stream provide their normal transport/service security; do not advertise WhatsApp-level E2EE.
- Discovery displays the first 200 verified-directory profiles, not a scalable searchable directory. Every verified account can discover profiles. The app is not invite-only.
- Online status uses a 40-second foreground heartbeat and a 100-second expiry; it is approximate. No guaranteed offline history/outbox across restarts is implemented with the Firebase JS SDK.
- No group chats, message attachments, read receipts, recordings, contact imports, moderation dashboard or automated report response.
- Dependency audits still report vulnerabilities. Review `qa/dependency-audit.json` and `qa/backend-dependency-audit.json`; dependency/security work is a release blocker. Do not run `npm audit fix --force` blindly: suggested SDK downgrades can break Expo and Stream.
- No production App Check attestation, comprehensive abuse controls, load test or external security audit has been completed. Verified email alone does not prevent all abuse.

## Architecture

```text
Native app (Expo development/production build; not Expo Go)
 ├─ Firebase Auth: email/password and verified ID tokens
 ├─ Firestore: profiles, private chats/messages, call-invite state
 ├─ Firebase Storage: avatars
 ├─ Cloud Functions: Stream tokens/room creation, call actions,
 │                   notification dispatch, blocks/reports/deletion
 ├─ Stream native SDK: managed WebRTC signaling, media and connectivity
 └─ Expo Push Service → FCM (Android) / APNs (iOS)
```

There is no custom TURN server to operate: Stream provides the managed media/connectivity service. A Stream subscription or trial must cover your use. Firestore carries call-invitation state; it does not carry media or raw SDP/ICE signaling in this implementation.

## Source map

```text
index.js                     native entry point
app.config.js                identifiers, permissions, Expo native plugins
.env.example                 public client configuration
package.json / package-lock.json
src/App.tsx                  auth, discovery, chats, profiles and calling UI
src/api.ts                   messaging, presence, push and callable clients
src/firebase.ts              persistent native Firebase auth initialization
src/model.mjs                deterministic IDs, validation and presence logic
src/theme.ts                 branding and layout
assets/                      app icon, adaptive icon and splash image
functions/src/index.ts       trusted Firebase backend
functions/package*.json      backend dependency manifest/lockfile
firestore.rules              profile, chat and device-token authorization
storage.rules                avatar ownership/type/size rules
firestore.indexes.json       scheduled call-expiry index
firebase.json                deployment + emulator configuration
eas.json                     development, preview and production builds
tests/                       core logic and Firestore/Storage emulator tests
.github/workflows/checks.yml  compile/test/bundle CI (no deployment)
qa/                          actual check logs and dependency audit results
docs/                        setup, device tests, publication and policy templates
```

`android/` and `ios/` are generated by Expo prebuild, ignored in Git and excluded from the downloadable source archive. Generate them from the checked-in config when needed. Native build outputs and `node_modules` are not source deliverables.

## Required accounts and costs

| Service/account | Why needed | Cost model / action |
|---|---|---|
| Firebase / Google Cloud | Authentication, Firestore, Storage, Functions, scheduler and secrets | This backend requires a **Blaze billing-enabled project**. Usage and regional charges apply, including compute, storage, egress, scheduler and secrets. Free allowances do not guarantee a zero bill. Set budget alerts; they are not hard spending caps. |
| Stream Video | Native WebRTC media, connectivity and token-authenticated rooms | Create a Video app; evaluate current trial/free allowances and paid participant-minute/concurrency rates for production. Do not assume indefinite free service. |
| Expo / EAS | Development builds, cloud Android/iOS compilation and push relay | Account required for this workflow. EAS has limited free allowances and paid build plans; choose current limits appropriate to your use. Push transport still requires valid APNs/FCM credentials. |
| Apple Developer Program | Signed iPhone builds, APNs and App Store distribution | Paid membership is generally required for this EAS real-iPhone/store workflow; confirm current local annual price and eligibility with Apple. |
| Google Play Console | Google Play distribution | Paid developer registration; confirm current local fee and verification/testing requirements. Not needed merely to sideload a test APK. |
| GitHub | Source versioning and CI | Free/private repositories can be used; CI allowances vary by plan. No GitHub Pages runtime is needed for a native app. |
| Privacy/support website | Store policy, support and deletion-request URLs | Can use free static hosting or a paid domain. Hosting the source does not install the mobile app. |

Official pricing and setup links (check them before paying):
- https://firebase.google.com/pricing
- https://getstream.io/video/pricing/
- https://expo.dev/pricing
- https://developer.apple.com/programs/enroll/
- https://support.google.com/googleplay/android-developer/answer/6112435
- https://docs.expo.dev/push-notifications/push-notifications-setup/

## Detailed Windows setup

### 1. Install tools and dependencies

Install **Node.js 22.12 or newer in the Node 22 LTS line**, Git for Windows and JDK 21 (for local emulator/rules tests). Restart PowerShell after installation. EAS cloud builds avoid installing Xcode on Windows; local iOS builds require a Mac with Xcode.

Extract the archive, open PowerShell in its `walhad-family-mobile` folder, then:

```powershell
node --version
npm --version
java --version
npm ci
npm --prefix functions ci
Copy-Item .env.example .env
```

If PowerShell blocks `npm.ps1`, use `npm.cmd` and `npx.cmd` instead. Do not weaken system-wide execution policy just to run this project.

### 2. Create Firebase services

1. Create a Firebase project and attach a Blaze billing account. Set budget alerts in Google Cloud.
2. Enable Authentication → **Email/Password**. Set an enforced password policy of at least 8 characters; the client checks 8 on signup too. Configure verification/reset email templates and test their delivery. Enable email-enumeration protection if supported by your project.
3. Create Firestore in production mode, select your data region, and enable Cloud Storage. This source deploys Functions to the default `us-central1`; keep `EXPO_PUBLIC_FUNCTIONS_REGION=us-central1` unless you explicitly change the backend region too.
4. Add a **Web app** inside Firebase Project Settings to obtain the Firebase JS SDK configuration. The native app uses the Firebase JavaScript SDK: copy the Web app's values into the matching `EXPO_PUBLIC_FIREBASE_*` variables in `.env`.
5. Register an **Android app** with your unique package name (default `com.walhad.family`; change both platform identifiers in `app.config.js` before your first store upload). Download `google-services.json` to the project root. It is used for Android push configuration, not as an Admin SDK credential.
6. Configure FCM v1 and create/download the appropriate Google service-account credential for Expo's FCM sending integration. Upload it through `eas credentials` in step 5 below. **Never commit that service-account JSON or put it in `EXPO_PUBLIC_*`.**
7. This version uses Expo APNs notifications on iOS, not native Firebase Messaging. An iOS `GoogleService-Info.plist` is not required by this implementation.

### 3. Create Stream Video and restrict room permissions

1. Create a Stream account and a **Video & Audio** app. Obtain its API key and server secret.
2. Put only the public key in `EXPO_PUBLIC_STREAM_API_KEY` in `.env`.
3. In Stream's call-type settings use the `default` call type used by the code. Disable recording/transcription unless you deliberately add consent and retention handling.
4. **Critical:** restrict client roles so ordinary authenticated users cannot create rooms, change room members, join/read rooms they do not belong to, or administer calls. Grant appropriate join/send-audio/send-video permissions to actual call members, not arbitrary global users. Room creation and global end operations in this app run with the server secret. Check the exact permission labels available in your Stream dashboard/version.
5. Test with a **third signed-in user** that a valid Stream token cannot join another pair's room. Firebase rules do not protect Stream endpoints; both systems require correct permissions.
6. Do not enable Stream-native push/ringing just by changing the config flag. This source uses its own Firestore invites and Expo notification dispatch; native ringing needs its own documented Stream integration and device tests.

### 4. Create Expo project, notification access and backend secrets

```powershell
npx eas-cli login
npx eas-cli init
```

Use/create an Expo project and copy its UUID into `EXPO_PUBLIC_EAS_PROJECT_ID` in `.env`. The config reads that environment variable. If `eas init` cannot edit the dynamic config, add the displayed UUID to `.env` manually and rerun. Set `EXPO_OWNER` locally if an organization owner is needed.

Create an Expo access token in your Expo account settings and enable enhanced push security for your Expo project. Keep that token server-side only. It authorizes this backend's calls to Expo's push API.

```powershell
npx firebase login
npx firebase use --add
# Select your real project and a default alias. Do NOT deploy to demo-walhad.
npx firebase functions:secrets:set STREAM_SECRET
npx firebase functions:secrets:set EXPO_ACCESS_TOKEN
npx firebase deploy --only firestore:rules,firestore:indexes,storage
npx firebase deploy --only functions
```

Enter the Stream secret and Expo access token only when prompted. Function deployment also prompts for the public `STREAM_API_KEY` parameter. Use the same key as the client. Allow required Cloud APIs (Functions, Cloud Build, Artifact Registry, Cloud Scheduler, Eventarc and Secret Manager) to be enabled. The Firebase CLI may write a backend `.env.<project-id>` for public parameters; never put server secrets in that file.

Wait for Firestore indexes to finish building. Check Cloud Functions logs for deployment/runtime errors. `messageCreated`, `callCreated` and `maintenance` handle notification dispatch/receipts and expiry; all callable functions must also be deployed. Re-deploy affected functions after rotating secrets. No service-account private key is required in the phone app.

### 5. Configure EAS environments and push credentials

Client `EXPO_PUBLIC_*` values are public and included in the app binary. They are **not** a safe place for Stream secrets, Expo access tokens or Admin SDK keys.

```powershell
# Upload the public client variables for a development build.
npx eas-cli env:push --environment development --path .env
# Upload google-services.json as a protected build file variable.
npx eas-cli env:create --environment development --name GOOGLE_SERVICES_JSON --type file --value .\google-services.json --visibility secret
npx eas-cli credentials --platform android
npx eas-cli credentials --platform ios
```

In Android credentials, configure **FCM v1 push credentials** using the appropriate service-account key for the same Firebase project. On iOS, sign in to Apple and let EAS create/manage the signing certificate, provisioning profile and APNs key. Confirm that the app identifier has push capability. If you change native capabilities/credentials/config, make a new native build; restarting Metro cannot add native modules or entitlements.

When you later use preview/production profiles, repeat `env:push` and the Android file variable for those EAS environments, using the intended staging/production Firebase and Stream projects. `eas.json` explicitly selects each environment.

### 6. Build and install on real phones

**Android (Windows supported)**

```powershell
npx eas-cli build --platform android --profile development
```

Open the resulting build link on the Android phone and install the development APK. Allow installation from that trusted source when prompted. You do not need a Play account for this test.

**iPhone (cloud build from Windows)**

```powershell
npx eas-cli device:create
# Register the actual iPhone's UDID through the displayed link.
npx eas-cli build --platform ios --profile development
```

Use an Apple Developer account, include the device in the provisioning profile, install from the EAS link, and enable Developer Mode on the iPhone if requested. Rebuild after adding a device not in the profile. A simulator build cannot be installed on a real iPhone.

Start the JavaScript development server:

```powershell
npm start -- --clear
```

Open the installed **Walhad Family development app**, not Expo Go. Scan/open the development link. Phone and PC should be on the same Wi-Fi. Allow the Node process through Windows Firewall **on private networks only**. If LAN discovery is unavailable, try `npx expo start --dev-client --tunnel`; the CLI may request installation of its tunnel support.

**Expo Go does not contain Stream's native WebRTC module.** No browser preview can validate microphone routing, native call controls or push behavior.

For a standalone test app without a running Metro server:

```powershell
# Configure the preview EAS environment first.
npx eas-cli build --platform android --profile preview
npx eas-cli build --platform ios --profile preview
```

Android preview is an APK. iOS internal preview still requires the registered device/signing setup; TestFlight is another distribution option for later signed builds.

### 7. Test with two accounts and a third security-check account

1. Install the app on two physical phones. Ideally use one Android and one iPhone; later test each platform pair too.
2. Create different email/password accounts, open both verification emails, and return to **I've verified my email**. Grant notification permissions when requested.
3. Go to **People**, open the other account, send messages in both directions and verify history after relaunch.
4. Use **You** to upload a JPEG/PNG/WebP picture under 5 MB, edit name/bio and save.
5. Leave the chat open on both phones, tap audio call, accept on the other device, speak/listen, test mute and end. Repeat with video, camera toggle and camera switch.
6. Repeat using different networks (Wi-Fi vs mobile data). Managed WebRTC still needs real connectivity testing.
7. Put the receiver in the background. Send a message; confirm a real notification arrives and tapping opens the chat. Repeat with an incoming call before the 60-second invitation expires. Test locked-screen and terminated behavior and record the actual outcome; do not assume it will match native phone calls.
8. Use the chat's `⋮` menu to block the other user. Verify new messages/calls are rejected in both directions. Unblock and retry. Submit a report; the operator must see it in Firestore `reports` and actually review it.
9. Create a third account and attempt unauthorized Firestore/Stream access in a controlled test. Verify it cannot read others' messages or join their call.
10. Sign out, sign in again and test account deletion on a disposable account. Deletion removes shared private chat history for both participants. Do not use real family history for destructive tests.

Use [DEVICE_TESTS.md](docs/DEVICE_TESTS.md) to record device models, OS versions, evidence and failures. No device results have been filled in for you.

## Run automated checks yourself

```powershell
npm run typecheck
npm --prefix functions run build
npm test
npm run test:dependencies
npm run test:rules
npx expo-doctor
npx expo install --check
npm run bundle
```

The rule command starts Firestore and Storage emulators against `demo-walhad`, not your live Firebase project. It requires Java and network access for the first emulator download. The real-time test uses two authenticated emulator clients and an actual snapshot listener.

`npm run bundle` exports Hermes JavaScript for **both** Android and iOS. That confirms the JS/module graph can be bundled, not that Gradle, CocoaPods, signing or devices work. `.env` is not required for structural bundle checks; without config the app shows honest setup instructions instead of fake chats.

Optional native project generation (not a native compilation):

```powershell
npx expo prebuild --platform android --no-install
# On macOS, install Xcode/CocoaPods then use npx expo run:ios for a local native build.
```

Use EAS for iOS from Windows. Never claim an iOS build passed based only on JavaScript export or generated Xcode files.

## Deploy source to GitHub

Create an empty private repository first. From this project folder:

```powershell
git init
git add .
git status
# Check that no .env, Google service-account file, signing key or private credential is staged.
git commit -m "Initial Walhad Family native app"
git branch -M main
git remote add origin https://github.com/YOUR-ACCOUNT/YOUR-REPOSITORY.git
git push -u origin main
```

The checked-in workflow runs checks, not publication. Keep this folder's contents at the repository root for its default paths. GitHub Pages can host policy/support pages, but cannot deploy an Android/iOS binary or replace Firebase/Stream.

## Troubleshooting

| Symptom | What to check |
|---|---|
| Setup screen | Required `.env` values were absent when Metro/build started. Restart Metro with `--clear`, or rebuild a standalone app with the correct EAS environment. |
| Missing native/WebRTC module | You opened Expo Go or an older build. Install a fresh development build. |
| `auth/operation-not-allowed` | Enable Email/Password in the correct Firebase project. |
| Profile/messages permission denied | Verify email, refresh the token via verification/sign-in, deploy the supplied rules and confirm this Firebase project matches `.env`. |
| Functions `not-found` | Deploy functions and use the matching `us-central1` region. |
| Call token/room permission error | Matching Stream key/secret, paid/trial access, call-type permissions, deployed functions, verified Firebase ID token. Inspect function logs. |
| No push token | Use a real device, allow notifications, configure the EAS project UUID and install a new correctly configured native build. |
| Push accepted but no notification | Check Expo receipts, APNs/FCM v1 credentials, same app/project identifiers, device token, battery/DND settings and permission. An accepted ticket is not proof of delivery. |
| No ringing after force-stop | Standard notifications cannot guarantee wake-up; full native call ringing is not implemented. |
| No camera/microphone | Grant permissions in OS settings, rebuild after plugin changes, check hardware/audio routes. |
| Expo CLI dependency advice | Use `npx expo install --check` and a coordinated Expo/Stream compatibility upgrade. Do not apply major audit fixes blindly. |
| Java emulator error | Install JDK 21, check `JAVA_HOME` and restart PowerShell. |

## Before any public release

See [PUBLICATION.md](docs/PUBLICATION.md). Complete signed native builds, all physical-device tests, dependency remediation/security review, app attestation/abuse planning, privacy/support/deletion URLs, moderation operations, screenshots and store disclosures. A store upload is **not** an approval. This project has not been published or reviewed by either store.

## Dependency review update

The latest review keeps the Expo/React Native/Stream baseline unchanged and uses tested, scoped PostCSS, UUID and FTP overrides. The root audit was reduced from 31 high / 21 moderate to **26 high / 9 moderate** package findings; the backend audit was reduced from 8 moderate to **zero findings**. The remaining findings are not waived. See [DEPENDENCY_REVIEW.md](docs/DEPENDENCY_REVIEW.md) and the updated [VERIFICATION.md](VERIFICATION.md) for exact tests, compatibility boundaries, preserved originals and work still requiring accounts or real devices. No release readiness is claimed.

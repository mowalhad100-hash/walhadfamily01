# Walhad Family — dependency remediation and verification

**Updated: 15 October 2026. Development source only: NOT release-ready, not store-approved, and not published.**

[Windows quick start](docs/QUICK_START_WINDOWS.md) · [Full setup](README.md) · [Device checklist](docs/DEVICE_TESTS.md) · [Dependency review](docs/DEPENDENCY_REVIEW.md) · [Publication requirements](docs/PUBLICATION.md)

## 1. Exact audit results

The fresh starting audit reported **31 high and 21 moderate client/toolchain package findings**, rather than 3 high. npm counts both underlying vulnerable packages and affected parent packages. These counts are not counts of independent bugs or proven runtime exploits.

| Audit | Before | After | Result |
|---|---|---|---|
| Root app/toolchain | 31 high, 21 moderate; **52 total** | 26 high, 9 moderate; **35 total** | 5 high and 12 moderate package findings removed; **still NOT CLEAN** |
| Firebase Functions backend | 8 moderate; **8 total** | **0 findings** | Clean npm audit for this lockfile at verification time |
| Critical findings | 0 in both trees | 0 in both trees | No new critical findings |

The remaining root audit has **three underlying high-severity packages** (`braces`, `image-size`, `node-forge`) and **four underlying moderate-severity packages** (`@opentelemetry/core`, `csv-parse`, `sprintf-js`, `stream-json`); affected parents bring the npm totals to 26 high and 9 moderate. The backend's zero count is not a security certification, and advisories can change later.

Raw evidence: `qa/dependency-review/baseline-client.json`, `baseline-backend.json`, `qa/dependency-audit.json`, `qa/backend-dependency-audit.json`, and `qa/dependency-review/summary.json`.

## 2. Changes made, with compatibility boundaries

No direct app framework or native calling SDK version changed: Expo **54.0.37**, React **19.1.0**, React Native **0.81.5**, Stream React Native SDK **1.46.2**, and Stream WebRTC **145.4.1** remain at the previous baseline.

| Dependency | Change | Why this was accepted |
|---|---|---|
| PostCSS under `@expo/metro-config` | 8.4.49 → **8.5.30**, scoped override | Same major version, though outside Expo's narrower `~8.4` request. Parser, plugin, stringifier and external source-map APIs tested; both native bundles passed. |
| UUID 7/8/9 consumers | → **11.1.1**, selector-limited override in root/backend manifests | This is a transitive **major-version override**, not claimed to be semver-compatible. Installed consumers use the unchanged no-argument `v4()` API; 11 retains CommonJS support. Consumer resolution/generation, Xcode project IDs, Google GAX and Gaxios multipart construction tested. UUID 14, which is ESM-only, was deliberately not forced into CommonJS consumers. |
| `basic-ftp` under `get-uri` | 5.3.1 → **6.2.3**, scoped override | Another transitive **major-version override**. Verified CommonJS Client APIs and actual `get-uri` downloads against a local FTP control/data fixture, through MDTM and listing fallback paths; Unix listing fields tested. This does not prove compatibility with every real FTP/FTPS server or all Firebase CLI commands. |

Previous `tar` and `@grpc/grpc-js` overrides were retained. Both manifests and lockfiles were saved and successfully reinstalled with `npm ci`; `npm ls --all` completed without invalid dependency-tree errors. No broad `npm audit fix --force`, framework downgrade, Metro-family replacement, custom cryptographic patch or suppression of remaining advisories was used.

The new test command is `npm run test:dependencies`. It has also been added to the GitHub checks workflow and run instructions. Production app source, database rules, call features and service configuration were not removed or rewritten to reduce audit counts.

## 3. Tests rerun after the changes

| Check | Exact final result | Evidence |
|---|---|---|
| Root lockfile clean install | PASS | `qa/dependency-review/clean-install.log` |
| Backend lockfile clean install | PASS | same log |
| App TypeScript | PASS, exit 0 | `qa/typescript.log` |
| Firebase Functions TypeScript | PASS, exit 0 | `qa/backend-build.log` |
| Existing core logic tests | **4 passed, 0 failed** | `qa/unit-tests.log` |
| New dependency compatibility tests | **9 passed, 0 failed** | `qa/dependency-review/compatibility.log` |
| Firestore/Storage emulator tests | **16 passed, 0 failed** | `qa/security-rules.log` |
| Repeat of Firestore/Storage suite | **16 passed, 0 failed** | `qa/security-rules-repeat.log` |
| Expo Doctor | **18/18 passed** | `qa/expo-doctor.log` |
| Expo supported-dependency check | Dependencies up to date | `qa/expo-dependencies.log` |
| Android Hermes JavaScript export | PASS; displayed size **6.92 MB** | `qa/native-bundles.log` |
| iOS Hermes JavaScript export | PASS; displayed size **6.90 MB** | same log |
| Android native-project generation | PASS; **not Gradle compilation** | `qa/android-prebuild.log` |
| iOS native-project generation | PASS; **not CocoaPods/Xcode compilation** | `qa/ios-prebuild.log` |
| Full installed root dependency tree | PASS | `qa/dependency-review/installed-tree.txt` |
| Root npm audit | Exit **1**, 35 package findings remain | `qa/dependency-audit.json` |
| Backend npm audit | Exit **0**, zero findings | `qa/backend-dependency-audit.json` |

There are **29 distinct automated test cases** (4 logic + 9 dependency compatibility + 16 emulator tests), all passing. The 16-case emulator suite was additionally repeated; it is not counted as 16 extra distinct tests.

The security suite verifies participant-only chats, sender identity, immutable members, canonical IDs, profile/device ownership, blocking, message schema, and avatar access/type/size limits. Its live-message test uses **two authenticated Firestore emulator clients and a real server-backed snapshot listener**. It is not simulated delivery, but it is not production Firebase or a physical-phone test.

The compatibility suite executes actual library consumer APIs. Its Gaxios adapter and local FTP fixture are intentionally isolated test infrastructure, not replacements for production messages, calls or notifications. No live cloud credentials are used by those tests.

Checks ran under **Node 22.23.3 / npm 10.8.2**. The available emulator Java runtime was **Java 11**, which passed these tests but triggered Firebase CLI 14's future-support warning. **JDK 21 remains recommended** for your setup. A temporary nested npm-exec wrapper initially prevented Expo Doctor from launching; the test harness was corrected to invoke it under Node 22 with the proper npm prefix, and the final check passed. This was not an app dependency failure.

## 4. Preserved files and evidence

No existing project files were deleted. Original manifests, lockfiles, report, run instructions, workflow and previous QA outputs are retained under **`qa/dependency-review/before/`**. Before regenerating any native projects or outputs, the existing `android/`, `ios/`, `dist/`, `.expo/` and `functions/lib/` contents were archived to `before/generated-before.zip`. The earlier source ZIP in `/home/user` was not overwritten.

Updated manifests/lockfile SHA-256 values, audit deltas and remaining root advisories are recorded in `qa/dependency-review/summary.json`. Previous source and logs are historical evidence, not current pass/audit results.

## 5. Items that can be worked on in this workspace

- Review the remaining seven underlying vulnerable packages and upstream releases. The specific deferrals and compatibility concerns are in `docs/DEPENDENCY_REVIEW.md`.
- Evaluate a separate coordinated Expo/Metro/React Native/CLI upgrade on a branch, preserve the present baseline and rerun all tests. Signed-build and device compatibility would still be needed afterward.
- Add more regression tests, input restrictions, abuse controls, moderation tooling and app-attestation integration code. Whether such code works with your live projects cannot be established here alone.
- Keep rerunning audits as patched packages are published. Residual findings are **not waived** by the passing test suite, and the current app/toolchain audit remains a release blocker.

Three high-severity underlying packages currently lack a drop-in safe resolution in this baseline: two had no patched latest release in the registry at review time; the third requires a different image-parser API/Metro integration. No unsupported override was applied just to make the audit green.

## 6. Items requiring your accounts, credentials or real phones

| Requirement | What you must provide or perform |
|---|---|
| Firebase | Real project/billing, Email/Password configuration, deployed rules/functions/indexes, Storage, live function/ID-token tests, production attestation and abuse-policy setup |
| Stream | Video app key/secret, appropriate service access, verified member-only call permissions; actual room/media tests and a third-user denial test |
| Expo/EAS | Project UUID, build environments and push access token; signed cloud builds and installation/distribution setup |
| Android push | Correct app registration, `google-services.json`, FCM v1 credentials, device permissions and actual notification delivery |
| iOS push/signing | Apple developer/signing setup, APNs key/capability, registered iPhones or TestFlight distribution and actual notification delivery |
| Real devices | Install signed builds; test auth/persistence, photos, messages, microphone/camera, audio routes, interrupts, reconnection, sign-out, deletion and notifications across Android/iOS and different networks |
| Stores/operations | Moderation operator, completed privacy/support/deletion pages, store disclosures, current SDK requirements and actual review/approval |

**No APK/AAB/IPA has been compiled or signed here. No physical phone, production account, hosted Stream call, APNs/FCM delivery, production account deletion or store submission was tested.** JavaScript bundling and generated native files are not substitutes for those checks.

## 7. Existing product limitations still apply

- Incoming calls use standard Expo push alerts. Full CallKit/PushKit or Android full-screen incoming-call ringing is **not implemented**; locked/terminated/force-stopped wake-up is not guaranteed. Busy/simultaneous-call handling still needs work and device validation.
- Messages are access-controlled but **not end-to-end encrypted**.
- Profiles are discoverable by verified registered users, not restricted to an invite-only family. Discovery is limited to the first 200 profiles.
- Avatar download URLs are bearer-style links; presence is approximate; durable offline history/outbox across restarts is not guaranteed.
- Groups, message attachments, recordings, read receipts and a moderation dashboard are not part of this first version.

**Release readiness has not been established. Complete residual security work, signed native builds, real-device/end-to-end tests and store-policy requirements before making any release claim.**

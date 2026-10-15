# Publishing — only after real-device validation

**The app is not published, not approved and not presently declared release-ready.** EAS build success, TestFlight availability and store approval are different events.

## Release blockers

1. Complete the physical-device matrix and fix call lifecycle, push, permissions and deletion failures. Test signed production-like builds, not only a Metro development build.
2. Review/remediate dependency advisories in `qa/`. Current lockfiles still have high-severity client/toolchain findings. Some suggested npm fixes are incompatible SDK downgrades; use supported coordinated upgrades and regression tests rather than `--force`.
3. Audit Firestore, Storage, Functions and Stream ACLs in the actual project. Enable/test suitable native App Check attestation and callable enforcement before exposing the service broadly. Add stronger messaging-abuse, rate/quota and spam controls. Budget alerts do not cap spending.
4. Decide whether ordinary incoming-call notifications meet the product promise. For Messenger/WhatsApp-like terminated/locked-screen ringing, implement Stream's supported CallKit/PushKit and Android incoming-call integration. Do not simply flip `ringing: true`: native push token registration, handlers, permissions, credentials, app lifecycle and policy testing are all required. Prevent duplicate invite paths when adding it.
5. Resolve simultaneous-call/busy coordination and interruptions based on device tests. The current two-member room limit is not a per-user busy-state service.
6. Assign a real operator to monitor Firestore `reports`, respond to abuse, block/suspend users and maintain support/deletion contacts. Reporting is implemented; moderation is not an automated service.
7. Publish completed privacy, terms, support and data-deletion pages. Templates in this source are not legal advice or finished public policies.
8. Verify current store SDK/target-API/Xcode requirements. Expo SDK 54 was chosen for this iteration and checked locally; a newer supported SDK may be necessary at submission time. Upgrade Expo, React Native, Stream native SDK/plugins together and rerun all checks and device tests.
9. Review platform privacy manifests, required-reason APIs, export-compliance answers and third-party SDK declarations in the actual native archive. `ITSAppUsesNonExemptEncryption: false` assumes only exempt standard encryption; the developer must confirm this for the final app and regions.

## Common preparation

- Select permanently unique `android.package` and `ios.bundleIdentifier` in `app.config.js` before first store submission. Update Firebase registrations, APNs/FCM and EAS credentials to match.
- Use separate production Firebase/Stream services; rotate compromised/test credentials. Deploy rules/functions/indexes to production and verify permissions with three accounts.
- Set preview/production EAS environment variables and Android file configuration, as explained in README. Keep Stream secrets, Expo access tokens and Google/Apple keys out of app bundles and Git.
- Create production app icons, accurate descriptions and screenshots from actual phones. Do not describe unimplemented features or imply E2EE.
- Provide privacy-policy, support and deletion-request URLs. Account deletion exists in the app; Google may also require a working external deletion-request resource. A static page must provide an actual monitored request mechanism, not a nonfunctional form.
- Complete store privacy/Data Safety forms for account data, display names, avatars, messages, device push tokens, call metadata/audio/video processing and third-party providers. Check whether any SDK analytics/diagnostics are enabled. Recording is not intentionally enabled by this app.
- Decide audience/content ratings and family/minor access policy. A family-themed name does not make an app automatically compliant with children's-app rules.
- Supply review instructions and two verified test accounts with working credentials. Explain the notification/calling behavior accurately, including device requirements and limitations.

## Google Play

1. Enroll and verify a Google Play Console developer account; review the current registration fee and regional requirements at Google's official enrollment page.
2. Create the app and required store listing/content/privacy declarations.
3. Configure signing/Play App Signing. Store signing/upload credentials securely.
4. Build an **Android App Bundle**:
   ```powershell
   npx eas-cli build --platform android --profile production
   ```
5. Upload the AAB manually to an internal testing track first. A first Play upload commonly requires a manual console upload before API-based submission is configured.
6. Test installation, authentication, real messages, calls, notifications and deletion from a Play-distributed build. Test both Wi-Fi and mobile data.
7. Satisfy any closed-testing/production-access requirement shown for your account. Requirements vary by account type/date and may change; follow the live Play Console prompts.
8. Configure Play API credentials if using later automated uploads:
   ```powershell
   npx eas-cli submit --platform android --latest
   ```
9. Complete all declarations and submit for review. Mark the app published only after Google approves the requested rollout and the actual store listing is live.

## Apple App Store

1. Enroll in the Apple Developer Program and complete account agreements. Confirm the current local membership fee.
2. Create the bundle identifier with needed capabilities, configure signing/APNs, and create the app record in App Store Connect.
3. Build an App Store distribution archive using EAS:
   ```powershell
   npx eas-cli build --platform ios --profile production
   npx eas-cli submit --platform ios --latest
   ```
4. Associate the correct build in App Store Connect. EAS submission uploads a binary; it is not a review approval.
5. Complete App Privacy, age/content ratings, export-compliance, screenshots, support/privacy URLs and reviewer notes. TestFlight external testing may have its own review requirements.
6. Test the actual TestFlight build on real iPhones, including APNs, audio routes, privacy permissions and deletion. Test both foreground and locked/background conditions. Do not label ordinary pushes as guaranteed native incoming calls.
7. Address review feedback and submit for App Review. Announce publication only after Apple's approval and your chosen release actually becomes available.

## Costs and policies

Consult current official pages instead of relying on a fixed price quoted in a source archive:
- Apple: https://developer.apple.com/programs/enroll/
- Play: https://support.google.com/googleplay/android-developer/answer/6112435
- Firebase: https://firebase.google.com/pricing
- Stream: https://getstream.io/video/pricing/
- EAS: https://expo.dev/pricing

No payment, developer enrollment, build signing, store upload or review has been performed by the assistant.

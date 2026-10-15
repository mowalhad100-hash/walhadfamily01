# Physical-device acceptance record

**No device tests have been performed by the assistant. Every item below is pending.**

Record date, tester, app build ID, Git commit, phone model, OS, network, expected result, actual result and evidence. Test one Android↔iPhone pair, Android↔Android and iPhone↔iPhone. Use disposable accounts and data.

| Area | Test | Status |
|---|---|---|
| Installation | Signed development APK installs and launches on Android | NOT RUN |
| Installation | Signed iPhone build installs and launches | NOT RUN |
| Auth | Register, receive verification email, verify and enter app | NOT RUN |
| Auth | Reject wrong password; password-reset email; session persists after restart | NOT RUN |
| Auth | Unverified users cannot read directory/chats/calls | NOT RUN on phones; rules tested locally |
| Profiles | Edit name/bio; photo upload and refresh on second phone | NOT RUN |
| Profiles | Reject unsupported photo/5 MB+ upload; deny photo permission cleanly | NOT RUN on phones; rules tested locally |
| Presence | Foreground heartbeat, background/offline state, crash expiry | NOT RUN |
| Messaging | Two-way delivery over real Firebase, correct ordering, unicode/emoji, 4000-char boundary | NOT RUN on phones; emulator live listener tested |
| Messaging | Duplicate tap, network drop/reconnect, relaunch and earlier-history pagination | NOT RUN |
| Privacy | Third user cannot read another chat via SDK or direct API | NOT RUN in live project; rules tested locally |
| Audio | Accept, decline, timeout, hang up from either end, bidirectional audio | NOT RUN |
| Audio | Mute/unmute, speaker/earpiece/Bluetooth, interrupt by cellular call | NOT RUN |
| Video | Two-way picture, camera flip, camera toggle, microphone toggle | NOT RUN |
| Calls | Wi-Fi↔mobile data, weak network, reconnect and token refresh after 1 hour | NOT RUN |
| Calls | Denied permissions, recipient busy, app interrupted, simultaneous calls | NOT RUN; busy/multi-call coordination is not fully implemented |
| Calls | Third Stream user denied access to another pair's room | NOT RUN; requires dashboard ACL verification |
| Calls | Local camera/microphone release after close, error and remote hangup | NOT RUN |
| Push | Android FCM v1 delivery with foreground/background app | NOT RUN |
| Push | iOS APNs delivery with foreground/background app | NOT RUN |
| Push | Locked/terminated app, DND, revoked permission, expired tokens | NOT RUN; ordinary push, not full native ringing |
| Push | Tap opens correct chat; current incoming call can be accepted | NOT RUN |
| Push | Expired incoming call cannot be accepted; sign-out stops that phone's notifications | NOT RUN |
| Safety | Block stops new messages/call creation both ways; unblock restores access | NOT RUN on phones; message rules tested locally |
| Safety | Report stored privately and reviewed by actual operator | NOT RUN |
| Deletion | Recent-login check; delete disposable account; verify Firebase/Storage/Stream cleanup | NOT RUN |
| Deletion | Shared chat history removed for both users; stale screens handled | NOT RUN |
| UX | Small phone, large phone/tablet, keyboard, larger text, screen-reader labels | NOT RUN |
| Operations | Backend errors logged, push receipt cleanup, failed notification retries | NOT RUN in deployed environment |

## Release gate

A pass on this checklist must be backed by actual evidence. Fix failures, rebuild and retest. This list is not a substitute for a security review, store-policy review or compatibility testing. Standard notification alerts must not be marketed as full native incoming-call ringing.

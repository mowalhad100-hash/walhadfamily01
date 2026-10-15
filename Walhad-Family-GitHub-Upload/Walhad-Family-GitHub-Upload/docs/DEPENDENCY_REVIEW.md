# Dependency review — 15 October 2026

## Result, not a release clearance

Root/client/toolchain audit: **52 → 35 package findings** (31 → 26 high; 21 → 9 moderate). Backend: **8 → 0 moderate findings**, clean at the time of review. No critical findings in either baseline or final audit.

The remaining root audit has three underlying high-severity packages and four underlying moderate-severity packages. npm also marks their affected dependants, which explains the higher aggregate numbers. Do not interpret the aggregate as independent vulnerabilities, and do not dismiss them as harmless simply because some paths are developer tooling.

## Accepted, scoped changes

| Change | Compatibility assessment and evidence |
|---|---|
| `@expo/metro-config → postcss` 8.4.49 → 8.5.30 | Same PostCSS major; deliberately overrides Expo's narrower minor request. Parser, declaration plugin, stringifier and source-map behavior tested. Android/iOS JavaScript exports pass. |
| UUID 7/8/9 → 11.1.1 in both dependency trees | A major-version override limited by selector `uuid@>=7 <10`; not a general latest-version replacement. Current Xcode/Firebase CLI/Gaxios/GAX/teeny-request consumers use `v4()` without buffers/options. UUID 11 retains CommonJS. Tests verify consumer-scoped resolution, 100 unique IDs per consumer, real Xcode project-ID generation, GAX's helper and Gaxios multipart creation. Buffer/timestamp APIs changed in intervening UUID majors, so consumers using those APIs must be reassessed in future lockfile updates. UUID 14 was not selected because its ESM-only export is not a drop-in for these consumers. |
| `get-uri → basic-ftp` 5.3.1 → 6.2.3 | Major-version override confined to the get-uri consumer. Inspected Client/access/lastMod/list/downloadTo/close interfaces; tested actual control/data transfers against a loopback FTP fixture through MDTM and listing fallback, and Unix listing fields. External FTP/FTPS/proxy servers and unrelated Firebase deployment commands have not been comprehensively tested. |

Existing tar/grpc overrides were retained. No direct React, React Native, Expo, Firebase, Stream or native WebRTC dependency declaration was upgraded or downgraded. Both lockfiles were regenerated and successfully reinstalled from scratch. The supported Expo dependency check, Expo Doctor, compiler checks, all 29 distinct test cases, both JS exports and both native-project generations passed afterward.

These tests support keeping the overrides in this development baseline. They are not proof of every external service path, native platform or signed-build behavior. Reassess overrides when updating Expo/CLI dependencies; prefer an upstream-supported resolution once available.

## Remaining high-severity roots

| Installed package | Why it remains | Recommended action |
|---|---|---|
| `braces` 3.0.3 | Registry latest 3.0.3 is still covered by the stack-exhaustion advisory. No patched release was available in the review. Used through glob/watcher dependencies. | Track upstream fix or a supported consuming-tool replacement; avoid processing attacker-controlled glob patterns. Do not monkey-patch parser internals or remove the audit finding without a real fix. |
| `image-size` 1.2.1 | Patched 2.0.4 exists, but it changes `require('image-size')` from a callable to an object containing `imageSize`. Installed Metro 0.83.3 calls the default as a function. Blindly overriding it would break image assets. Expo's `@expo/metro` pins a coordinated Metro family, so replacing only one Metro package is not an accepted fix here. | Evaluate an upstream-supported Expo/Metro-family upgrade separately, test bundled asset dimensions and malicious-format handling, then rerun native builds/device tests. Until then, do not introduce untrusted build-time image assets. |
| `node-forge` 1.4.0 | Latest registry release 1.4.0 remains covered by the RSA signature-verification advisory. Used by Expo CLI/code-signing tooling. | Track patched upstream release and Expo support. Do not introduce a hand-written crypto patch. Treat untrusted certificates/signatures and any code-signing/update deployment as a security-review requirement. |

High advisory references from the saved npm audit:
- braces: https://github.com/advisories/GHSA-vfj7-8cjw-p6xm
- image-size: https://github.com/advisories/GHSA-5p2g-fcmc-qvqq and https://github.com/advisories/GHSA-w3rx-r6r6-pgpr
- node-forge: https://github.com/advisories/GHSA-86w9-cpqp-85rv

## Remaining moderate-severity roots

| Installed package | Why it was not forcibly replaced |
|---|---|
| `@opentelemetry/core` 1.30.1 | Fixed releases are in the 2.x family; a major OpenTelemetry change under Google Cloud Pub/Sub needs coordinated instrumentation/SDK compatibility testing. A simple version override does not prove matching APIs, peer dependencies or deployed behavior. |
| `csv-parse` 5.6.0 | Patched 7.0.2+ is outside the CLI's 5.x range. The CLI's account/data-import parsing semantics and malformed-input handling are not covered by this app's messaging/rules tests. A supported CLI upgrade plus dedicated import fixtures is preferred to another unverified major parser override. Do not import untrusted CSV files into the current toolchain. |
| `sprintf-js` 1.0.3 | The latest 1.1.3 release is also within the advisory's affected range; no patched release was available in the review. It is reached through js-yaml/argparse. Avoid passing untrusted precision-format strings to tooling. |
| `stream-json` 1.9.1 | Patched 3.6+ releases have a different ESM/export layout. Firebase CLI 14 uses CommonJS deep paths such as `stream-json/filters/Pick` and `stream-json/streamers/StreamArray`. An uncoordinated 1→3 override would not preserve those interfaces. | 

Moderate references are recorded with exact affected ranges and paths in `qa/dependency-review/summary.json` and `qa/dependency-audit.json`. These are deferred fixes, not false positives or approved risk acceptances. Public exposure requires further review.

## Evidence and preservation

- `qa/dependency-review/before/`: original manifests, lockfiles, report, prior check logs, relevant docs/workflow and a ZIP of pre-existing generated/native output.
- `baseline-client.json`, `baseline-backend.json`: pre-change audits.
- `qa/dependency-audit.json`, `qa/backend-dependency-audit.json`: final authoritative audits.
- `summary.json`: exact before/after totals, removed package findings, residual root advisories and final manifest/lock SHA-256 values.
- `trees-before.txt`, `trees-after.txt`, `backend-tree-after.txt`, `installed-tree.txt`: dependency-path evidence.
- `compatibility-inspection.txt`: actual image-parser export mismatch, Metro call sites and Stream-JSON consumer/export inspection.
- `compatibility.log`: 9 passing focused compatibility tests.
- `clean-install.log`: successful installation from the final lockfiles.

npm's dry-run command emitted mixed text despite `--json`. The raw output is retained as `.log`; the corresponding `.json` is a labelled wrapper around that raw text, not an authoritative audit report. No production project or service secret was used for this review.

## Reproduce

Use Node 22.12+ in the Node 22 LTS line, npm and JDK 21:

```powershell
npm ci
npm --prefix functions ci
npm run typecheck
npm --prefix functions run build
npm test
npm run test:dependencies
npm run test:rules
npx expo-doctor
npx expo install --check
npm run bundle
npm audit
npm audit --prefix functions
```

Expected at this verification point: all tests/bundles/checks pass; root audit returns **exit 1** with residual findings, backend audit returns **exit 0**. Advisories may change as the registry is updated. Use `npm ci` for this reviewed lockfile; an unrestricted `npm update` needs another review.

The FTP tests bind only to local loopback and use disposable fixture credentials; Gaxios's adapter is in-memory. These are test infrastructure, not fake buttons, simulated chat delivery or a production-service replacement.

## What still needs your services/devices

Dependency edits and local tests can be performed in the workspace. Live Firebase/Stream behavior, Stream ACL denial tests, EAS signing, APNs/FCM push delivery and physical Android/iOS media/permissions/background testing require your accounts, credentials and devices. No clean audit, generated native project or JavaScript bundle proves those tests passed. See `VERIFICATION.md` and `DEVICE_TESTS.md` before planning a release.

# Walhad Family — final status and safe GitHub handoff

This handoff uses the **saved verification evidence**. No dependency audit was rerun for this handoff. No release readiness, signed build, device test or store approval is claimed.

## Final verified status

- App and backend TypeScript: pass.
- Existing logic tests: **4 passed, 0 failed**.
- Dependency compatibility tests: **9 passed, 0 failed**.
- Firestore/Storage emulator tests: **16 passed, 0 failed**, plus a successful repeat.
- Total distinct test cases: **29**, all passed in the final recorded runs.
- Expo Doctor: **18/18 passed**. Expo supported-dependency check: up to date.
- Android and iOS JavaScript/Hermes exports: passed.
- Both native-project generations: passed; **not native compilation or signing**.
- Lockfile clean installs and installed dependency-tree checks: passed.
- Saved root/client/toolchain audit: **26 high + 9 moderate = 35 affected-package findings**, exit **1**; unresolved.
- Saved backend audit: **0 findings**, exit **0**; not a security certification.

The final functional automated checks have no unresolved recorded failures. Earlier live-message listener timing and Expo Doctor invocation-wrapper errors were corrected; final reruns passed. The root audit is still a failing security check. Java 11 passed the emulator checks but produced a future-support warning; use JDK 21. Node 22 was used in the final dependency verification.

Full results and scope: `VERIFICATION.md`, `docs/DEPENDENCY_REVIEW.md`, and final `qa/` logs. The saved audit counts include affected dependants, not just independent underlying flaws. All remaining underlying advisory entries are listed below; the complete list of the 35 affected packages and dependency paths is in `qa/dependency-audit.json`.

## All remaining underlying advisories from the saved audit

| Package | Severity | Advisory | Affected range | Reference |
|---|---|---|---|---|
| `@opentelemetry/core` | moderate | OpenTelemetry Core: Unbounded memory allocation in W3C Baggage propagation | `<2.8.0` | https://github.com/advisories/GHSA-8988-4f7v-96qf |
| `braces` | high | braces vulnerable to stack-exhaustion denial of service through deeply nested patterns | `<=3.0.3` | https://github.com/advisories/GHSA-vfj7-8cjw-p6xm |
| `csv-parse` | moderate | node-csv: Prototype replacement still reachable via columns path | `<7.0.2` | https://github.com/advisories/GHSA-8cw4-87c7-c6xx |
| `image-size` | high | image-size: JXL and HEIF parsers allow denial of service through infinite loops | `>=1.2.0 <=2.0.2` | https://github.com/advisories/GHSA-5p2g-fcmc-qvqq |
| `image-size` | high | image-size: ICNS parser allows denial of service through an infinite loop | `>=0.6.3 <=2.0.2` | https://github.com/advisories/GHSA-w3rx-r6r6-pgpr |
| `node-forge` | high | node-forge RSA PKCS#1 v1.5 signature verification accepts extra nested DigestAlgorithm elements | `<=1.4.0` | https://github.com/advisories/GHSA-86w9-cpqp-85rv |
| `sprintf-js` | moderate | sprintf-js vulnerable to denial of service through unbounded precision specifiers | `<=1.1.3` | https://github.com/advisories/GHSA-hp3w-g68c-fv3c |
| `stream-json` | moderate | stream-json: pick/ignore/filter/replace filters are O(depth²) on nested input — small crafted JSON blocks the event loop for seconds→minutes (DoS) | `<=3.4.0` | https://github.com/advisories/GHSA-528h-pc64-c93x |
| `stream-json` | moderate | stream-json: JSONC parser and verifier re-scan the whole accumulated comment on every input chunk | `<=3.5.0` | https://github.com/advisories/GHSA-hqr4-qq8f-hg3x |
| `stream-json` | moderate | stream-json has a prototype pollution issue: Assembler writes this.current[this.key] on plain objects | `<3.6.0` | https://github.com/advisories/GHSA-mjw6-4jj6-33hc |

### Why these were not forced away

- `braces`, `node-forge` and `sprintf-js`: no patched latest release was available at the recorded review.
- `image-size`: the patched major changes the export API used by the installed Metro; requires a supported coordinated Metro/Expo change, not a blind override.
- OpenTelemetry: major SDK/instrumentation compatibility work required.
- CSV parser: major import-parser change needs dedicated CLI/import testing.
- Stream JSON: changed ESM/deep-export layout is not a drop-in for Firebase CLI's CommonJS imports.

These findings remain open, not waived or established as harmless. Do not process untrusted build assets, glob/format strings, certificates or import files with vulnerable tooling. That risk reduction is not a substitute for fixing the dependencies. Do not repeat audits by default; rerun when dependencies/lockfiles change, a relevant upstream advisory/fix appears, or you deliberately perform a release/security review.

## GitHub connection and actions actually taken

- GitHub connector lookup returned **unsupported in this session**. No account/repository enumeration was possible through it.
- There was **no existing local Git repository**. A new local repository has now been initialized on branch **main**.
- **No remote is configured.** No GitHub repository was created, selected, connected or pushed to.
- **No files are staged; no commit has been made.**
- Existing project source and `.gitignore` were not replaced. Local-only safeguards were appended to the newly initialized `.git/info/exclude` to exclude broader credential filenames, backups and archives.
- A pattern scan of the 67 then-eligible untracked files found **no matches for the credential/token patterns checked**. Values were never printed. This is a limited screening check, not a guarantee that no secret exists; inspect your staged changes before committing.
- Original manifests/lockfiles/reports remain under `qa/dependency-review/before/`. That historical backup directory is locally excluded from Git, not deleted.

**Important:** `.git/info/exclude` is local Git metadata and is not shared with clones or guaranteed to persist with a downloaded source archive. Append the supplied `docs/GITIGNORE_SAFETY_ADDITIONS.txt` rules to the tracked `.gitignore` yourself before staging; the command below appends rather than overwrites it. No old file was overwritten in this handoff.

## Exact next steps — Windows PowerShell

### 1. Open this project and confirm the local state

```powershell
Set-Location PATH-TO-YOUR-WALHAD-PROJECT
# Only if using a downloaded copy without Git metadata:
# git init --initial-branch=main
git status --short
git remote -v
```

Replace the path with the actual extracted `walhad-family-mobile` folder. For this workspace the path is `/home/user/walhad-family-mobile`. Do not reinitialize an existing repository or paste a placeholder remote URL as if it were real.

### 2. Share the safety exclusions without replacing existing rules

```powershell
Get-Content docs/GITIGNORE_SAFETY_ADDITIONS.txt | Add-Content .gitignore
git check-ignore .env.production functions/.env.production service-account.json credentials.json qa/dependency-review/before/generated-before.zip
```

The check should print those excluded paths. `.env.example` stays eligible because it contains only blank/example configuration. Never use `git add -f` to force credential/backup files into the commit. If you already applied the additions, do not append them repeatedly.

### 3. Configure your own commit identity, if needed

```powershell
git config user.name "YOUR NAME"
git config user.email "YOUR VERIFIED OR GITHUB NOREPLY EMAIL"
```

Use your actual identity; these values have not been guessed or set for you.

### 4. Stage only the reviewed source and final evidence

```powershell
git add -- .gitignore .env.example .github assets docs src tests index.js app.config.js eas.json firebase.json firestore.rules firestore.indexes.json storage.rules package.json package-lock.json functions/package.json functions/package-lock.json functions/tsconfig.json functions/src README.md VERIFICATION.md COMMIT_NEXT_STEPS.md
git add -- qa/typescript.log qa/backend-build.log qa/unit-tests.log qa/security-rules.log qa/security-rules-repeat.log qa/expo-doctor.log qa/expo-dependencies.log qa/native-bundles.log qa/android-prebuild.log qa/ios-prebuild.log qa/dependency-audit.json qa/backend-dependency-audit.json qa/dependency-review/compatibility.log qa/dependency-review/summary.json qa/dependency-review/feature-preservation.json
```

Do not use `git add .` for this first handoff. The final audit files are retained as honest evidence, not evidence of a clean security review.

### 5. Inspect and commit locally

```powershell
git diff --cached --check
git diff --cached --stat
git diff --cached --name-only
git diff --cached
```

Inspect the staged diff **locally**, not by pasting its contents into a chat. Look for real keys, private credentials, populated environment files, developer-account keys, service-account JSON, signing materials and unintended personal data. If anything sensitive is staged, unstage that file; if already committed/exposed, rotate the credential and follow Git history-removal guidance before pushing. This initial pattern scan cannot replace your review.

Only after the staged content is acceptable:

```powershell
git commit -m "Add Walhad Family native development baseline"
```

### 6. Create and connect the actual GitHub repository

In your GitHub account, create a **private empty repository**, with no generated README, license or `.gitignore` (the project already supplies files). Copy its actual HTTPS or SSH URL. Authenticate through Git Credential Manager, GitHub CLI/browser or SSH; **do not embed a token in the URL**.

```powershell
# Replace ACTUAL_REPOSITORY_URL with the URL you copied from your real repository.
git remote add origin ACTUAL_REPOSITORY_URL
git remote -v
git push -u origin main
```

These commands have not been run against any GitHub account here. If `origin` already exists, stop and inspect it rather than overwriting it. If the remote is not empty, do not force-push: reconcile the histories deliberately first. Enable GitHub secret scanning/push protection when available. The source-check workflow includes audit output that is allowed to report residual findings; a green CI badge must not be interpreted as release approval.

## Work that remains after source is safely committed

**Workspace work:** dependency remediation/coordinated upgrades, more regression tests, app-attestation/abuse-control code and product limitations. Full native CallKit/PushKit/Android incoming-call ringing and robust busy/multi-call handling are not implemented.

**Your accounts/services:** configure Firebase, Stream and Expo; deploy rules/functions/indexes, set server-side secrets, verify member-only Stream ACLs, set APNs/FCM credentials and supply signing identities. None of that was configured or tested here.

**Real phones and signed builds:** Android/iOS installation, production auth/persistence, photos, real messages, media/audio routes, interruptions, reconnects, pushes/background/locked behavior and deletion need end-to-end evidence. Messages are not E2EE; ordinary push alerts are not guaranteed native incoming-call ringing.

Only after those checks, residual security work, moderation/privacy/support/deletion requirements and store review should any release claim be considered. **No signed build, device-test pass, store submission, approval or publication is claimed.**

# Walhad Family privacy policy — TEMPLATE, NOT FOR PUBLICATION AS-IS

Replace all placeholders, verify against the final deployed configuration and obtain appropriate advice before publishing.

- Operator: [legal name, country, contact address/email]
- Effective date: [date]
- Audience/age requirements and parental consent: [define actual policy]

## Data the service processes

Account email and Firebase authentication identifiers; display name, biography and profile photo; private text messages and participants/timestamps; approximate online/last-seen state; device push tokens; call participant/status/timing information; reports and blocking information. Password authentication is handled by Firebase Authentication. Do not collect or store plaintext passwords.

Audio/video calls use Stream infrastructure and the native SDK. Describe actual media processing, geographic handling and SDK diagnostics after reviewing the enabled Stream features. This app does not intentionally enable recording or transcription. Do not claim end-to-end encryption; messages are not E2EE.

## Purposes and providers

Explain account operation, messaging, calls, notifications, security and moderation. Identify Google/Firebase, Stream and Expo and link their applicable policies. Identify Apple/Google push delivery where applicable. State actual legal bases, international transfers and provider regions for the operator's jurisdiction.

Profiles are discoverable by verified registered users. Private messages are limited by database authorization to their participants, while authorized service operators/processors can have administrative access. Avatar download URLs returned by Firebase are bearer-style links; anyone who obtains such a link may be able to view the image without a fresh Storage SDK authorization check. Do not treat profile photos as confidential attachments.

Ordinary push notifications can reveal a sender/caller display name and a generic message/call notice on the lock screen. Notification payloads contain navigation identifiers, not message bodies in this version.

## Retention and deletion

Set precise retention periods and a real deletion-request process. The in-app deletion flow removes the user's Firebase profile/auth account, stored avatar, private conversations (including the other participant's copy), call records involving that user and Stream user data. Verify the live behavior before stating guarantees. Document remaining reports, administrative/security metadata, backups and provider logs and their retention. The initial source does not promise instantaneous deletion from provider backups.

## Rights, contact and requests

[Monitored privacy/deletion contact, identity verification process, applicable access/correction/deletion rights, response times, regulator information if required.]

## Safety and changes

[Actual moderation response policy, breach response, changes to policy and how users are notified.]

This file is a preparation aid, not legal advice and not a functioning deletion-request website.

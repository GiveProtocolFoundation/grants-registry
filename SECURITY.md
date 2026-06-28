# Security Policy

We take the security of Give Protocol Foundation projects seriously. This document explains how to report vulnerabilities and what you can expect from us.

## Reporting a vulnerability

**Do not open a public GitHub issue for security reports.**

Use one of these private channels:

1. **Preferred — GitHub Private Vulnerability Reporting.**
   Go to the repository's [Security tab](https://github.com/GiveProtocolFoundation/grants-registry/security/advisories/new) and submit a private advisory. This keeps the report visible only to repository maintainers and you.

2. **Email.** Send details to `security@giveprotocol.foundation`. Encrypt with our PGP key if the report is sensitive (key fingerprint will be published once provisioned; until then assume unencrypted email is in transit-protected but not end-to-end encrypted).

Include in your report:

- A description of the issue and its impact.
- Steps to reproduce, or a proof-of-concept.
- The affected version, commit, or URL.
- Any suggested mitigation, if you have one.
- Whether you would like credit in the published advisory, and how to attribute you.

## What to expect

- **Acknowledgement**: within 3 business days.
- **Triage and severity assessment**: within 7 business days.
- **Fix or mitigation plan**: communicated to you with a target date based on severity.
- **Coordinated disclosure**: we will agree a disclosure date with you. Default embargo is up to 90 days from acknowledgement, shorter if a fix lands sooner.
- **Credit**: by default we credit reporters in the published advisory unless you ask to remain anonymous.

## Scope

In scope:

- Code and configuration in this repository and its published artifacts.
- Build and release pipelines defined in `.github/workflows/`.

Out of scope:

- Vulnerabilities in third-party dependencies — please report those upstream. We are happy to help coordinate.
- Social engineering of maintainers.
- Denial of service via simply sending large request volumes.
- Issues in projects hosted under [GiveProtocolFoundation](https://github.com/GiveProtocolFoundation) other than this one — report those to the relevant project's `SECURITY.md`.

## Secret handling

If you discover credentials, API keys, or other secrets that have been accidentally committed to this repository:

1. Do not post them anywhere public.
2. Report via the channels above with the commit hash and file path.
3. We will rotate the secret and force-push history rewrite if needed.

Contributors: please run `git diff` before every commit and never commit a `.env` file. Our CI runs secret scanning on every PR — but the first line of defense is you.

## Supported versions

This repository is a baseline template. The `main` branch is the only supported version; older commits do not receive security updates.

Downstream projects that fork this baseline must publish their own support window in their `SECURITY.md`.

## Safe harbor

We will not pursue legal action against researchers who:

- Report vulnerabilities in good faith via the channels above.
- Do not exploit a vulnerability beyond what is necessary to demonstrate it.
- Do not access, modify, or delete data that is not their own.
- Give us a reasonable opportunity to fix the issue before public disclosure.

If in doubt, ask first. We would rather have a conversation than a misunderstanding.

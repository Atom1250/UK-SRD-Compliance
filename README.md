# UK-SRD-Compliance

This repository contains the first iteration of the SDR Preference Pathway assistant described in the product specification. The goal is to incrementally build a compliant onboarding workflow that educates clients, captures their informed choices, and prepares adviser-ready documentation.

## Structure

- `frontend/` — Next.js application that renders a prototype chat surface and talks to the orchestration API.
- `api/` — Express + TypeScript service that exposes the first set of session endpoints and a JSON validator aligned to the canonical schema.

## Getting started

```bash
npm install
npm run --workspace api dev
npm run --workspace frontend dev
```

Set `NEXT_PUBLIC_API_BASE` in `frontend/.env.local` if the API runs on a non-default port or host.

## Next steps

- Replace the in-memory session store with PostgreSQL persistence.
- Expand the state machine with branching logic for pathways that require follow-up questions.
- Flesh out the chat UI with streaming responses and adviser escalation controls.
- Add automated tests (Jest/Playwright) and CI workflows once the basic flow stabilises.

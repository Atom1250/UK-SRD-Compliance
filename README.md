# UK-SRD-Compliance

This repository now contains a dependency-free Node.js prototype of the SDR Preference
Pathway chatbot. The goal is to make the workflow runnable on constrained
machines (e.g. where `npm install` cannot reach the public registry) while still
respecting the specification’s consent → education → preference capture
progression.

## Running the prototype

1. Ensure Node.js ≥ 18 is available (the environment already provides npm 11.6).
2. Start the server:
   ```bash
   node server/server.js
   ```
3. Open <http://localhost:4000> in a browser to interact with the chat surface.

No package installation is required – the server uses only built-in Node
modules and serves a static HTML/JS interface from `public/`.

## Architecture overview

- `server/` contains a lightweight HTTP router, conversation state machine, and
  validation utilities that mirror the canonical SDR JSON schema.
- `public/` provides an accessible chat UI that exercises the API. The summary
  panel always shows the draft session payload stored in memory.

### API surface

All endpoints live under `/api`:

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/api/health` | Liveness probe |
| `POST` | `/api/sessions` | Create a session and return the first prompt |
| `GET` | `/api/sessions/{id}` | Retrieve the latest session snapshot |
| `POST` | `/api/sessions/{id}/events` | Append chat/audit events and optional data patches |
| `POST` | `/api/sessions/{id}/advance` | Move to the next stage (S0 → S7) |
| `POST` | `/api/sessions/{id}/validate` | Run SDR suitability checks |
| `POST` | `/api/reports` | Generate a placeholder DOCX reference (in-memory) |
| `POST` | `/api/esign/envelopes` | Simulate e-sign envelope creation |
| `POST` | `/api/esign/webhook` | Accept webhook notifications |
| `GET` | `/api/adviser/cases` | Adviser overview of active sessions |
| `GET` | `/api/adviser/cases/{id}` | Detailed case view |
| `PATCH` | `/api/adviser/cases/{id}` | Update adviser commentary / overrides |

The server keeps everything in-memory so restarting the process clears the data.

### Validation rules implemented

`server/state/validateSession.js` enforces the key compliance checks from the
specification:

- Consent acknowledgement is explicit and timestamped.
- Client profile captures UUID, email, ATR, CfL, and horizon.
- Pathway allocations sum to 100% with SDG/impact follow-ups when applicable.
- Ethical screens cannot be left empty when enabled.
- Bespoke fees require an explanation.
- Report metadata (version) is set before document generation.

`POST /api/sessions/{id}/validate` returns `{ valid: boolean, issues: string[] }`
so the UI or adviser console can surface outstanding gaps before drafting the
report.

## Next steps

- Persist sessions in PostgreSQL or another durable store instead of memory.
- Replace the placeholder DOCX/ESign handlers with real integrations.
- Expand the front-end to capture structured questionnaire answers per stage.
- Add automated unit tests for state transitions and validation edge cases.

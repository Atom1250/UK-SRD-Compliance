# UK-SRD-Compliance

This repository now contains a dependency-free Node.js prototype of the SDR Preference
Pathway chatbot. The goal is to make the workflow runnable on constrained
machines (e.g. where `npm install` cannot reach the public registry) while still
respecting the specification’s consent → education → preference capture
progression. The conversation engine now reacts to user inputs, records answers
into the canonical JSON structure, and generates a downloadable PDF summary once
the client approves the draft.


## Running the prototype

1. Ensure Node.js ≥ 18 is available (the environment already provides npm 11.6).
2. Start the server:
   ```bash
   node server/server.js
   ```
3. Open <http://localhost:4000> in a browser to interact with the chat surface.
   - The assistant walks through consent, client profile, informed-choice
     acknowledgement, preference capture (allocations + SDG / ethical branches),
     and preview/approval.
   - After you type “approve”, the page reveals the generated report preview and
     a PDF download link.

### Quick API smoke test

From a second terminal you can hit the same running server with `curl`:

```bash
# health check
curl -s http://localhost:4000/api/health

# start a new in-memory session
curl -s -X POST http://localhost:4000/api/sessions | jq '.session.id'

# replace SESSION_ID below with the value returned above
curl -s http://localhost:4000/api/sessions/SESSION_ID/validate | jq '.validation'
```

`/validate` now accepts either `GET` or `POST`, so the last command works
verbatim with the ID returned from the session creation response.


No package installation is required – the server uses only built-in Node
modules and serves a static HTML/JS interface from `public/`.

## Architecture overview

- `server/` contains a lightweight HTTP router, conversation state machine, and
  validation utilities that mirror the canonical SDR JSON schema.
- `public/` provides an accessible chat UI that exercises the API. The summary
  panel shows the evolving session payload and the report section surfaces the
  rendered preview + PDF download when available.


### API surface

All endpoints live under `/api`:

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/api/health` | Liveness probe |
| `POST` | `/api/sessions` | Create a session and return the first prompt |
| `GET` | `/api/sessions/{id}` | Retrieve the latest session snapshot |
| `POST` | `/api/sessions/{id}/events` | Append chat/audit events and optional data patches |
| `GET`/`POST` | `/api/sessions/{id}/validate` | Run SDR suitability checks |
| `GET` | `/api/sessions/{id}/report.pdf` | Download the generated PDF report |
| `POST` | `/api/reports` | Generate a placeholder DOCX reference (in-memory) |
| `POST` | `/api/esign/envelopes` | Simulate e-sign envelope creation |
| `POST` | `/api/esign/webhook` | Accept webhook notifications |
| `GET` | `/api/adviser/cases` | Adviser overview of active sessions |
| `GET` | `/api/adviser/cases/{id}` | Detailed case view |
| `PATCH` | `/api/adviser/cases/{id}` | Update adviser commentary / overrides |

The server keeps everything in-memory so restarting the process clears the data
(including generated PDFs).


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

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

### Configuring the compliance assistant

The free-form "Ask a question" button can either call OpenAI or fall back to a
local stub for environments without external network access:

- Set `OPENAI_API_KEY` and (optionally) `OPENAI_MODEL` before starting the
  server to enable live OpenAI completions.
- Set `OPENAI_STUB=true` to bypass the OpenAI SDK entirely. The server will log
  the user's free-form question for adviser review and return a placeholder
  answer so the workflow continues.
- If the OpenAI SDK is not installed, the server automatically switches to the
  stub responder and records that the dependency is missing.

#### Why you might see "I couldn't reach the compliance assistant"

That message comes from the same safety net. When the server can't import the
`openai` package it throws an `OPENAI_NOT_INSTALLED` error, and the responder
falls back to the compliance stub to keep the workflow running. Common causes
are:

- `npm install` was never run in the environment where `node server/server.js`
  is executing, so `node_modules/openai` is missing.
- The project was copied to another machine (or container) without bringing the
  `node_modules` directory along, so the runtime only sees the source tree.
- A deployment pipeline installs dependencies in one directory but starts the
  server from another location that does not contain the installed modules.

Fix the issue by running `npm install` in the same working directory as
`package.json` and then restarting the server. If you prefer to stay offline you
can intentionally enable the stub via `OPENAI_STUB=true`—the message will still
appear, but it confirms the question has been logged for adviser review.

When OpenAI rejects a request with `401 Unauthorized`, the responder also
switches to the stub unless `OPENAI_STRICT=true` is set.

### Quick API smoke test

From a second terminal you can hit the same running server with `curl`:

```bash
# health check
curl -s http://localhost:4000/api/health

# start a new advice session
curl -s -X POST http://localhost:4000/api/sessions | jq '.session.id'

# replace SESSION_ID below with the value returned above
curl -s http://localhost:4000/api/sessions/SESSION_ID/validate | jq '.validation'
```

`/validate` now accepts either `GET` or `POST`, so the last command works
verbatim with the ID returned from the session creation response.

Session data is written to `server/data/sessions.json` (override with the
`SESSION_DB_PATH` environment variable). The on-disk store survives process
restarts so you can refresh the client without losing progress.

## Pilot deployment guide

The application only requires Node.js, so you can stand up a lightweight pilot
environment without containers or external databases. The checklist below keeps
the experience consistent for a small adviser trial while allowing you to switch
between the OpenAI live assistant and the offline stub.

### 1. Prepare the host

1. Provision a small Linux VM (2 vCPU / 4 GB RAM is ample) with outbound HTTPS
   access so `npm install` can fetch the `openai` SDK. Node.js 18 LTS is the
   minimum requirement.
2. Create a dedicated system user (e.g. `srdpilot`) and install Git. If your
   organisation blocks public npm, seed an internal registry mirror first.

### 2. Fetch the code and install dependencies

```bash
sudo -iu srdpilot
git clone https://github.com/Atom1250/UK-SRD-Compliance.git
cd UK-SRD-Compliance
npm ci          # deterministic install of the OpenAI SDK and runtime deps
npm test        # optional: verify automated checks before going live
```

### 3. Configure environment

Set environment variables in the service manager (systemd, PM2, or your PaaS)
before starting the process:

| Variable | Purpose |
| -------- | ------- |
| `PORT` | HTTP port to listen on (defaults to 4000). |
| `OPENAI_API_KEY` | Enable live answers for the "Ask a question" flow. |
| `OPENAI_MODEL` | Override the default model (e.g. `gpt-4o-mini`). |
| `OPENAI_STUB` | Set to `true` to keep responses offline while logging questions. |
| `SESSION_DB_PATH` | Change the location of the JSON session store. |
| `OPENAI_STRICT` | Set to `true` to surface 401 errors instead of stubbing. |

If you are running an offline pilot, leave `OPENAI_API_KEY` unset and export
`OPENAI_STUB=true` so the team receives contextual stub replies.

### 4. Run the server for the pilot

The simplest option is to keep the Node process alive with systemd. Drop the
following unit file into `/etc/systemd/system/uk-srd-compliance.service`:

```ini
[Unit]
Description=UK SDR Compliance pilot
After=network.target

[Service]
Type=simple
User=srdpilot
WorkingDirectory=/home/srdpilot/UK-SRD-Compliance
Environment="PORT=4000"
EnvironmentFile=-/home/srdpilot/UK-SRD-Compliance/.env
ExecStart=/usr/bin/node server/server.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

You can keep sensitive variables (like `OPENAI_API_KEY`) inside an `.env` file
referenced by `EnvironmentFile`. Then enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now uk-srd-compliance
sudo systemctl status uk-srd-compliance
```

Attach a reverse proxy such as Nginx or your corporate load balancer if you need
TLS termination. Point your browser at `https://<host>/` (or `http://<host>:4000`
without a proxy) and invite advisers to exercise the flow. All pilot data lives
in `server/data/sessions.json`; rotate or purge the file between cohorts if
needed.

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

The server uses a lightweight JSON store for persistence (see `server/data/`).
Delete the file to reset the environment during local testing.


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

- Swap the JSON file store for a managed database (e.g. PostgreSQL) when
  deploying to shared infrastructure.
- Replace the placeholder DOCX/ESign handlers with real integrations.
- Add end-to-end tests that drive the browser UI through the full ESG journey.

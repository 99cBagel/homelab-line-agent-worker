# Line-Agent Worker

`line-agent-worker` maps LINE text to an enabled entry in the bundled
[`Key_Agents_Table.json`](./Key_Agents_Table.json). It does not execute actions,
store LINE credentials, store MQTT credentials, or hold HomeLab secrets.

The JSON file is the canonical editable table for this Worker. Wrangler bundles
it on each deployment, so table edits require a Worker deployment to take
effect. No HomeLab service or public table endpoint is required.

## API

`GET /healthz` is public and reports only the table name and schema version.

`POST /match` requires:

```text
Authorization: Bearer <LINE_AGENT_WORKER_SHARED_SECRET>
Content-Type: application/json
```

Request:

```json
{ "message": "Power up Lenovo" }
```

The Worker returns an Agent/action ID, or the root `agents` menu. Vercel must
still validate IDs against its own local allow-list and execute only its
deterministic handlers.

## Cloudflare setup

After deployment, set the same random value in both places:

```text
Cloudflare Worker secret: LINE_AGENT_WORKER_SHARED_SECRET
Vercel environment variable: LINE_AGENT_WORKER_SHARED_SECRET
```

Vercel will also need `LINE_AGENT_WORKER_URL` once runtime integration is
enabled. Do not put either value in this repository or in the JSON table.

For local Wrangler development, enter the secret in the ignored `.env` file.
This file is not deployed. Before a production deployment, run `wrangler secret
put LINE_AGENT_WORKER_SHARED_SECRET` to store the same value in Cloudflare.

## Local checks

```powershell
cd C:\002-workspace\stoveSpider\line-agent-worker
npm install
npm test
npx wrangler deploy
```

Deployment is deliberately manual for now. Creating these files does not deploy
the Worker or change Vercel's existing runtime integration.

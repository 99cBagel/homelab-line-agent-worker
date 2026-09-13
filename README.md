# Line-Agent Worker

`line-agent-worker` maps LINE text to an enabled entry in the Key Agents Table
(KAT). It does not execute actions, store LINE credentials, store MQTT
credentials, or hold HomeLab secrets.

The bundled [`Key_Agents_Table.json`](./Key_Agents_Table.json) and
[`Role_Prompt.md`](./Role_Prompt.md) are safe defaults. Production changes live
in the dedicated `line-agent-config` R2 bucket, so KAT and Role Prompt edits
take effect without a Worker deployment. The Worker keeps the bundled KAT if a
stored version is malformed or R2 is unavailable.

Do not bind the Document Bucket here. The LINE-facing Worker needs only the
small configuration bucket, not access to uploaded documents.

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

## Runtime configuration API

The following endpoints require `LINE_AGENT_WORKER_SHARED_SECRET` and are for
the Vercel webhook only: `GET /config/kat`, `GET /config/role-prompt`,
`POST /config/kat`, and `POST /config/role-prompt`.

Updates require an `actor_id` listed in the Worker secret `LINE_ADMIN_USER_IDS`
(comma-separated LINE user IDs). An update saves the previous live object under
`config/revisions/` before replacing it. KAT updates are schema-checked and
cannot alter Vercel's independent execution allow-list.

The Vercel webhook exposes these controls only in a one-to-one LINE chat for an
allowed administrator: send `Agent Admin`, then use its Flex menu; send
`update role prompt: ...` or `update kat: {...}` to write a new version.

## Cloudflare setup

After deployment, set the same random value in both places:

```text
Cloudflare Worker secret: LINE_AGENT_WORKER_SHARED_SECRET
Vercel environment variable: LINE_AGENT_WORKER_SHARED_SECRET
```

Vercel will also need `LINE_AGENT_WORKER_URL` once runtime integration is
enabled. Do not put either value in this repository or in the JSON table.

Create the configuration bucket once before deployment:

```powershell
npx wrangler r2 bucket create line-agent-config
```

Set `LINE_ADMIN_USER_IDS` to the same comma-separated administrator LINE user
IDs in both Cloudflare Worker secrets and Vercel environment variables. The
Worker binding is declared in `wrangler.jsonc` as `LINE_AGENT_CONFIG`.

For a private household account, `LINE_AGENT_ADMIN_OPEN=true` on both Vercel
and the Worker bypasses the user-ID allow-list. It still blocks group chats,
but every person who can directly message the Official Account can view and
replace the KAT and Role Prompt.

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

# WhatsApp Webhook (Go)

This package exposes `WebhookHandler` to validate (GET) and process (POST) WhatsApp Cloud API webhooks.

## Environment Variables

- `WSP_VERIFY_TOKEN`: token you configure in Meta for the verification handshake.
- `WSP_APP_SECRET`: your Meta App Secret (used to validate the `X-Hub-Signature-256` HMAC).

The package automatically loads `.env` in development using `github.com/joho/godotenv`. In production, set these variables in your process environment (Docker/K8s/service).

## Quick Local Run

1) Ensure you have a `.env` at the repo root containing:

```
WSP_VERIFY_TOKEN=your-dev-verify-token
WSP_APP_SECRET=your-dev-app-secret
```

2) Run the included local server (already in `cmd/wsp-webhook/main.go`):

```
go run ./cmd/wsp-webhook
```

3) Manual verification (simulate Meta handshake):

```
curl -i "http://localhost:8080/api/wsp/webhook?hub.mode=subscribe&hub.verify_token=your-dev-verify-token&hub.challenge=1234"
```

You should receive `200 OK` with body `1234`.

4) Event signatures (POST):

To test POST, send a payload and include an HMAC-SHA256 signature with your `WSP_APP_SECRET` in the header `X-Hub-Signature-256: sha256=<hex>`.

## Expose with ngrok (to test with Meta)

1) Install and authenticate ngrok:

```
brew install ngrok/ngrok/ngrok   # macOS (or download from ngrok.com)
ngrok config add-authtoken <YOUR_AUTHTOKEN>
```

2) Start the local server and ngrok in parallel:

```
go run ./cmd/wsp-webhook
# in another terminal
ngrok http 8080
```

3) Copy the public HTTPS URL from ngrok, e.g. `https://<subdomain>.ngrok.io`.

4) In Meta (developers.facebook.com):
- App → WhatsApp → Configuration → Webhook
- Callback URL: `https://<subdomain>.ngrok.io/api/wsp/webhook`
- Verify Token: same value as `WSP_VERIFY_TOKEN` in your `.env`
- Save and verify. If everything is correct, you will see 200 OK.

5) Send a message to your configured WhatsApp number. You should see `wsp:webhook received: ...` with the event payload in your server logs.

Notes:
- If you `curl -X POST` directly to ngrok without a valid signature, you will get `401 invalid signature`.
- Make sure the `messages` field is subscribed in the WhatsApp webhook configuration to receive events.

## Notes

- Do not expose these secrets to the client. Do not use the `NEXT_PUBLIC_` prefix.
- The handler responds quickly and offloads work asynchronously with `go persistOrEnqueue(body)`.
- If `WSP_VERIFY_TOKEN` or `WSP_APP_SECRET` are missing, the process fails at startup.

Note: `.env.local` is not used in this repo; prefer `.env` or system environment variables.

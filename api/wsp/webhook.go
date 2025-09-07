package handler

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

// init: load env vars in development and validate required ones
func init() {
    // Load variables from .env without overriding values already set
    // in the current process environment.
    _ = godotenv.Load()

    // Fail fast if required secrets are missing
    if os.Getenv("WSP_VERIFY_TOKEN") == "" || os.Getenv("WSP_APP_SECRET") == "" {
        log.Fatal("missing required envs: WSP_VERIFY_TOKEN and/or WSP_APP_SECRET")
    }
}

// GET: verification  |  POST: events
func WebhookHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
		case http.MethodGet:
			verify(w, r)
		case http.MethodPost:
			events(w, r)
		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func verify(w http.ResponseWriter, r *http.Request) {
	mode := r.URL.Query().Get("hub.mode")
	token := r.URL.Query().Get("hub.verify_token")
	challenge := r.URL.Query().Get("hub.challenge")
	if mode == "subscribe" && token == os.Getenv("WSP_VERIFY_TOKEN") {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(challenge))
		return
	}
	http.Error(w, "Forbidden", http.StatusForbidden)
}

func events(w http.ResponseWriter, r *http.Request) {
    // 1) read body (required for signature verification)
    body, err := io.ReadAll(r.Body)
    if err != nil {
        http.Error(w, "Bad Request", http.StatusBadRequest)
        return
    }
    _ = r.Body.Close()

    // 2) validate HMAC-SHA256 signature: header format: "sha256=<hex>"
    if !validSignature(r.Header.Get("X-Hub-Signature-256"), body, os.Getenv("WSP_APP_SECRET")) {
        http.Error(w, "invalid signature", http.StatusUnauthorized); return
    }

    // 3) immediate ACK (WhatsApp retries if you take too long)
    w.WriteHeader(http.StatusOK)
    _, _ = w.Write([]byte("ok"))

    // 4) async work (persist/enqueue) — DO NOT block the response
    log.Printf("wsp:webhook received: %s", string(body))
    go persistOrEnqueue(body)
}

func validSignature(sigHeader string, body []byte, secret string) bool {
	if !strings.HasPrefix(sigHeader, "sha256=") || secret == "" {
		return false
	}
	given := strings.TrimPrefix(sigHeader, "sha256=")
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(strings.ToLower(given)), []byte(expected))
}

func persistOrEnqueue(body []byte) {
    // TODO: minimally parse and persist for idempotency
    var payload map[string]any
    _ = json.Unmarshal(body, &payload)
    // Examples:
    // - INSERT ... ON CONFLICT DO NOTHING (message_id PK)
    // - Enqueue to Vercel Queues / Redis / SQS to process replies
}

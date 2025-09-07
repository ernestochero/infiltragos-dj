package main

import (
	"log"
	"net/http"
	"os"

	handler "infiltragos-dj/api/wsp"
)

func main() {
    mux := http.NewServeMux()
    mux.HandleFunc("/api/wsp/webhook", handler.WebhookHandler)

    addr := ":8080"
    if p := os.Getenv("PORT"); p != "" {
        addr = ":" + p
    }

    log.Printf("wsp-webhook listening on %s", addr)
    log.Fatal(http.ListenAndServe(addr, mux))
}


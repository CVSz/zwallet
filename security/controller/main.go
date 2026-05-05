// security/controller/main.go
// Autonomous Security Controller (Falco → Decision → Action)

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	kubernetes "k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

// FalcoEvent structure (simplified)
type FalcoEvent struct {
	Output       string            `json:"output"`
	Priority     string            `json:"priority"`
	Rule         string            `json:"rule"`
	OutputFields map[string]string `json:"output_fields"`
}

var clientset *kubernetes.Clientset

func initK8s() {
	config, err := rest.InClusterConfig()
	if err != nil {
		log.Fatal(err)
	}

	clientset, err = kubernetes.NewForConfig(config)
	if err != nil {
		log.Fatal(err)
	}
}

func quarantinePod(namespace, pod string) {
	log.Printf("[ACTION] Quarantine pod %s/%s", namespace, pod)

	patch := []byte(`{"metadata":{"labels":{"quarantine":"true"}}}`)

	_, err := clientset.CoreV1().Pods(namespace).Patch(
		context.TODO(),
		pod,
		metav1.TypeMergePatchType,
		patch,
		metav1.PatchOptions{},
	)

	if err != nil {
		log.Printf("[ERROR] Failed to quarantine pod: %v", err)
	}
}

func sanitizeLogField(value string) string {
	clean := strings.ReplaceAll(value, "\n", " ")
	clean = strings.ReplaceAll(clean, "\r", " ")
	return clean
}

func handler(w http.ResponseWriter, r *http.Request) {
	var event FalcoEvent

	if err := json.NewDecoder(r.Body).Decode(&event); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	log.Printf("[EVENT] %q", sanitizeLogField(event.Output))

	// Decision logic (can extend with ML / scoring)
	if event.Priority == "CRITICAL" || event.Priority == "ERROR" {
		pod := event.OutputFields["k8s.pod.name"]
		ns := event.OutputFields["k8s.ns.name"]

		if pod != "" && ns != "" {
			quarantinePod(ns, pod)
		}
	}

	w.WriteHeader(http.StatusOK)
}

func main() {
	initK8s()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	http.HandleFunc("/falco", handler)

	log.Print(fmt.Sprintf("[START] Autonomous Security Controller running on :%s", port))
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

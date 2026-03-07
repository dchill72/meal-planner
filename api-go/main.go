package main

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/gorilla/mux"
	"meal-planner-api/config"
	"meal-planner-api/db"
	"meal-planner-api/handlers"
)

func corsMiddleware(origin string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func main() {
	cfg := config.Load()
	db.Init(cfg.MongoDBURL)

	app := handlers.NewApp(cfg)

	r := mux.NewRouter()
	r.Use(app.AuthMiddleware)

	r.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"body": "Go + MongoDB Server"})
	}).Methods("GET")

	r.HandleFunc("/auth/google", app.GoogleAuth).Methods("POST")
	r.HandleFunc("/auth/logout", app.Logout).Methods("POST")
	r.HandleFunc("/me", app.GetMe).Methods("GET")
	r.HandleFunc("/me", app.UpdateMe).Methods("PUT")

	r.HandleFunc("/menu", app.GetMenuItems).Methods("GET")
	r.HandleFunc("/menu", app.CreateMenuItem).Methods("POST")
	r.HandleFunc("/menu/{id}", app.GetMenuItem).Methods("GET")
	r.HandleFunc("/menu/{id}", app.UpdateMenuItem).Methods("PUT")
	r.HandleFunc("/menu/{id}", app.DeleteMenuItem).Methods("DELETE")

	log.Printf("[server]: Server is running at http://localhost:%s", cfg.Port)
	log.Fatal(http.ListenAndServe(":"+cfg.Port, corsMiddleware(cfg.CORSOrigin, r)))
}

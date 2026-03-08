package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"meal-planner-api/config"
	"meal-planner-api/db"
	"meal-planner-api/handlers"
	mcpserver "meal-planner-api/mcp"
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

// mcpAuthMiddleware rejects MCP requests whose Bearer token doesn't match any user's mcpKey.
func mcpAuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		auth := r.Header.Get("Authorization")
		token := strings.TrimPrefix(auth, "Bearer ")
		if token == "" || token == auth {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		database, err := db.GetDB()
		if err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}
		count, err := database.Collection("auth").CountDocuments(
			context.Background(),
			bson.M{"mcpKey": token},
		)
		if err != nil || count == 0 {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
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

	r.HandleFunc("/menus", app.GetMenus).Methods("GET")
	r.HandleFunc("/menus", app.CreateMenu).Methods("POST")
	r.HandleFunc("/menus/{id}", app.UpdateMenu).Methods("PUT")
	r.HandleFunc("/menus/{id}", app.DeleteMenu).Methods("DELETE")
	r.HandleFunc("/menus/{id}/entries", app.AddMenuEntry).Methods("POST")
	r.HandleFunc("/menus/{id}/entries/{entryId}", app.UpdateMenuEntry).Methods("PUT")
	r.HandleFunc("/menus/{id}/entries/{entryId}", app.RemoveMenuEntry).Methods("DELETE")
	r.HandleFunc("/menus/{id}/grocery-list", app.GetGroceryList).Methods("GET")

	r.HandleFunc("/ingredients", app.GetIngredients).Methods("GET")
	r.HandleFunc("/ingredients", app.CreateIngredient).Methods("POST")
	r.HandleFunc("/ingredients/{id}", app.UpdateIngredient).Methods("PUT")
	r.HandleFunc("/ingredients/{id}", app.DeleteIngredient).Methods("DELETE")

	r.HandleFunc("/dishes", app.GetDishes).Methods("GET")
	r.HandleFunc("/dishes", app.CreateDish).Methods("POST")
	r.HandleFunc("/dishes/{id}", app.UpdateDish).Methods("PUT")
	r.HandleFunc("/dishes/{id}", app.DeleteDish).Methods("DELETE")
	r.HandleFunc("/dishes/{id}/ingredients", app.AddDishIngredient).Methods("POST")
	r.HandleFunc("/dishes/{id}/ingredients/{entryId}", app.RemoveDishIngredient).Methods("DELETE")

	r.HandleFunc("/meals", app.GetMeals).Methods("GET")
	r.HandleFunc("/meals", app.CreateMeal).Methods("POST")
	r.HandleFunc("/meals/{id}", app.UpdateMeal).Methods("PUT")
	r.HandleFunc("/meals/{id}", app.DeleteMeal).Methods("DELETE")
	r.HandleFunc("/meals/{id}/dishes", app.AddMealDish).Methods("POST")
	r.HandleFunc("/meals/{id}/dishes/{dishId}", app.RemoveMealDish).Methods("DELETE")

	r.HandleFunc("/me/mcp-key", app.GenerateMCPKey).Methods("POST")

	// MCP endpoint — protected by per-user API key, bypasses session auth
	r.PathPrefix("/mcp").Handler(mcpAuthMiddleware(mcpserver.NewHandler()))

	log.Printf("[server]: Server is running at http://localhost:%s", cfg.Port)
	log.Fatal(http.ListenAndServe(":"+cfg.Port, corsMiddleware(cfg.CORSOrigin, r)))
}

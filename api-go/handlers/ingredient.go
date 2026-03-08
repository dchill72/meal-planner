package handlers

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"meal-planner-api/db"
)

type Ingredient struct {
	ID          primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Description string             `json:"description" bson:"description"`
}

// GetIngredients handles GET /ingredients
func (a *App) GetIngredients(w http.ResponseWriter, r *http.Request) {
	database, err := db.GetDB()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	cursor, err := database.Collection("ingredients").Find(context.Background(), bson.M{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer cursor.Close(context.Background())

	var items []Ingredient
	if err = cursor.All(context.Background(), &items); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if items == nil {
		items = []Ingredient{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"data": items})
}

// CreateIngredient handles POST /ingredients
func (a *App) CreateIngredient(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Description string `json:"description"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if body.Description == "" {
		http.Error(w, "description is required", http.StatusBadRequest)
		return
	}

	ingredient := Ingredient{
		ID:          primitive.NewObjectID(),
		Description: body.Description,
	}

	database, err := db.GetDB()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if _, err = database.Collection("ingredients").InsertOne(context.Background(), ingredient); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{"data": ingredient})
}

// UpdateIngredient handles PUT /ingredients/{id}
func (a *App) UpdateIngredient(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	var body struct {
		Description string `json:"description"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if body.Description == "" {
		http.Error(w, "description is required", http.StatusBadRequest)
		return
	}

	database, err := db.GetDB()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	_, err = database.Collection("ingredients").UpdateOne(
		context.Background(),
		bson.M{"_id": objID},
		bson.M{"$set": bson.M{"description": body.Description}},
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// DeleteIngredient handles DELETE /ingredients/{id}
func (a *App) DeleteIngredient(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	database, err := db.GetDB()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if _, err = database.Collection("ingredients").DeleteOne(context.Background(), bson.M{"_id": objID}); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

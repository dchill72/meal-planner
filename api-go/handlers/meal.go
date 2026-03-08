package handlers

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/v2/bson"
	
	"meal-planner-api/db"
)

type Meal struct {
	ID      bson.ObjectID   `json:"id" bson:"_id,omitempty"`
	Name    string               `json:"name" bson:"name"`
	DishIDs []bson.ObjectID `json:"dishIds" bson:"dishIds"`
}

// GetMeals handles GET /meals
func (a *App) GetMeals(w http.ResponseWriter, r *http.Request) {
	database, err := db.GetDB()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	cursor, err := database.Collection("meals").Find(context.Background(), bson.M{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer cursor.Close(context.Background())

	var meals []Meal
	if err = cursor.All(context.Background(), &meals); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if meals == nil {
		meals = []Meal{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"data": meals})
}

// CreateMeal handles POST /meals — body: {name}
func (a *App) CreateMeal(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if body.Name == "" {
		http.Error(w, "name is required", http.StatusBadRequest)
		return
	}

	meal := Meal{
		ID:      bson.NewObjectID(),
		Name:    body.Name,
		DishIDs: []bson.ObjectID{},
	}

	database, err := db.GetDB()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if _, err = database.Collection("meals").InsertOne(context.Background(), meal); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{"data": meal})
}

// UpdateMeal handles PUT /meals/{id} — body: {name}
func (a *App) UpdateMeal(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	objID, err := bson.ObjectIDFromHex(id)
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	var body struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if body.Name == "" {
		http.Error(w, "name is required", http.StatusBadRequest)
		return
	}

	database, err := db.GetDB()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	_, err = database.Collection("meals").UpdateOne(
		context.Background(),
		bson.M{"_id": objID},
		bson.M{"$set": bson.M{"name": body.Name}},
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// DeleteMeal handles DELETE /meals/{id}
func (a *App) DeleteMeal(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	objID, err := bson.ObjectIDFromHex(id)
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	database, err := db.GetDB()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if _, err = database.Collection("meals").DeleteOne(context.Background(), bson.M{"_id": objID}); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// AddMealDish handles POST /meals/{id}/dishes — body: {dishId}
func (a *App) AddMealDish(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	mealID, err := bson.ObjectIDFromHex(id)
	if err != nil {
		http.Error(w, "invalid meal id", http.StatusBadRequest)
		return
	}

	var body struct {
		DishID string `json:"dishId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	dishID, err := bson.ObjectIDFromHex(body.DishID)
	if err != nil {
		http.Error(w, "invalid dishId", http.StatusBadRequest)
		return
	}

	database, err := db.GetDB()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	_, err = database.Collection("meals").UpdateOne(
		context.Background(),
		bson.M{"_id": mealID},
		bson.M{"$addToSet": bson.M{"dishIds": dishID}},
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// RemoveMealDish handles DELETE /meals/{id}/dishes/{dishId}
func (a *App) RemoveMealDish(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	mealID, err := bson.ObjectIDFromHex(vars["id"])
	if err != nil {
		http.Error(w, "invalid meal id", http.StatusBadRequest)
		return
	}
	dishID, err := bson.ObjectIDFromHex(vars["dishId"])
	if err != nil {
		http.Error(w, "invalid dish id", http.StatusBadRequest)
		return
	}

	database, err := db.GetDB()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	_, err = database.Collection("meals").UpdateOne(
		context.Background(),
		bson.M{"_id": mealID},
		bson.M{"$pull": bson.M{"dishIds": dishID}},
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

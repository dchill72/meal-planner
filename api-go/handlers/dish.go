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

type Measure string

const (
	// Volume — Imperial
	MeasureTeaspoon   Measure = "tsp"
	MeasureTablespoon Measure = "tbsp"
	MeasureFluidOunce Measure = "fl oz"
	MeasureCup        Measure = "cup"
	MeasurePint       Measure = "pt"
	MeasureQuart      Measure = "qt"
	MeasureGallon     Measure = "gal"
	// Volume — Metric
	MeasureMilliliter Measure = "ml"
	MeasureLiter      Measure = "l"
	// Weight — Imperial
	MeasureOunce Measure = "oz"
	MeasurePound Measure = "lb"
	// Weight — Metric
	MeasureGram     Measure = "g"
	MeasureKilogram Measure = "kg"
	// Discrete count
	MeasureCount Measure = "count"
)

// DishIngredient is a single ingredient entry within a Dish, stored as a
// sub-document. Each entry has its own _id so it can be individually removed.
// Variation is optional — it records which variant of the ingredient is used
// (e.g. "Salted" for Butter), matching a value from Ingredient.Variations.
type DishIngredient struct {
	ID           primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	IngredientID primitive.ObjectID `json:"ingredientId" bson:"ingredientId"`
	Variation    string             `json:"variation" bson:"variation"`
	Amount       float64            `json:"amount" bson:"amount"`
	Measure      Measure            `json:"measure" bson:"measure"`
}

type Dish struct {
	ID           primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Name         string             `json:"name" bson:"name"`
	Serves       int                `json:"serves" bson:"serves"`
	Instructions string             `json:"instructions" bson:"instructions"`
	Source       string             `json:"source" bson:"source"`
	Ingredients  []DishIngredient   `json:"ingredients" bson:"ingredients"`
}

// GetDishes handles GET /dishes
func (a *App) GetDishes(w http.ResponseWriter, r *http.Request) {
	database, err := db.GetDB()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	cursor, err := database.Collection("dishes").Find(context.Background(), bson.M{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer cursor.Close(context.Background())

	var dishes []Dish
	if err = cursor.All(context.Background(), &dishes); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if dishes == nil {
		dishes = []Dish{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"data": dishes})
}

// CreateDish handles POST /dishes — body: {name, serves?, instructions?, source?}
func (a *App) CreateDish(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name         string `json:"name"`
		Serves       int    `json:"serves"`
		Instructions string `json:"instructions"`
		Source       string `json:"source"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if body.Name == "" {
		http.Error(w, "name is required", http.StatusBadRequest)
		return
	}

	dish := Dish{
		ID:           primitive.NewObjectID(),
		Name:         body.Name,
		Serves:       body.Serves,
		Instructions: body.Instructions,
		Source:       body.Source,
		Ingredients:  []DishIngredient{},
	}

	database, err := db.GetDB()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if _, err = database.Collection("dishes").InsertOne(context.Background(), dish); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{"data": dish})
}

// UpdateDish handles PUT /dishes/{id} — body: {name, serves?, instructions?, source?}
func (a *App) UpdateDish(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	var body struct {
		Name         string `json:"name"`
		Serves       int    `json:"serves"`
		Instructions string `json:"instructions"`
		Source       string `json:"source"`
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

	_, err = database.Collection("dishes").UpdateOne(
		context.Background(),
		bson.M{"_id": objID},
		bson.M{"$set": bson.M{"name": body.Name, "serves": body.Serves, "instructions": body.Instructions, "source": body.Source}},
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// DeleteDish handles DELETE /dishes/{id}
func (a *App) DeleteDish(w http.ResponseWriter, r *http.Request) {
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

	if _, err = database.Collection("dishes").DeleteOne(context.Background(), bson.M{"_id": objID}); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// AddDishIngredient handles POST /dishes/{id}/ingredients — body: {ingredientId, amount, measure}
func (a *App) AddDishIngredient(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	dishID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		http.Error(w, "invalid dish id", http.StatusBadRequest)
		return
	}

	var body struct {
		IngredientID string  `json:"ingredientId"`
		Variation    string  `json:"variation"`
		Amount       float64 `json:"amount"`
		Measure      Measure `json:"measure"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	ingredientID, err := primitive.ObjectIDFromHex(body.IngredientID)
	if err != nil {
		http.Error(w, "invalid ingredientId", http.StatusBadRequest)
		return
	}
	if body.Amount <= 0 {
		http.Error(w, "amount must be positive", http.StatusBadRequest)
		return
	}
	if body.Measure == "" {
		http.Error(w, "measure is required", http.StatusBadRequest)
		return
	}

	entry := DishIngredient{
		ID:           primitive.NewObjectID(),
		IngredientID: ingredientID,
		Variation:    body.Variation,
		Amount:       body.Amount,
		Measure:      body.Measure,
	}

	database, err := db.GetDB()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	_, err = database.Collection("dishes").UpdateOne(
		context.Background(),
		bson.M{"_id": dishID},
		bson.M{"$push": bson.M{"ingredients": entry}},
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{"data": entry})
}

// RemoveDishIngredient handles DELETE /dishes/{id}/ingredients/{entryId}
func (a *App) RemoveDishIngredient(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	dishID, err := primitive.ObjectIDFromHex(vars["id"])
	if err != nil {
		http.Error(w, "invalid dish id", http.StatusBadRequest)
		return
	}
	entryID, err := primitive.ObjectIDFromHex(vars["entryId"])
	if err != nil {
		http.Error(w, "invalid entry id", http.StatusBadRequest)
		return
	}

	database, err := db.GetDB()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	_, err = database.Collection("dishes").UpdateOne(
		context.Background(),
		bson.M{"_id": dishID},
		bson.M{"$pull": bson.M{"ingredients": bson.M{"_id": entryID}}},
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

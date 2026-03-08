package handlers

import (
	"context"
	"encoding/json"
	"math"
	"net/http"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"meal-planner-api/db"
)

type GroceryLine struct {
	IngredientID string  `json:"ingredientId"`
	Description  string  `json:"description"`
	Variation    string  `json:"variation"`
	Amount       float64 `json:"amount"`
	Measure      string  `json:"measure"`
	StoreArea    string  `json:"storeArea"`
}

// aggregation key: ingredientId::variation::measure
type aggKey struct {
	IngredientID primitive.ObjectID
	Variation    string
	Measure      string
}

// GetGroceryList handles GET /menus/{id}/grocery-list
//
// For each menu entry it:
//  1. Loads the meal
//  2. Loads each dish in the meal
//  3. Scales each dish ingredient by (entry.headcount / dish.serves)
//  4. Aggregates amounts by (ingredientId, variation, measure)
//  5. Attaches ingredient description and store area
//  6. Returns a flat list sorted by store area
func (a *App) GetGroceryList(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	menuID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		http.Error(w, "invalid menu id", http.StatusBadRequest)
		return
	}

	database, err := db.GetDB()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// 1. Load menu
	var menu Menu
	if err = database.Collection("menus").FindOne(context.Background(), bson.M{"_id": menuID}).Decode(&menu); err != nil {
		http.Error(w, "menu not found", http.StatusNotFound)
		return
	}

	if len(menu.Entries) == 0 {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{"data": []GroceryLine{}})
		return
	}

	// 2. Collect unique meal IDs and dish IDs
	mealIDSet := map[primitive.ObjectID]struct{}{}
	for _, entry := range menu.Entries {
		mealIDSet[entry.MealID] = struct{}{}
	}
	mealIDList := make([]primitive.ObjectID, 0, len(mealIDSet))
	for id := range mealIDSet {
		mealIDList = append(mealIDList, id)
	}

	// 3. Load meals
	mealCursor, err := database.Collection("meals").Find(context.Background(), bson.M{"_id": bson.M{"$in": mealIDList}})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer mealCursor.Close(context.Background())
	var meals []Meal
	if err = mealCursor.All(context.Background(), &meals); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	mealByID := map[primitive.ObjectID]*Meal{}
	dishIDSet := map[primitive.ObjectID]struct{}{}
	for i := range meals {
		mealByID[meals[i].ID] = &meals[i]
		for _, dishID := range meals[i].DishIDs {
			dishIDSet[dishID] = struct{}{}
		}
	}

	// 4. Load dishes
	dishIDList := make([]primitive.ObjectID, 0, len(dishIDSet))
	for id := range dishIDSet {
		dishIDList = append(dishIDList, id)
	}
	dishCursor, err := database.Collection("dishes").Find(context.Background(), bson.M{"_id": bson.M{"$in": dishIDList}})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer dishCursor.Close(context.Background())
	var dishes []Dish
	if err = dishCursor.All(context.Background(), &dishes); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	dishByID := map[primitive.ObjectID]*Dish{}
	ingIDSet := map[primitive.ObjectID]struct{}{}
	for i := range dishes {
		dishByID[dishes[i].ID] = &dishes[i]
		for _, ing := range dishes[i].Ingredients {
			ingIDSet[ing.IngredientID] = struct{}{}
		}
	}

	// 5. Load ingredients
	ingIDList := make([]primitive.ObjectID, 0, len(ingIDSet))
	for id := range ingIDSet {
		ingIDList = append(ingIDList, id)
	}
	ingCursor, err := database.Collection("ingredients").Find(context.Background(), bson.M{"_id": bson.M{"$in": ingIDList}})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer ingCursor.Close(context.Background())
	var ingredients []Ingredient
	if err = ingCursor.All(context.Background(), &ingredients); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	ingByID := map[primitive.ObjectID]*Ingredient{}
	for i := range ingredients {
		ingByID[ingredients[i].ID] = &ingredients[i]
	}

	// 6. Aggregate
	totals := map[aggKey]float64{}
	for _, entry := range menu.Entries {
		meal, ok := mealByID[entry.MealID]
		if !ok {
			continue
		}
		for _, dishID := range meal.DishIDs {
			dish, ok := dishByID[dishID]
			if !ok {
				continue
			}
			scale := 1.0
			if dish.Serves > 0 && entry.Headcount > 0 {
				scale = float64(entry.Headcount) / float64(dish.Serves)
			}
			for _, ing := range dish.Ingredients {
				key := aggKey{IngredientID: ing.IngredientID, Variation: ing.Variation, Measure: string(ing.Measure)}
				totals[key] += ing.Amount * scale
			}
		}
	}

	// 7. Build result
	lines := make([]GroceryLine, 0, len(totals))
	for key, amount := range totals {
		ing := ingByID[key.IngredientID]
		description := key.IngredientID.Hex()
		storeArea := ""
		if ing != nil {
			description = ing.Description
			storeArea = string(ing.StoreArea)
		}
		lines = append(lines, GroceryLine{
			IngredientID: key.IngredientID.Hex(),
			Description:  description,
			Variation:    key.Variation,
			Amount:       math.Round(amount*1000) / 1000,
			Measure:      key.Measure,
			StoreArea:    storeArea,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"data": lines})
}

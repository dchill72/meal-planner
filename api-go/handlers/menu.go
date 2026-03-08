package handlers

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/v2/bson"
	
	"meal-planner-api/db"
)

// MenuEntry is a single scheduled meal within a Menu.
// Date is stored as an ISO-8601 date string (YYYY-MM-DD).
type MenuEntry struct {
	ID        bson.ObjectID `json:"id" bson:"_id,omitempty"`
	MealID    bson.ObjectID `json:"mealId" bson:"mealId"`
	Date      string             `json:"date" bson:"date"`
	Headcount int                `json:"headcount" bson:"headcount"`
	Cook      string             `json:"cook" bson:"cook"`
}

type Menu struct {
	ID        bson.ObjectID `json:"id" bson:"_id,omitempty"`
	Name      string             `json:"name" bson:"name"`
	StartDate string             `json:"startDate" bson:"startDate"`
	EndDate   string             `json:"endDate" bson:"endDate"`
	Entries   []MenuEntry        `json:"entries" bson:"entries"`
}

// GetMenus handles GET /menus
func (a *App) GetMenus(w http.ResponseWriter, r *http.Request) {
	database, err := db.GetDB()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	cursor, err := database.Collection("menus").Find(context.Background(), bson.M{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer cursor.Close(context.Background())

	var menus []Menu
	if err = cursor.All(context.Background(), &menus); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if menus == nil {
		menus = []Menu{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"data": menus})
}

// CreateMenu handles POST /menus — body: {name, startDate, endDate}
func (a *App) CreateMenu(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name      string `json:"name"`
		StartDate string `json:"startDate"`
		EndDate   string `json:"endDate"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if body.Name == "" {
		http.Error(w, "name is required", http.StatusBadRequest)
		return
	}

	menu := Menu{
		ID:        bson.NewObjectID(),
		Name:      body.Name,
		StartDate: body.StartDate,
		EndDate:   body.EndDate,
		Entries:   []MenuEntry{},
	}

	database, err := db.GetDB()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if _, err = database.Collection("menus").InsertOne(context.Background(), menu); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{"data": menu})
}

// UpdateMenu handles PUT /menus/{id} — body: {name, startDate, endDate}
func (a *App) UpdateMenu(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	objID, err := bson.ObjectIDFromHex(id)
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	var body struct {
		Name      string `json:"name"`
		StartDate string `json:"startDate"`
		EndDate   string `json:"endDate"`
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

	_, err = database.Collection("menus").UpdateOne(
		context.Background(),
		bson.M{"_id": objID},
		bson.M{"$set": bson.M{"name": body.Name, "startDate": body.StartDate, "endDate": body.EndDate}},
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// DeleteMenu handles DELETE /menus/{id}
func (a *App) DeleteMenu(w http.ResponseWriter, r *http.Request) {
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

	if _, err = database.Collection("menus").DeleteOne(context.Background(), bson.M{"_id": objID}); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// AddMenuEntry handles POST /menus/{id}/entries — body: {mealId, date, headcount, cook}
func (a *App) AddMenuEntry(w http.ResponseWriter, r *http.Request) {
	id := mux.Vars(r)["id"]
	menuID, err := bson.ObjectIDFromHex(id)
	if err != nil {
		http.Error(w, "invalid menu id", http.StatusBadRequest)
		return
	}

	var body struct {
		MealID    string `json:"mealId"`
		Date      string `json:"date"`
		Headcount int    `json:"headcount"`
		Cook      string `json:"cook"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	mealID, err := bson.ObjectIDFromHex(body.MealID)
	if err != nil {
		http.Error(w, "invalid mealId", http.StatusBadRequest)
		return
	}
	if body.Date == "" {
		http.Error(w, "date is required", http.StatusBadRequest)
		return
	}

	entry := MenuEntry{
		ID:        bson.NewObjectID(),
		MealID:    mealID,
		Date:      body.Date,
		Headcount: body.Headcount,
		Cook:      body.Cook,
	}

	database, err := db.GetDB()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	_, err = database.Collection("menus").UpdateOne(
		context.Background(),
		bson.M{"_id": menuID},
		bson.M{"$push": bson.M{"entries": entry}},
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{"data": entry})
}

// UpdateMenuEntry handles PUT /menus/{id}/entries/{entryId} — body: {mealId, date, headcount, cook}
func (a *App) UpdateMenuEntry(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	menuID, err := bson.ObjectIDFromHex(vars["id"])
	if err != nil {
		http.Error(w, "invalid menu id", http.StatusBadRequest)
		return
	}
	entryID, err := bson.ObjectIDFromHex(vars["entryId"])
	if err != nil {
		http.Error(w, "invalid entry id", http.StatusBadRequest)
		return
	}

	var body struct {
		MealID    string `json:"mealId"`
		Date      string `json:"date"`
		Headcount int    `json:"headcount"`
		Cook      string `json:"cook"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	mealID, err := bson.ObjectIDFromHex(body.MealID)
	if err != nil {
		http.Error(w, "invalid mealId", http.StatusBadRequest)
		return
	}
	if body.Date == "" {
		http.Error(w, "date is required", http.StatusBadRequest)
		return
	}

	database, err := db.GetDB()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	_, err = database.Collection("menus").UpdateOne(
		context.Background(),
		bson.M{"_id": menuID, "entries._id": entryID},
		bson.M{"$set": bson.M{
			"entries.$.mealId":    mealID,
			"entries.$.date":      body.Date,
			"entries.$.headcount": body.Headcount,
			"entries.$.cook":      body.Cook,
		}},
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// RemoveMenuEntry handles DELETE /menus/{id}/entries/{entryId}
func (a *App) RemoveMenuEntry(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	menuID, err := bson.ObjectIDFromHex(vars["id"])
	if err != nil {
		http.Error(w, "invalid menu id", http.StatusBadRequest)
		return
	}
	entryID, err := bson.ObjectIDFromHex(vars["entryId"])
	if err != nil {
		http.Error(w, "invalid entry id", http.StatusBadRequest)
		return
	}

	database, err := db.GetDB()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	_, err = database.Collection("menus").UpdateOne(
		context.Background(),
		bson.M{"_id": menuID},
		bson.M{"$pull": bson.M{"entries": bson.M{"_id": entryID}}},
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

package handlers

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"

	"go.mongodb.org/mongo-driver/v2/bson"
	
	"go.mongodb.org/mongo-driver/v2/mongo/options"
	"google.golang.org/api/idtoken"
	"meal-planner-api/db"
)

type User struct {
	Name    string `json:"name" bson:"name"`
	Email   string `json:"email" bson:"email"`
	Picture string `json:"picture" bson:"picture"`
	Theme   string `json:"theme" bson:"theme"`
	MCPKey  string `json:"mcpKey,omitempty" bson:"mcpKey,omitempty"`
}

// AuthMiddleware loads the current user from the session into the request context.
func (a *App) AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session, _ := a.Store.Get(r, sessionName)
		if userID, ok := session.Values["userId"].(string); ok && userID != "" {
			objID, err := bson.ObjectIDFromHex(userID)
			if err == nil {
				database, err := db.GetDB()
				if err == nil {
					var user User
					err = database.Collection("auth").FindOne(context.Background(), bson.M{"_id": objID}).Decode(&user)
					if err == nil {
						ctx := context.WithValue(r.Context(), userContextKey, &user)
						r = r.WithContext(ctx)
					}
				}
			}
		}
		next.ServeHTTP(w, r)
	})
}

// GoogleAuth handles POST /auth/google — verifies a Google ID token, upserts the user, and starts a session.
func (a *App) GoogleAuth(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Token string `json:"token"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	payload, err := idtoken.Validate(context.Background(), body.Token, a.Config.GoogleClientID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	name, _ := payload.Claims["name"].(string)
	email, _ := payload.Claims["email"].(string)
	picture, _ := payload.Claims["picture"].(string)

	database, err := db.GetDB()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	opts := options.FindOneAndUpdate().
		SetUpsert(true).
		SetReturnDocument(options.After)

	var user bson.M
	err = database.Collection("auth").FindOneAndUpdate(
		context.Background(),
		bson.M{"email": email},
		bson.M{
			"$set":         bson.M{"email": email, "picture": picture},
			"$setOnInsert": bson.M{"name": name},
		},
		opts,
	).Decode(&user)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	objID, ok := user["_id"].(bson.ObjectID)
	if !ok {
		http.Error(w, "invalid user id", http.StatusInternalServerError)
		return
	}

	session, _ := a.Store.Get(r, sessionName)
	session.Values["userId"] = objID.Hex()
	if err := session.Save(r, w); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(user)
}

// Logout handles POST /auth/logout — clears the session cookie.
func (a *App) Logout(w http.ResponseWriter, r *http.Request) {
	session, _ := a.Store.Get(r, sessionName)
	session.Values = map[interface{}]interface{}{}
	session.Options.MaxAge = -1
	session.Save(r, w)
	w.WriteHeader(http.StatusOK)
}

// GetMe handles GET /me — returns the currently authenticated user.
func (a *App) GetMe(w http.ResponseWriter, r *http.Request) {
	user, _ := r.Context().Value(userContextKey).(*User)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

// GenerateMCPKey handles POST /me/mcp-key — generates a new random MCP API key for the user.
func (a *App) GenerateMCPKey(w http.ResponseWriter, r *http.Request) {
	user, ok := r.Context().Value(userContextKey).(*User)
	if !ok || user == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	key := hex.EncodeToString(b)

	database, err := db.GetDB()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	_, err = database.Collection("auth").UpdateOne(
		context.Background(),
		bson.M{"email": user.Email},
		bson.M{"$set": bson.M{"mcpKey": key}},
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"mcpKey": key})
}

// UpdateMe handles PUT /me — updates the display name of the logged-in user.
func (a *App) UpdateMe(w http.ResponseWriter, r *http.Request) {
	user, ok := r.Context().Value(userContextKey).(*User)
	if !ok || user == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var body struct {
		Name  string `json:"name"`
		Theme string `json:"theme"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	database, err := db.GetDB()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	update := bson.M{"name": body.Name}
	if body.Theme != "" {
		update["theme"] = body.Theme
	}

	_, err = database.Collection("auth").UpdateOne(
		context.Background(),
		bson.M{"email": user.Email},
		bson.M{"$set": update},
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"name": body.Name, "theme": body.Theme})
}

// Package mcpserver exposes meal-planner data via the Model Context Protocol
// (Streamable HTTP transport). It is mounted at /mcp in main.go and requires
// an API key in the Authorization: Bearer header.
package mcpserver

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/mark3labs/mcp-go/mcp"
	"github.com/mark3labs/mcp-go/server"
	"go.mongodb.org/mongo-driver/v2/bson"
	
	"meal-planner-api/db"
	"meal-planner-api/handlers"
)

// NewHandler builds the MCP server and returns it as an http.Handler.
func NewHandler() http.Handler {
	s := server.NewMCPServer(
		"Meal Planner",
		"1.0.0",
		server.WithToolCapabilities(true),
	)

	registerIngredientTools(s)
	registerDishTools(s)

	return server.NewStreamableHTTPServer(s)
}

// ── helpers ───────────────────────────────────────────────────────────────

func jsonResult(v any) (*mcp.CallToolResult, error) {
	b, err := json.Marshal(v)
	if err != nil {
		return mcp.NewToolResultErrorf("failed to serialize: %v", err), nil
	}
	return mcp.NewToolResultText(string(b)), nil
}

func getStrings(args map[string]any, key string) []string {
	if v, ok := args[key]; ok {
		if arr, ok := v.([]any); ok {
			result := make([]string, 0, len(arr))
			for _, item := range arr {
				if s, ok := item.(string); ok {
					result = append(result, s)
				}
			}
			return result
		}
	}
	return nil
}

// ── ingredient tools ──────────────────────────────────────────────────────

func registerIngredientTools(s *server.MCPServer) {
	s.AddTool(
		mcp.NewTool("list_ingredients",
			mcp.WithDescription("Return all ingredients. Call this before creating dishes to find existing ingredient IDs."),
		),
		handleListIngredients,
	)

	s.AddTool(
		mcp.NewTool("create_ingredient",
			mcp.WithDescription("Create a new ingredient. Returns the created ingredient including its id."),
			mcp.WithString("description",
				mcp.Description("Ingredient name, e.g. 'Butter', 'Plain flour', 'Eggs'"),
				mcp.Required(),
			),
			mcp.WithArray("variations",
				mcp.Description("Optional list of named variations, e.g. [\"Salted\", \"Unsalted\"]"),
				mcp.WithStringItems(),
			),
			mcp.WithString("storeArea",
				mcp.Description("Grocery store area. One of: Produce, Dairy, Meat & Seafood, Bakery, Pantry, Frozen, Beverages, Condiments, Spices, Deli, Other"),
			),
		),
		handleCreateIngredient,
	)

	s.AddTool(
		mcp.NewTool("update_ingredient",
			mcp.WithDescription("Update an existing ingredient's description, variations, or store area."),
			mcp.WithString("id",
				mcp.Description("The ingredient id (from list_ingredients)"),
				mcp.Required(),
			),
			mcp.WithString("description",
				mcp.Description("New description"),
				mcp.Required(),
			),
			mcp.WithArray("variations",
				mcp.Description("Full replacement list of variations (empty array to clear)"),
				mcp.WithStringItems(),
			),
			mcp.WithString("storeArea",
				mcp.Description("Grocery store area. One of: Produce, Dairy, Meat & Seafood, Bakery, Pantry, Frozen, Beverages, Condiments, Spices, Deli, Other"),
			),
		),
		handleUpdateIngredient,
	)
}

func handleListIngredients(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	database, err := db.GetDB()
	if err != nil {
		return mcp.NewToolResultErrorFromErr("db error", err), nil
	}

	cursor, err := database.Collection("ingredients").Find(ctx, bson.M{})
	if err != nil {
		return mcp.NewToolResultErrorFromErr("query error", err), nil
	}
	defer cursor.Close(ctx)

	var ingredients []handlers.Ingredient
	if err = cursor.All(ctx, &ingredients); err != nil {
		return mcp.NewToolResultErrorFromErr("decode error", err), nil
	}
	if ingredients == nil {
		ingredients = []handlers.Ingredient{}
	}
	return jsonResult(ingredients)
}

func handleCreateIngredient(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	description, err := req.RequireString("description")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	args := req.GetArguments()
	variations := getStrings(args, "variations")
	if variations == nil {
		variations = []string{}
	}
	storeArea := handlers.StoreArea(req.GetString("storeArea", ""))

	ingredient := handlers.Ingredient{
		ID:          bson.NewObjectID(),
		Description: description,
		Variations:  variations,
		StoreArea:   storeArea,
	}

	database, err := db.GetDB()
	if err != nil {
		return mcp.NewToolResultErrorFromErr("db error", err), nil
	}
	if _, err = database.Collection("ingredients").InsertOne(ctx, ingredient); err != nil {
		return mcp.NewToolResultErrorFromErr("insert error", err), nil
	}
	return jsonResult(ingredient)
}

func handleUpdateIngredient(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	id, err := req.RequireString("id")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	objID, err := bson.ObjectIDFromHex(id)
	if err != nil {
		return mcp.NewToolResultError("invalid id"), nil
	}
	description, err := req.RequireString("description")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	args := req.GetArguments()
	variations := getStrings(args, "variations")
	if variations == nil {
		variations = []string{}
	}
	storeArea := req.GetString("storeArea", "")

	database, err := db.GetDB()
	if err != nil {
		return mcp.NewToolResultErrorFromErr("db error", err), nil
	}
	_, err = database.Collection("ingredients").UpdateOne(
		ctx,
		bson.M{"_id": objID},
		bson.M{"$set": bson.M{
			"description": description,
			"variations":  variations,
			"storeArea":   storeArea,
		}},
	)
	if err != nil {
		return mcp.NewToolResultErrorFromErr("update error", err), nil
	}
	return mcp.NewToolResultText("updated"), nil
}

// ── dish tools ────────────────────────────────────────────────────────────

func registerDishTools(s *server.MCPServer) {
	s.AddTool(
		mcp.NewTool("list_dishes",
			mcp.WithDescription("Return all dishes with their ingredient lists, instructions, and serving counts."),
		),
		handleListDishes,
	)

	s.AddTool(
		mcp.NewTool("create_dish",
			mcp.WithDescription("Create a new dish (recipe). Returns the created dish including its id. After creating, use add_dish_ingredient to attach ingredients."),
			mcp.WithString("name",
				mcp.Description("Dish name, e.g. 'Spaghetti Bolognese'"),
				mcp.Required(),
			),
			mcp.WithNumber("serves",
				mcp.Description("Number of people the recipe serves as written. Use 0 if unknown."),
				mcp.Min(0),
			),
			mcp.WithString("instructions",
				mcp.Description("Free-text cooking instructions"),
			),
			mcp.WithString("source",
				mcp.Description("Optional URL linking to the original recipe"),
			),
		),
		handleCreateDish,
	)

	s.AddTool(
		mcp.NewTool("update_dish",
			mcp.WithDescription("Update a dish's name, serving count, instructions, or source URL."),
			mcp.WithString("id",
				mcp.Description("The dish id (from list_dishes)"),
				mcp.Required(),
			),
			mcp.WithString("name",
				mcp.Description("Dish name"),
				mcp.Required(),
			),
			mcp.WithNumber("serves", mcp.Description("Serving count"), mcp.Min(0)),
			mcp.WithString("instructions", mcp.Description("Cooking instructions")),
			mcp.WithString("source", mcp.Description("Source URL")),
		),
		handleUpdateDish,
	)

	s.AddTool(
		mcp.NewTool("add_dish_ingredient",
			mcp.WithDescription("Add an ingredient to a dish. Call list_ingredients first to obtain the ingredientId. Measures: tsp, tbsp, fl oz, cup, pt, qt, gal, ml, l, oz, lb, g, kg, count."),
			mcp.WithString("dishId",
				mcp.Description("The dish id"),
				mcp.Required(),
			),
			mcp.WithString("ingredientId",
				mcp.Description("The ingredient id from list_ingredients"),
				mcp.Required(),
			),
			mcp.WithString("variation",
				mcp.Description("Specific variation to use, e.g. 'Salted'. Leave empty for no variation."),
			),
			mcp.WithNumber("amount",
				mcp.Description("Numeric quantity, e.g. 2.5"),
				mcp.Required(),
				mcp.Min(0),
			),
			mcp.WithString("measure",
				mcp.Description("Unit of measure: tsp | tbsp | fl oz | cup | pt | qt | gal | ml | l | oz | lb | g | kg | count"),
				mcp.Required(),
				mcp.Enum("tsp", "tbsp", "fl oz", "cup", "pt", "qt", "gal", "ml", "l", "oz", "lb", "g", "kg", "count"),
			),
		),
		handleAddDishIngredient,
	)

	s.AddTool(
		mcp.NewTool("remove_dish_ingredient",
			mcp.WithDescription("Remove an ingredient entry from a dish."),
			mcp.WithString("dishId",
				mcp.Description("The dish id"),
				mcp.Required(),
			),
			mcp.WithString("entryId",
				mcp.Description("The ingredient entry id (from the ingredients array in list_dishes)"),
				mcp.Required(),
			),
		),
		handleRemoveDishIngredient,
	)
}

func handleListDishes(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	database, err := db.GetDB()
	if err != nil {
		return mcp.NewToolResultErrorFromErr("db error", err), nil
	}

	cursor, err := database.Collection("dishes").Find(ctx, bson.M{})
	if err != nil {
		return mcp.NewToolResultErrorFromErr("query error", err), nil
	}
	defer cursor.Close(ctx)

	var dishes []handlers.Dish
	if err = cursor.All(ctx, &dishes); err != nil {
		return mcp.NewToolResultErrorFromErr("decode error", err), nil
	}
	if dishes == nil {
		dishes = []handlers.Dish{}
	}
	return jsonResult(dishes)
}

func handleCreateDish(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	name, err := req.RequireString("name")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	serves := int(req.GetFloat("serves", 0))

	dish := handlers.Dish{
		ID:           bson.NewObjectID(),
		Name:         name,
		Serves:       serves,
		Instructions: req.GetString("instructions", ""),
		Source:       req.GetString("source", ""),
		Ingredients:  []handlers.DishIngredient{},
	}

	database, err := db.GetDB()
	if err != nil {
		return mcp.NewToolResultErrorFromErr("db error", err), nil
	}
	if _, err = database.Collection("dishes").InsertOne(ctx, dish); err != nil {
		return mcp.NewToolResultErrorFromErr("insert error", err), nil
	}
	return jsonResult(dish)
}

func handleUpdateDish(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	id, err := req.RequireString("id")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	objID, err := bson.ObjectIDFromHex(id)
	if err != nil {
		return mcp.NewToolResultError("invalid id"), nil
	}
	name, err := req.RequireString("name")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	database, err := db.GetDB()
	if err != nil {
		return mcp.NewToolResultErrorFromErr("db error", err), nil
	}
	_, err = database.Collection("dishes").UpdateOne(
		ctx,
		bson.M{"_id": objID},
		bson.M{"$set": bson.M{
			"name":         name,
			"serves":       int(req.GetFloat("serves", 0)),
			"instructions": req.GetString("instructions", ""),
			"source":       req.GetString("source", ""),
		}},
	)
	if err != nil {
		return mcp.NewToolResultErrorFromErr("update error", err), nil
	}
	return mcp.NewToolResultText("updated"), nil
}

func handleAddDishIngredient(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	dishID, err := req.RequireString("dishId")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	dishObjID, err := bson.ObjectIDFromHex(dishID)
	if err != nil {
		return mcp.NewToolResultError("invalid dishId"), nil
	}

	ingredientID, err := req.RequireString("ingredientId")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	ingObjID, err := bson.ObjectIDFromHex(ingredientID)
	if err != nil {
		return mcp.NewToolResultError("invalid ingredientId"), nil
	}

	amount := req.GetFloat("amount", 0)
	if amount <= 0 {
		return mcp.NewToolResultError("amount must be positive"), nil
	}
	measure, err := req.RequireString("measure")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}

	entry := handlers.DishIngredient{
		ID:           bson.NewObjectID(),
		IngredientID: ingObjID,
		Variation:    req.GetString("variation", ""),
		Amount:       amount,
		Measure:      handlers.Measure(measure),
	}

	database, err := db.GetDB()
	if err != nil {
		return mcp.NewToolResultErrorFromErr("db error", err), nil
	}
	_, err = database.Collection("dishes").UpdateOne(
		ctx,
		bson.M{"_id": dishObjID},
		bson.M{"$push": bson.M{"ingredients": entry}},
	)
	if err != nil {
		return mcp.NewToolResultErrorFromErr("update error", err), nil
	}
	return jsonResult(entry)
}

func handleRemoveDishIngredient(ctx context.Context, req mcp.CallToolRequest) (*mcp.CallToolResult, error) {
	dishID, err := req.RequireString("dishId")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	dishObjID, err := bson.ObjectIDFromHex(dishID)
	if err != nil {
		return mcp.NewToolResultError("invalid dishId"), nil
	}

	entryID, err := req.RequireString("entryId")
	if err != nil {
		return mcp.NewToolResultError(err.Error()), nil
	}
	entryObjID, err := bson.ObjectIDFromHex(entryID)
	if err != nil {
		return mcp.NewToolResultError("invalid entryId"), nil
	}

	database, err := db.GetDB()
	if err != nil {
		return mcp.NewToolResultErrorFromErr("db error", err), nil
	}
	_, err = database.Collection("dishes").UpdateOne(
		ctx,
		bson.M{"_id": dishObjID},
		bson.M{"$pull": bson.M{"ingredients": bson.M{"_id": entryObjID}}},
	)
	if err != nil {
		return mcp.NewToolResultErrorFromErr("update error", err), nil
	}
	return mcp.NewToolResultText("removed"), nil
}

# Meal Planner

A household meal planning application. It helps a group of people living together plan meals, manage recipes, and generate grocery lists.

---

## Domain model

### Ingredient
The atomic building block. An ingredient has:
- A **description** (e.g. "Butter")
- **Variations** (e.g. "Salted", "Unsalted")
- A **grocery store area** (e.g. "Dairy", "Produce", "Pantry") — used to organise the grocery list

### Dish
A recipe. A dish has:
- A **name**
- A **set of ingredients** with amounts (numeric value + unit of measure)
- A **recipe** (free-text cooking instructions)
- An optional **source URL** linking to the original recipe
- A **serving count** (number of people the dish serves as written)

Units of measure cover imperial volume (tsp, tbsp, fl oz, cup, pt, qt, gal), metric volume (ml, l), imperial weight (oz, lb), metric weight (g, kg), and discrete count (e.g. 3 eggs).

### Meal
A reusable set of dishes served together — think of it as a named combination (e.g. "Sunday roast", "Taco night"). A meal has:
- A **name**
- A **list of dishes**

A meal carries no scheduling information on its own. Scheduling happens when a meal is placed on a menu.

### Menu
A menu covers a **date range** and is the top-level planning unit. It is displayed as a **calendar view**. A menu contains **menu entries**, each of which schedules a meal on a specific day and records:
- The **meal** being served
- The **date**
- The **headcount** (number of people eating that day)
- The **cook** (the household member responsible)

Dish quantities are scaled automatically based on each entry's headcount vs. each dish's serving count.

### Grocery list
Derived from a menu. All ingredients across all dishes across all meals are aggregated, quantities scaled to headcount, and grouped by grocery store area to make shopping efficient.

---

## Implementation status

| Feature | API | UI |
|---|---|---|
| Ingredients — CRUD | ✅ | ✅ |
| Dishes — CRUD | ✅ | ✅ |
| Dish ingredients (amounts + measures) | ✅ | ✅ |
| Dish recipe + source URL | ✅ | ✅ |
| Dish serving count | ✅ | ✅ |
| Ingredient metadata (variations, store area) | ✅ | ✅ |
| Meals — CRUD | ✅ | ✅ |
| Menus — CRUD | ✅ | ✅ |
| Menu entries (date, headcount, cook) | ✅ | ✅ |
| Menu calendar view | ✅ | ✅ |
| Grocery list generation | ✅ | ✅ |
| Grocery list printing | ⬜ | ✅ |
| MCP server | ✅ | ⬜ |

---

## Tech stack

| Layer | Technology |
|---|---|
| API | Go + gorilla/mux + gorilla/sessions |
| Database | MongoDB 7 |
| Client | React 18 + TypeScript + Vite |
| UI components | MUI (Material UI) |
| Auth | Google OAuth (ID token → server session) |

---

## Dev setup

**Prerequisites:** Go 1.21+, Node 18+, Docker

**Environment:** copy `.envrc.template` to `.envrc` and fill in values. If you use [direnv](https://direnv.net/) it will be sourced automatically; otherwise `source .envrc` before running make targets.

```bash
cp .envrc.template .envrc
# edit .envrc with your values
```

**Run everything locally with Docker:**
```bash
make docker-build   # build API + client images
make docker-up      # start mongo, api, client (detached)
make docker-down    # stop all containers
```

**Run the API locally (requires MongoDB running):**
```bash
make docker-mongo-up   # start MongoDB only
make run               # run Go API locally (hot-reload with air, or just go run)
make client-start      # start Vite dev server
```

**Other useful commands:**
```bash
make test      # run all tests (API + client)
make lint      # go vet
make tidy      # go mod tidy
make help      # full command list
```

**Access the running app:** [http://localhost:5173](http://localhost:5173)

**MongoDB shell:**
```bash
docker exec -it meal-planner-mongo-1 mongosh mealplanner -u service -p <MONGO_SERVICE_PASSWORD>
> show collections
```

---

## MCP server

The API exposes a [Model Context Protocol](https://modelcontextprotocol.io/) server at `/mcp` using Streamable HTTP transport. Its primary use case is recipe ingestion: an AI assistant can read a recipe, create any missing ingredients, create the dish, and attach ingredients with amounts — all via tool calls.

**Authentication:** every request must include `Authorization: Bearer <key>`. Each user generates their own key from the **Profile** page in the app. Keys are stored per-user in the database — no shared secret or environment variable required.

### Available tools

| Tool | Description |
|---|---|
| `list_ingredients` | Return all ingredients (call before creating a dish to find existing IDs) |
| `create_ingredient` | Create an ingredient (description, optional variations, optional store area) |
| `update_ingredient` | Update an ingredient's description, variations, or store area |
| `list_dishes` | Return all dishes with ingredient lists, instructions, and serving counts |
| `create_dish` | Create a dish (name, serves, instructions, source URL) |
| `update_dish` | Update a dish's name, serving count, instructions, or source URL |
| `add_dish_ingredient` | Add an ingredient entry to a dish (ingredientId, amount, measure, optional variation) |
| `remove_dish_ingredient` | Remove an ingredient entry from a dish |

### Connecting Claude Code

1. Go to **Profile** in the app and click **Generate MCP key** — your personal key is shown once.
2. The Profile page displays the ready-to-run command. Copy and paste it, or run it yourself (replace `<key>` with your key):

```bash
# Against a remote deployment
claude mcp add --transport http --scope user meal-planner https://<your-api-host>/mcp \
  --header "Authorization: Bearer <key>"

# Against the local dev API
claude mcp add --transport http --scope user meal-planner http://localhost:8000/mcp \
  --header "Authorization: Bearer <key>"
```

Each user has their own independent key. Clicking **Regenerate key** on the Profile page immediately invalidates the old key.

Verify the connection:

```bash
claude mcp list
claude mcp get meal-planner
```

### Adding recipes and ingredients

Once the MCP is running you can either print recipes to local PDF (for those behind authentication) or just provide the public URL
to your agent of choice (I'm using claude).

Example output:

```sh
● Done! Bourbon Chicken is fully set up with all 12 ingredients:
                                                                                                                                                                              
  ┌────────────────┬─────────┬───────────────────┐
  │   Ingredient   │ Amount  │       Notes       │                                                                                                                            
  ├────────────────┼─────────┼───────────────────┤
  │ Soy Sauce      │ ½ cup   │                   │                                                                                                                            
  ├────────────────┼─────────┼───────────────────┤
  │ Brown Sugar    │ ½ cup   │ Light variation   │
  ├────────────────┼─────────┼───────────────────┤
  │ Water          │ ¼ cup   │                   │
  ├────────────────┼─────────┼───────────────────┤
  │ Bourbon        │ 2 tbsp  │                   │
  ├────────────────┼─────────┼───────────────────┤
  │ Sesame Oil     │ 1 tsp   │ Toasted           │
  ├────────────────┼─────────┼───────────────────┤
  │ Pepper         │ ½ tsp   │ Black             │
  ├────────────────┼─────────┼───────────────────┤
  │ Chicken Thighs │ 2 lb    │ Boneless Skinless │
  ├────────────────┼─────────┼───────────────────┤
  │ Cornstarch     │ 2 tbsp  │                   │
  ├────────────────┼─────────┼───────────────────┤
  │ Vegetable Oil  │ 2 tbsp  │                   │
  ├────────────────┼─────────┼───────────────────┤
  │ Garlic         │ 2 count │                   │
  ├────────────────┼─────────┼───────────────────┤
  │ Ginger         │ 1 tsp   │ Fresh             │
  ├────────────────┼─────────┼───────────────────┤
  │ Cider Vinegar  │ 2 tsp   │                   │
  └────────────────┴─────────┴───────────────────┘

  The whole process — PDF → 11 new ingredients → dish → 12 ingredient links — was fully automated in 3 parallel batches. Want to try another recipe?

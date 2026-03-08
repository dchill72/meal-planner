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
A set of dishes served together. A meal has:
- A **list of dishes**
- A **date**
- A **headcount** (number of people eating)
- A **cook** (the household member responsible)

Dish quantities are scaled automatically based on the meal headcount vs. each dish's serving count.

### Menu
A collection of meals over a period of time. A menu is the top-level planning unit.

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
| Dish serving count | ⬜ | ⬜ |
| Ingredient metadata (variations, store area) | ⬜ | ⬜ |
| Meals — CRUD | ⬜ | ⬜ |
| Menus — CRUD | ⬜ | ⬜ |
| Grocery list generation | ⬜ | ⬜ |

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

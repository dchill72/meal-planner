import { useState, useEffect } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Divider,
  IconButton,
  Link,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Dish,
  DishIngredient,
  Measure,
  MEASURES,
  addDishIngredient,
  createDish,
  deleteDish,
  getDishes,
  removeDishIngredient,
  updateDish,
} from '../api/dishes';
import { Ingredient, getIngredients } from '../api/ingredients';

interface AddIngredientForm {
  ingredientId: string;
  amount: string;
  measure: Measure;
}

interface EditDishForm {
  name: string;
  instructions: string;
  source: string;
}

const DEFAULT_ADD_FORM: AddIngredientForm = { ingredientId: '', amount: '', measure: 'count' };

export const Dishes = () => {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [newDishName, setNewDishName] = useState('');
  const [addForms, setAddForms] = useState<Record<string, AddIngredientForm>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditDishForm>({ name: '', instructions: '', source: '' });

  useEffect(() => {
    getDishes().then(setDishes).catch(console.error);
    getIngredients().then(setIngredients).catch(console.error);
  }, []);

  const ingredientName = (id: string) =>
    ingredients.find((i) => i.id === id)?.description ?? id;

  const addFormFor = (dishId: string): AddIngredientForm => addForms[dishId] ?? DEFAULT_ADD_FORM;

  const setAddForm = (dishId: string, patch: Partial<AddIngredientForm>) =>
    setAddForms((prev) => ({ ...prev, [dishId]: { ...addFormFor(dishId), ...patch } }));

  const handleCreateDish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDishName.trim()) return;
    const dish = await createDish(newDishName.trim());
    setDishes((prev) => [...prev, dish]);
    setNewDishName('');
  };

  const handleDeleteDish = async (id: string) => {
    await deleteDish(id);
    setDishes((prev) => prev.filter((d) => d.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const startEdit = (dish: Dish) => {
    setEditingId(dish.id);
    setEditForm({ name: dish.name, instructions: dish.instructions, source: dish.source });
  };

  const handleSaveEdit = async (id: string) => {
    await updateDish(id, editForm.name, editForm.instructions, editForm.source);
    setDishes((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, name: editForm.name, instructions: editForm.instructions, source: editForm.source } : d,
      ),
    );
    setEditingId(null);
  };

  const handleAddIngredient = async (dishId: string, e: React.FormEvent) => {
    e.preventDefault();
    const form = addFormFor(dishId);
    const amount = parseFloat(form.amount);
    if (!form.ingredientId || isNaN(amount) || amount <= 0) return;

    const entry = await addDishIngredient(dishId, form.ingredientId, amount, form.measure);
    setDishes((prev) =>
      prev.map((d) =>
        d.id === dishId ? { ...d, ingredients: [...d.ingredients, entry] } : d,
      ),
    );
    setAddForm(dishId, DEFAULT_ADD_FORM);
  };

  const handleRemoveIngredient = async (dishId: string, entryId: string) => {
    await removeDishIngredient(dishId, entryId);
    setDishes((prev) =>
      prev.map((d) =>
        d.id === dishId
          ? { ...d, ingredients: d.ingredients.filter((i) => i.id !== entryId) }
          : d,
      ),
    );
  };

  const formatEntry = (entry: DishIngredient) =>
    `${entry.amount} ${entry.measure === 'count' ? '×' : entry.measure}  ${ingredientName(entry.ingredientId)}`;

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Dishes
      </Typography>

      {/* Create dish */}
      <Box component="form" onSubmit={handleCreateDish} sx={{ display: 'flex', gap: 1, mb: 3 }}>
        <TextField
          size="small"
          label="New dish name"
          value={newDishName}
          onChange={(e) => setNewDishName(e.target.value)}
        />
        <Button type="submit" variant="contained" disabled={!newDishName.trim()}>
          Add
        </Button>
      </Box>

      {/* Dish list */}
      {dishes.map((dish) => {
        const form = addFormFor(dish.id);
        const amountNum = parseFloat(form.amount);
        const canAddIngredient = form.ingredientId && !isNaN(amountNum) && amountNum > 0;
        const isEditing = editingId === dish.id;

        return (
          <Accordion key={dish.id} disableGutters>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography sx={{ flexGrow: 1 }}>{dish.name}</Typography>
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); startEdit(dish); }}>
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDeleteDish(dish.id); }}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </AccordionSummary>

            <AccordionDetails>
              {isEditing ? (
                /* ── Edit mode ── */
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
                  <TextField
                    size="small"
                    label="Name"
                    value={editForm.name}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  />
                  <TextField
                    size="small"
                    label="Source URL"
                    placeholder="https://..."
                    value={editForm.source}
                    onChange={(e) => setEditForm((f) => ({ ...f, source: e.target.value }))}
                  />
                  <TextField
                    label="Instructions"
                    multiline
                    minRows={4}
                    value={editForm.instructions}
                    onChange={(e) => setEditForm((f) => ({ ...f, instructions: e.target.value }))}
                  />
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      size="small"
                      disabled={!editForm.name.trim()}
                      onClick={() => handleSaveEdit(dish.id)}
                    >
                      Save
                    </Button>
                    <Button size="small" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                  </Box>
                </Box>
              ) : (
                /* ── View mode ── */
                <>
                  {dish.source && (
                    <Link href={dish.source} target="_blank" rel="noopener noreferrer" display="block" mb={1}>
                      {dish.source}
                    </Link>
                  )}
                  {dish.instructions && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ whiteSpace: 'pre-wrap', mb: 2 }}
                    >
                      {dish.instructions}
                    </Typography>
                  )}
                </>
              )}

              <Divider sx={{ my: 1 }} />

              {/* Ingredient list */}
              {dish.ingredients.length > 0 && (
                <List dense disablePadding sx={{ mb: 1 }}>
                  {dish.ingredients.map((entry) => (
                    <ListItem
                      key={entry.id}
                      disableGutters
                      secondaryAction={
                        <IconButton
                          edge="end"
                          size="small"
                          onClick={() => handleRemoveIngredient(dish.id, entry.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      }
                    >
                      <ListItemText primary={formatEntry(entry)} />
                    </ListItem>
                  ))}
                </List>
              )}

              {/* Add ingredient form */}
              <Box
                component="form"
                onSubmit={(e) => handleAddIngredient(dish.id, e)}
                sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}
              >
                <Select
                  size="small"
                  displayEmpty
                  value={form.ingredientId}
                  onChange={(e) => setAddForm(dish.id, { ingredientId: e.target.value })}
                  sx={{ minWidth: 160 }}
                  renderValue={(v) =>
                    v ? ingredientName(v) : <Typography color="text.secondary">Ingredient</Typography>
                  }
                >
                  {ingredients.map((ing) => (
                    <MenuItem key={ing.id} value={ing.id}>
                      {ing.description}
                    </MenuItem>
                  ))}
                </Select>

                <TextField
                  size="small"
                  label="Amount"
                  type="number"
                  value={form.amount}
                  onChange={(e) => setAddForm(dish.id, { amount: e.target.value })}
                  inputProps={{ min: 0, step: 'any' }}
                  sx={{ width: 100 }}
                />

                <Select
                  size="small"
                  value={form.measure}
                  onChange={(e) => setAddForm(dish.id, { measure: e.target.value as Measure })}
                  sx={{ minWidth: 160 }}
                >
                  {MEASURES.map((m) => (
                    <MenuItem key={m.value} value={m.value}>
                      {m.label}
                    </MenuItem>
                  ))}
                </Select>

                <Button type="submit" variant="outlined" size="small" disabled={!canAddIngredient}>
                  Add ingredient
                </Button>
              </Box>
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
};

import { useState, useEffect } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  IconButton,
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
import { Meal, addMealDish, createMeal, deleteMeal, getMeals, removeMealDish, updateMeal } from '../api/meals';
import { Dish, getDishes } from '../api/dishes';

export const Meals = () => {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [newMealName, setNewMealName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [addDishSelections, setAddDishSelections] = useState<Record<string, string>>({});

  useEffect(() => {
    getMeals().then(setMeals).catch(console.error);
    getDishes().then(setDishes).catch(console.error);
  }, []);

  const dishById = (id: string) => dishes.find((d) => d.id === id);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMealName.trim()) return;
    const meal = await createMeal(newMealName.trim());
    setMeals((prev) => [...prev, meal]);
    setNewMealName('');
  };

  const handleDelete = async (id: string) => {
    await deleteMeal(id);
    setMeals((prev) => prev.filter((m) => m.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const startEdit = (meal: Meal) => {
    setEditingId(meal.id);
    setEditName(meal.name);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) return;
    await updateMeal(id, editName.trim());
    setMeals((prev) => prev.map((m) => (m.id === id ? { ...m, name: editName.trim() } : m)));
    setEditingId(null);
  };

  const handleAddDish = async (mealId: string) => {
    const dishId = addDishSelections[mealId];
    if (!dishId) return;
    await addMealDish(mealId, dishId);
    setMeals((prev) =>
      prev.map((m) =>
        m.id === mealId && !m.dishIds.includes(dishId)
          ? { ...m, dishIds: [...m.dishIds, dishId] }
          : m,
      ),
    );
    setAddDishSelections((prev) => ({ ...prev, [mealId]: '' }));
  };

  const handleRemoveDish = async (mealId: string, dishId: string) => {
    await removeMealDish(mealId, dishId);
    setMeals((prev) =>
      prev.map((m) => (m.id === mealId ? { ...m, dishIds: m.dishIds.filter((id) => id !== dishId) } : m)),
    );
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Meals
      </Typography>

      {/* Create meal */}
      <Box component="form" onSubmit={handleCreate} sx={{ display: 'flex', gap: 1, mb: 3 }}>
        <TextField
          size="small"
          label="New meal name"
          value={newMealName}
          onChange={(e) => setNewMealName(e.target.value)}
        />
        <Button type="submit" variant="contained" disabled={!newMealName.trim()}>
          Add
        </Button>
      </Box>

      {/* Meal list */}
      {meals.map((meal) => {
        const isEditing = editingId === meal.id;
        const selectedDishId = addDishSelections[meal.id] ?? '';
        const availableDishes = dishes.filter((d) => !(meal.dishIds ?? []).includes(d.id));

        return (
          <Accordion key={meal.id} disableGutters>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography sx={{ flexGrow: 1 }}>{meal.name}</Typography>
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); startEdit(meal); }}>
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDelete(meal.id); }}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </AccordionSummary>

            <AccordionDetails>
              {isEditing && (
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <TextField
                    size="small"
                    label="Name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                  <Button
                    variant="contained"
                    size="small"
                    disabled={!editName.trim()}
                    onClick={() => handleSaveEdit(meal.id)}
                  >
                    Save
                  </Button>
                  <Button size="small" onClick={() => setEditingId(null)}>
                    Cancel
                  </Button>
                </Box>
              )}

              {/* Dish list */}
              {(meal.dishIds ?? []).length > 0 && (
                <List dense disablePadding sx={{ mb: 1 }}>
                  {(meal.dishIds ?? []).map((dishId) => (
                    <ListItem
                      key={dishId}
                      disableGutters
                      secondaryAction={
                        <IconButton edge="end" size="small" onClick={() => handleRemoveDish(meal.id, dishId)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      }
                    >
                      <ListItemText primary={dishById(dishId)?.name ?? dishId} />
                    </ListItem>
                  ))}
                </List>
              )}

              {/* Add dish */}
              {availableDishes.length > 0 && (
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Select
                    size="small"
                    displayEmpty
                    value={selectedDishId}
                    onChange={(e) => setAddDishSelections((prev) => ({ ...prev, [meal.id]: e.target.value }))}
                    sx={{ minWidth: 200 }}
                    renderValue={(v) => {
                      const d = dishes.find((x) => x.id === v);
                      return d ? d.name : <Typography color="text.secondary">Add dish…</Typography>;
                    }}
                  >
                    {availableDishes.map((d) => (
                      <MenuItem key={d.id} value={d.id}>
                        {d.name}
                      </MenuItem>
                    ))}
                  </Select>
                  <Button
                    variant="outlined"
                    size="small"
                    disabled={!selectedDishId}
                    onClick={() => handleAddDish(meal.id)}
                  >
                    Add dish
                  </Button>
                </Box>
              )}
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
};

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  Ingredient,
  getIngredients,
  createIngredient,
  deleteIngredient,
} from '../api/ingredients';

export const Ingredients = () => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [description, setDescription] = useState('');

  useEffect(() => {
    getIngredients().then(setIngredients).catch(console.error);
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    const created = await createIngredient(description.trim());
    setIngredients((prev) => [...prev, created]);
    setDescription('');
  };

  const handleDelete = async (id: string) => {
    await deleteIngredient(id);
    setIngredients((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Ingredients
      </Typography>
      <Box component="form" onSubmit={handleAdd} sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField
          size="small"
          label="New ingredient"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Button type="submit" variant="contained" disabled={!description.trim()}>
          Add
        </Button>
      </Box>
      <List>
        {ingredients.map((ingredient) => (
          <ListItem
            key={ingredient.id}
            secondaryAction={
              <IconButton edge="end" onClick={() => handleDelete(ingredient.id)}>
                <DeleteIcon />
              </IconButton>
            }
          >
            <ListItemText primary={ingredient.description} />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

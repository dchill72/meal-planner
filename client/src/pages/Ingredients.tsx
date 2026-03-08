import { useState, useEffect } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Ingredient,
  StoreArea,
  STORE_AREAS,
  createIngredient,
  deleteIngredient,
  getIngredients,
  updateIngredient,
} from '../api/ingredients';

interface EditForm {
  description: string;
  storeArea: StoreArea | '';
  variations: string[];
  variationInput: string;
}

export const Ingredients = () => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [newDescription, setNewDescription] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    description: '',
    storeArea: '',
    variations: [],
    variationInput: '',
  });

  useEffect(() => {
    getIngredients().then(setIngredients).catch(console.error);
  }, []);

  const startEdit = (ing: Ingredient) => {
    setEditingId(ing.id);
    setEditForm({
      description: ing.description,
      storeArea: ing.storeArea,
      variations: [...(ing.variations ?? [])],
      variationInput: '',
    });
  };

  const handleAddVariation = () => {
    const v = editForm.variationInput.trim();
    if (!v || editForm.variations.includes(v)) return;
    setEditForm((f) => ({ ...f, variations: [...f.variations, v], variationInput: '' }));
  };

  const handleRemoveVariation = (v: string) => {
    setEditForm((f) => ({ ...f, variations: f.variations.filter((x) => x !== v) }));
  };

  const handleSave = async (id: string) => {
    await updateIngredient(id, editForm.description, editForm.variations, editForm.storeArea);
    setIngredients((prev) =>
      prev.map((ing) =>
        ing.id === id
          ? { ...ing, description: editForm.description, storeArea: editForm.storeArea, variations: editForm.variations }
          : ing,
      ),
    );
    setEditingId(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDescription.trim()) return;
    const created = await createIngredient(newDescription.trim());
    setIngredients((prev) => [...prev, created]);
    setNewDescription('');
  };

  const handleDelete = async (id: string) => {
    await deleteIngredient(id);
    setIngredients((prev) => prev.filter((i) => i.id !== id));
    if (editingId === id) setEditingId(null);
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Ingredients
      </Typography>

      {/* Create */}
      <Box component="form" onSubmit={handleCreate} sx={{ display: 'flex', gap: 1, mb: 3 }}>
        <TextField
          size="small"
          label="New ingredient"
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
        />
        <Button type="submit" variant="contained" disabled={!newDescription.trim()}>
          Add
        </Button>
      </Box>

      {/* List */}
      {ingredients.map((ing) => {
        const isEditing = editingId === ing.id;
        return (
          <Accordion key={ing.id} disableGutters>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography sx={{ flexGrow: 1 }}>{ing.description}</Typography>
              {ing.storeArea && (
                <Chip label={ing.storeArea} size="small" sx={{ mr: 1, alignSelf: 'center' }} />
              )}
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); startEdit(ing); }}>
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDelete(ing.id); }}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </AccordionSummary>

            <AccordionDetails>
              {isEditing ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    size="small"
                    label="Description"
                    value={editForm.description}
                    onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  />

                  <Select
                    size="small"
                    displayEmpty
                    value={editForm.storeArea}
                    onChange={(e) => setEditForm((f) => ({ ...f, storeArea: e.target.value as StoreArea | '' }))}
                    renderValue={(v) => v || <Typography color="text.secondary">Store area</Typography>}
                  >
                    <MenuItem value=""><em>None</em></MenuItem>
                    {STORE_AREAS.map((a) => (
                      <MenuItem key={a} value={a}>{a}</MenuItem>
                    ))}
                  </Select>

                  {/* Variations */}
                  <Box>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                      <TextField
                        size="small"
                        label="Add variation"
                        placeholder="e.g. Salted"
                        value={editForm.variationInput}
                        onChange={(e) => setEditForm((f) => ({ ...f, variationInput: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddVariation(); } }}
                      />
                      <Button variant="outlined" size="small" onClick={handleAddVariation}>
                        Add
                      </Button>
                    </Box>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {editForm.variations.map((v) => (
                        <Chip
                          key={v}
                          label={v}
                          size="small"
                          onDelete={() => handleRemoveVariation(v)}
                        />
                      ))}
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      size="small"
                      disabled={!editForm.description.trim()}
                      onClick={() => handleSave(ing.id)}
                    >
                      Save
                    </Button>
                    <Button size="small" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                  </Box>
                </Box>
              ) : (
                /* View mode */
                <Box>
                  {(ing.variations ?? []).length > 0 ? (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(ing.variations ?? []).map((v) => (
                        <Chip key={v} label={v} size="small" variant="outlined" />
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.disabled">
                      No variations
                    </Typography>
                  )}
                  {!ing.storeArea && (
                    <>
                      <Divider sx={{ my: 1 }} />
                      <Typography variant="body2" color="text.disabled">
                        No store area set
                      </Typography>
                    </>
                  )}
                </Box>
              )}
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
};

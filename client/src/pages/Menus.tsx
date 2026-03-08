import { useState, useEffect } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Divider,
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
import {
  Menu,
  MenuEntry,
  addMenuEntry,
  createMenu,
  deleteMenu,
  getMenus,
  removeMenuEntry,
  updateMenu,
  updateMenuEntry,
} from '../api/menus';
import { Meal, getMeals } from '../api/meals';

interface MenuEditForm {
  name: string;
  startDate: string;
  endDate: string;
}

interface EntryForm {
  mealId: string;
  date: string;
  headcount: string;
  cook: string;
}

const EMPTY_ENTRY_FORM: EntryForm = { mealId: '', date: '', headcount: '2', cook: '' };

const formatDate = (iso: string) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

export const Menus = () => {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);

  // Create menu form
  const [newForm, setNewForm] = useState<MenuEditForm>({ name: '', startDate: '', endDate: '' });

  // Edit menu
  const [editingMenuId, setEditingMenuId] = useState<string | null>(null);
  const [editMenuForm, setEditMenuForm] = useState<MenuEditForm>({ name: '', startDate: '', endDate: '' });

  // Add entry forms per menu
  const [addEntryForms, setAddEntryForms] = useState<Record<string, EntryForm>>({});

  // Edit entry
  const [editingEntryKey, setEditingEntryKey] = useState<string | null>(null); // `${menuId}:${entryId}`
  const [editEntryForm, setEditEntryForm] = useState<EntryForm>(EMPTY_ENTRY_FORM);

  useEffect(() => {
    getMenus().then(setMenus).catch(console.error);
    getMeals().then(setMeals).catch(console.error);
  }, []);

  const mealById = (id: string) => meals.find((m) => m.id === id);
  const addEntryFormFor = (menuId: string): EntryForm => addEntryForms[menuId] ?? EMPTY_ENTRY_FORM;
  const setAddEntryForm = (menuId: string, patch: Partial<EntryForm>) =>
    setAddEntryForms((prev) => ({ ...prev, [menuId]: { ...addEntryFormFor(menuId), ...patch } }));

  // --- Menu CRUD ---

  const handleCreateMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.name.trim()) return;
    const menu = await createMenu(newForm.name.trim(), newForm.startDate, newForm.endDate);
    setMenus((prev) => [...prev, menu]);
    setNewForm({ name: '', startDate: '', endDate: '' });
  };

  const handleDeleteMenu = async (id: string) => {
    await deleteMenu(id);
    setMenus((prev) => prev.filter((m) => m.id !== id));
    if (editingMenuId === id) setEditingMenuId(null);
  };

  const startEditMenu = (menu: Menu) => {
    setEditingMenuId(menu.id);
    setEditMenuForm({ name: menu.name, startDate: menu.startDate, endDate: menu.endDate });
  };

  const handleSaveMenu = async (id: string) => {
    if (!editMenuForm.name.trim()) return;
    await updateMenu(id, editMenuForm.name.trim(), editMenuForm.startDate, editMenuForm.endDate);
    setMenus((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...editMenuForm, name: editMenuForm.name.trim() } : m)),
    );
    setEditingMenuId(null);
  };

  // --- Entry CRUD ---

  const handleAddEntry = async (menuId: string, e: React.FormEvent) => {
    e.preventDefault();
    const form = addEntryFormFor(menuId);
    if (!form.mealId || !form.date) return;
    const headcount = parseInt(form.headcount) || 0;
    const entry = await addMenuEntry(menuId, form.mealId, form.date, headcount, form.cook);
    setMenus((prev) =>
      prev.map((m) => (m.id === menuId ? { ...m, entries: [...(m.entries ?? []), entry] } : m)),
    );
    setAddEntryForms((prev) => ({ ...prev, [menuId]: EMPTY_ENTRY_FORM }));
  };

  const handleDeleteEntry = async (menuId: string, entryId: string) => {
    await removeMenuEntry(menuId, entryId);
    setMenus((prev) =>
      prev.map((m) =>
        m.id === menuId ? { ...m, entries: (m.entries ?? []).filter((e) => e.id !== entryId) } : m,
      ),
    );
    if (editingEntryKey === `${menuId}:${entryId}`) setEditingEntryKey(null);
  };

  const startEditEntry = (menuId: string, entry: MenuEntry) => {
    setEditingEntryKey(`${menuId}:${entry.id}`);
    setEditEntryForm({
      mealId: entry.mealId,
      date: entry.date,
      headcount: String(entry.headcount),
      cook: entry.cook,
    });
  };

  const handleSaveEntry = async (menuId: string, entryId: string) => {
    if (!editEntryForm.mealId || !editEntryForm.date) return;
    const headcount = parseInt(editEntryForm.headcount) || 0;
    await updateMenuEntry(menuId, entryId, editEntryForm.mealId, editEntryForm.date, headcount, editEntryForm.cook);
    setMenus((prev) =>
      prev.map((m) =>
        m.id === menuId
          ? {
              ...m,
              entries: (m.entries ?? []).map((e) =>
                e.id === entryId
                  ? { ...e, mealId: editEntryForm.mealId, date: editEntryForm.date, headcount, cook: editEntryForm.cook }
                  : e,
              ),
            }
          : m,
      ),
    );
    setEditingEntryKey(null);
  };

  const formatEntry = (entry: MenuEntry) => {
    const meal = mealById(entry.mealId);
    const parts = [formatDate(entry.date), meal?.name ?? entry.mealId];
    if (entry.headcount) parts.push(`${entry.headcount} people`);
    if (entry.cook) parts.push(`cook: ${entry.cook}`);
    return parts.join(' — ');
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Menus
      </Typography>

      {/* Create menu */}
      <Box component="form" onSubmit={handleCreateMenu} sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small"
          label="Menu name"
          value={newForm.name}
          onChange={(e) => setNewForm((f) => ({ ...f, name: e.target.value }))}
        />
        <TextField
          size="small"
          label="Start date"
          type="date"
          value={newForm.startDate}
          onChange={(e) => setNewForm((f) => ({ ...f, startDate: e.target.value }))}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          size="small"
          label="End date"
          type="date"
          value={newForm.endDate}
          onChange={(e) => setNewForm((f) => ({ ...f, endDate: e.target.value }))}
          InputLabelProps={{ shrink: true }}
        />
        <Button type="submit" variant="contained" disabled={!newForm.name.trim()}>
          Add
        </Button>
      </Box>

      {/* Menu list */}
      {menus.map((menu) => {
        const isEditingMenu = editingMenuId === menu.id;
        const entryForm = addEntryFormFor(menu.id);
        const sortedEntries = [...(menu.entries ?? [])].sort((a, b) => a.date.localeCompare(b.date));

        return (
          <Accordion key={menu.id} disableGutters>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ flexGrow: 1 }}>
                <Typography>{menu.name}</Typography>
                {(menu.startDate || menu.endDate) && (
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(menu.startDate)}
                    {menu.startDate && menu.endDate ? ' – ' : ''}
                    {formatDate(menu.endDate)}
                  </Typography>
                )}
              </Box>
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); startEditMenu(menu); }}>
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDeleteMenu(menu.id); }}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </AccordionSummary>

            <AccordionDetails>
              {/* Edit menu form */}
              {isEditingMenu && (
                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                  <TextField
                    size="small"
                    label="Name"
                    value={editMenuForm.name}
                    onChange={(e) => setEditMenuForm((f) => ({ ...f, name: e.target.value }))}
                  />
                  <TextField
                    size="small"
                    label="Start date"
                    type="date"
                    value={editMenuForm.startDate}
                    onChange={(e) => setEditMenuForm((f) => ({ ...f, startDate: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    size="small"
                    label="End date"
                    type="date"
                    value={editMenuForm.endDate}
                    onChange={(e) => setEditMenuForm((f) => ({ ...f, endDate: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                  />
                  <Button variant="contained" size="small" disabled={!editMenuForm.name.trim()} onClick={() => handleSaveMenu(menu.id)}>
                    Save
                  </Button>
                  <Button size="small" onClick={() => setEditingMenuId(null)}>Cancel</Button>
                </Box>
              )}

              {/* Entry list */}
              {sortedEntries.length > 0 && (
                <List dense disablePadding sx={{ mb: 1 }}>
                  {sortedEntries.map((entry) => {
                    const key = `${menu.id}:${entry.id}`;
                    const isEditingEntry = editingEntryKey === key;

                    return (
                      <ListItem
                        key={entry.id}
                        disableGutters
                        alignItems="flex-start"
                        secondaryAction={
                          !isEditingEntry && (
                            <Box>
                              <IconButton size="small" onClick={() => startEditEntry(menu.id, entry)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton size="small" onClick={() => handleDeleteEntry(menu.id, entry.id)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          )
                        }
                      >
                        {isEditingEntry ? (
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', pr: 2 }}>
                            <TextField
                              size="small"
                              label="Date"
                              type="date"
                              value={editEntryForm.date}
                              onChange={(e) => setEditEntryForm((f) => ({ ...f, date: e.target.value }))}
                              InputLabelProps={{ shrink: true }}
                            />
                            <Select
                              size="small"
                              displayEmpty
                              value={editEntryForm.mealId}
                              onChange={(e) => setEditEntryForm((f) => ({ ...f, mealId: e.target.value }))}
                              sx={{ minWidth: 160 }}
                              renderValue={(v) => mealById(v)?.name ?? <Typography color="text.secondary">Meal</Typography>}
                            >
                              {meals.map((m) => <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>)}
                            </Select>
                            <TextField
                              size="small"
                              label="Headcount"
                              type="number"
                              value={editEntryForm.headcount}
                              onChange={(e) => setEditEntryForm((f) => ({ ...f, headcount: e.target.value }))}
                              inputProps={{ min: 0, step: 1 }}
                              sx={{ width: 100 }}
                            />
                            <TextField
                              size="small"
                              label="Cook"
                              value={editEntryForm.cook}
                              onChange={(e) => setEditEntryForm((f) => ({ ...f, cook: e.target.value }))}
                              sx={{ width: 140 }}
                            />
                            <Button variant="contained" size="small" disabled={!editEntryForm.mealId || !editEntryForm.date} onClick={() => handleSaveEntry(menu.id, entry.id)}>
                              Save
                            </Button>
                            <Button size="small" onClick={() => setEditingEntryKey(null)}>Cancel</Button>
                          </Box>
                        ) : (
                          <ListItemText primary={formatEntry(entry)} />
                        )}
                      </ListItem>
                    );
                  })}
                </List>
              )}

              <Divider sx={{ my: 1 }} />

              {/* Add entry form */}
              <Box
                component="form"
                onSubmit={(e) => handleAddEntry(menu.id, e)}
                sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}
              >
                <TextField
                  size="small"
                  label="Date"
                  type="date"
                  value={entryForm.date}
                  onChange={(e) => setAddEntryForm(menu.id, { date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
                <Select
                  size="small"
                  displayEmpty
                  value={entryForm.mealId}
                  onChange={(e) => setAddEntryForm(menu.id, { mealId: e.target.value })}
                  sx={{ minWidth: 160 }}
                  renderValue={(v) => mealById(v)?.name ?? <Typography color="text.secondary">Meal</Typography>}
                >
                  {meals.map((m) => <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>)}
                </Select>
                <TextField
                  size="small"
                  label="Headcount"
                  type="number"
                  value={entryForm.headcount}
                  onChange={(e) => setAddEntryForm(menu.id, { headcount: e.target.value })}
                  inputProps={{ min: 0, step: 1 }}
                  sx={{ width: 100 }}
                />
                <TextField
                  size="small"
                  label="Cook"
                  value={entryForm.cook}
                  onChange={(e) => setAddEntryForm(menu.id, { cook: e.target.value })}
                  sx={{ width: 140 }}
                />
                <Button type="submit" variant="outlined" size="small" disabled={!entryForm.mealId || !entryForm.date}>
                  Add entry
                </Button>
              </Box>
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
};

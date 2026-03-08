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
  Paper,
  Select,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ListIcon from '@mui/icons-material/List';
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
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TODAY = new Date().toISOString().slice(0, 10);

const formatDate = (iso: string) => {
  if (!iso) return '';
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
};

// Returns YYYY-MM-DD string for a Date object in local time
const toISO = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Returns the Monday on or before the given date
const mondayBefore = (iso: string) => {
  const d = new Date(iso + 'T00:00:00');
  const dow = d.getDay(); // 0=Sun
  const offset = dow === 0 ? 6 : dow - 1;
  d.setDate(d.getDate() - offset);
  return d;
};

// Returns the Sunday on or after the given date
const sundayAfter = (iso: string) => {
  const d = new Date(iso + 'T00:00:00');
  const dow = d.getDay();
  const offset = dow === 0 ? 0 : 7 - dow;
  d.setDate(d.getDate() + offset);
  return d;
};

// Builds a 2D array of ISO date strings: weeks × days (Mon–Sun)
const buildWeeks = (startDate: string, endDate: string): string[][] => {
  if (!startDate || !endDate) return [];
  const start = mondayBefore(startDate);
  const end = sundayAfter(endDate);
  const weeks: string[][] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const week: string[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(toISO(new Date(cursor)));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
};

interface MenuCalendarProps {
  menu: Menu;
  meals: Meal[];
}

const MenuCalendar = ({ menu, meals }: MenuCalendarProps) => {
  const weeks = buildWeeks(menu.startDate, menu.endDate);
  const entryByDate = new Map<string, MenuEntry>();
  for (const e of menu.entries ?? []) entryByDate.set(e.date, e);
  const mealById = (id: string) => meals.find((m) => m.id === id);

  if (weeks.length === 0) {
    return (
      <Typography variant="body2" color="text.disabled">
        Set a start and end date to see the calendar.
      </Typography>
    );
  }

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '1px',
          bgcolor: 'divider',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          overflow: 'hidden',
          minWidth: 420,
        }}
      >
        {/* Day headers */}
        {DAY_LABELS.map((label) => (
          <Box key={label} sx={{ bgcolor: 'background.paper', p: 0.5, textAlign: 'center' }}>
            <Typography variant="caption" fontWeight={600} color="text.secondary">
              {label}
            </Typography>
          </Box>
        ))}

        {/* Day cells */}
        {weeks.flatMap((week) =>
          week.map((iso) => {
            const inRange = iso >= menu.startDate && iso <= menu.endDate;
            const isToday = iso === TODAY;
            const entry = entryByDate.get(iso);
            const meal = entry ? mealById(entry.mealId) : undefined;

            return (
              <Paper
                key={iso}
                elevation={0}
                square
                sx={{
                  p: 0.75,
                  minHeight: 64,
                  bgcolor: isToday
                    ? 'primary.50'
                    : inRange
                    ? 'background.paper'
                    : 'action.hover',
                  opacity: inRange ? 1 : 0.4,
                  borderTop: isToday ? '2px solid' : 'none',
                  borderColor: 'primary.main',
                }}
              >
                <Typography
                  variant="caption"
                  sx={{ fontWeight: isToday ? 700 : 400, color: isToday ? 'primary.main' : 'text.secondary' }}
                >
                  {iso.slice(8)} {/* day number */}
                </Typography>
                {meal && (
                  <Typography variant="body2" sx={{ fontSize: '0.72rem', mt: 0.25, lineHeight: 1.3 }}>
                    {meal.name}
                  </Typography>
                )}
                {entry && entry.cook && (
                  <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                    {entry.cook}
                  </Typography>
                )}
              </Paper>
            );
          }),
        )}
      </Box>
    </Box>
  );
};

export const Menus = () => {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);

  const [newForm, setNewForm] = useState<MenuEditForm>({ name: '', startDate: '', endDate: '' });
  const [editingMenuId, setEditingMenuId] = useState<string | null>(null);
  const [editMenuForm, setEditMenuForm] = useState<MenuEditForm>({ name: '', startDate: '', endDate: '' });
  const [addEntryForms, setAddEntryForms] = useState<Record<string, EntryForm>>({});
  const [editingEntryKey, setEditingEntryKey] = useState<string | null>(null);
  const [editEntryForm, setEditEntryForm] = useState<EntryForm>(EMPTY_ENTRY_FORM);
  const [viewMode, setViewMode] = useState<Record<string, 'list' | 'calendar'>>({});

  useEffect(() => {
    getMenus().then(setMenus).catch(console.error);
    getMeals().then(setMeals).catch(console.error);
  }, []);

  const mealById = (id: string) => meals.find((m) => m.id === id);
  const addEntryFormFor = (menuId: string): EntryForm => addEntryForms[menuId] ?? EMPTY_ENTRY_FORM;
  const setAddEntryForm = (menuId: string, patch: Partial<EntryForm>) =>
    setAddEntryForms((prev) => ({ ...prev, [menuId]: { ...addEntryFormFor(menuId), ...patch } }));
  const getViewMode = (menuId: string) => viewMode[menuId] ?? 'list';
  const setMenuViewMode = (menuId: string, mode: 'list' | 'calendar') =>
    setViewMode((prev) => ({ ...prev, [menuId]: mode }));

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
        const mode = getViewMode(menu.id);

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

              {/* View toggle */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                <ToggleButtonGroup
                  size="small"
                  exclusive
                  value={mode}
                  onChange={(_, v) => { if (v) setMenuViewMode(menu.id, v); }}
                >
                  <ToggleButton value="list"><ListIcon fontSize="small" /></ToggleButton>
                  <ToggleButton value="calendar"><CalendarMonthIcon fontSize="small" /></ToggleButton>
                </ToggleButtonGroup>
              </Box>

              {/* Calendar view */}
              {mode === 'calendar' && (
                <Box sx={{ mb: 2 }}>
                  <MenuCalendar menu={menu} meals={meals} />
                </Box>
              )}

              {/* List view */}
              {mode === 'list' && sortedEntries.length > 0 && (
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

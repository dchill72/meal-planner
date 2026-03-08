import { API_BASE } from './client';

export interface MenuEntry {
  id: string;
  mealId: string;
  date: string;       // YYYY-MM-DD
  headcount: number;
  cook: string;
}

export interface Menu {
  id: string;
  name: string;
  startDate: string;  // YYYY-MM-DD
  endDate: string;    // YYYY-MM-DD
  entries: MenuEntry[];
}

export const getMenus = async (): Promise<Menu[]> => {
  const res = await fetch(`${API_BASE}/menus`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch menus');
  const { data } = await res.json();
  return data;
};

export const createMenu = async (name: string, startDate: string, endDate: string): Promise<Menu> => {
  const res = await fetch(`${API_BASE}/menus`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, startDate, endDate }),
  });
  if (!res.ok) throw new Error('Failed to create menu');
  const { data } = await res.json();
  return data;
};

export const updateMenu = async (id: string, name: string, startDate: string, endDate: string): Promise<void> => {
  const res = await fetch(`${API_BASE}/menus/${id}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, startDate, endDate }),
  });
  if (!res.ok) throw new Error('Failed to update menu');
};

export const deleteMenu = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE}/menus/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to delete menu');
};

export const addMenuEntry = async (
  menuId: string,
  mealId: string,
  date: string,
  headcount: number,
  cook: string,
): Promise<MenuEntry> => {
  const res = await fetch(`${API_BASE}/menus/${menuId}/entries`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mealId, date, headcount, cook }),
  });
  if (!res.ok) throw new Error('Failed to add menu entry');
  const { data } = await res.json();
  return data;
};

export const updateMenuEntry = async (
  menuId: string,
  entryId: string,
  mealId: string,
  date: string,
  headcount: number,
  cook: string,
): Promise<void> => {
  const res = await fetch(`${API_BASE}/menus/${menuId}/entries/${entryId}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mealId, date, headcount, cook }),
  });
  if (!res.ok) throw new Error('Failed to update menu entry');
};

export const removeMenuEntry = async (menuId: string, entryId: string): Promise<void> => {
  const res = await fetch(`${API_BASE}/menus/${menuId}/entries/${entryId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to remove menu entry');
};

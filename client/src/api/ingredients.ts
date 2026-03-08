import { API_BASE } from './client';

export const STORE_AREAS = [
  'Produce',
  'Dairy',
  'Meat & Seafood',
  'Bakery',
  'Pantry',
  'Frozen',
  'Beverages',
  'Condiments',
  'Spices',
  'Deli',
  'Other',
] as const;

export type StoreArea = (typeof STORE_AREAS)[number];

export interface Ingredient {
  id: string;
  description: string;
  variations: string[];
  storeArea: StoreArea | '';
}

export const getIngredients = async (): Promise<Ingredient[]> => {
  const res = await fetch(`${API_BASE}/ingredients`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch ingredients');
  const { data } = await res.json();
  return data;
};

export const createIngredient = async (
  description: string,
  variations: string[] = [],
  storeArea: StoreArea | '' = '',
): Promise<Ingredient> => {
  const res = await fetch(`${API_BASE}/ingredients`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description, variations, storeArea }),
  });
  if (!res.ok) throw new Error('Failed to create ingredient');
  const { data } = await res.json();
  return data;
};

export const updateIngredient = async (
  id: string,
  description: string,
  variations: string[] = [],
  storeArea: StoreArea | '' = '',
): Promise<void> => {
  const res = await fetch(`${API_BASE}/ingredients/${id}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description, variations, storeArea }),
  });
  if (!res.ok) throw new Error('Failed to update ingredient');
};

export const deleteIngredient = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE}/ingredients/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to delete ingredient');
};

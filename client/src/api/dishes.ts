import { API_BASE } from './client';

export const MEASURES = [
  // Volume — Imperial
  { value: 'tsp',   label: 'tsp (teaspoon)' },
  { value: 'tbsp',  label: 'tbsp (tablespoon)' },
  { value: 'fl oz', label: 'fl oz (fluid ounce)' },
  { value: 'cup',   label: 'cup' },
  { value: 'pt',    label: 'pt (pint)' },
  { value: 'qt',    label: 'qt (quart)' },
  { value: 'gal',   label: 'gal (gallon)' },
  // Volume — Metric
  { value: 'ml',    label: 'ml (milliliter)' },
  { value: 'l',     label: 'l (liter)' },
  // Weight — Imperial
  { value: 'oz',    label: 'oz (ounce)' },
  { value: 'lb',    label: 'lb (pound)' },
  // Weight — Metric
  { value: 'g',     label: 'g (gram)' },
  { value: 'kg',    label: 'kg (kilogram)' },
  // Discrete
  { value: 'count', label: 'count' },
] as const;

export type Measure = (typeof MEASURES)[number]['value'];

export interface DishIngredient {
  id: string;
  ingredientId: string;
  variation: string;
  amount: number;
  measure: Measure;
}

export interface Dish {
  id: string;
  name: string;
  serves: number;
  instructions: string;
  source: string;
  ingredients: DishIngredient[];
}

export const getDishes = async (): Promise<Dish[]> => {
  const res = await fetch(`${API_BASE}/dishes`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch dishes');
  const { data } = await res.json();
  return data;
};

export const createDish = async (
  name: string,
  serves = 0,
  instructions = '',
  source = '',
): Promise<Dish> => {
  const res = await fetch(`${API_BASE}/dishes`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, serves, instructions, source }),
  });
  if (!res.ok) throw new Error('Failed to create dish');
  const { data } = await res.json();
  return data;
};

export const updateDish = async (
  id: string,
  name: string,
  serves = 0,
  instructions = '',
  source = '',
): Promise<void> => {
  const res = await fetch(`${API_BASE}/dishes/${id}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, serves, instructions, source }),
  });
  if (!res.ok) throw new Error('Failed to update dish');
};

export const deleteDish = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE}/dishes/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to delete dish');
};

export const addDishIngredient = async (
  dishId: string,
  ingredientId: string,
  variation: string,
  amount: number,
  measure: Measure,
): Promise<DishIngredient> => {
  const res = await fetch(`${API_BASE}/dishes/${dishId}/ingredients`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ingredientId, variation, amount, measure }),
  });
  if (!res.ok) throw new Error('Failed to add ingredient to dish');
  const { data } = await res.json();
  return data;
};

export const removeDishIngredient = async (dishId: string, entryId: string): Promise<void> => {
  const res = await fetch(`${API_BASE}/dishes/${dishId}/ingredients/${entryId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to remove ingredient from dish');
};

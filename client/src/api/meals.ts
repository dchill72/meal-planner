import { API_BASE } from './client';

export interface Meal {
  id: string;
  name: string;
  dishIds: string[];
}

export const getMeals = async (): Promise<Meal[]> => {
  const res = await fetch(`${API_BASE}/meals`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch meals');
  const { data } = await res.json();
  return data;
};

export const createMeal = async (name: string): Promise<Meal> => {
  const res = await fetch(`${API_BASE}/meals`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('Failed to create meal');
  const { data } = await res.json();
  return data;
};

export const updateMeal = async (id: string, name: string): Promise<void> => {
  const res = await fetch(`${API_BASE}/meals/${id}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('Failed to update meal');
};

export const deleteMeal = async (id: string): Promise<void> => {
  const res = await fetch(`${API_BASE}/meals/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to delete meal');
};

export const addMealDish = async (mealId: string, dishId: string): Promise<void> => {
  const res = await fetch(`${API_BASE}/meals/${mealId}/dishes`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dishId }),
  });
  if (!res.ok) throw new Error('Failed to add dish to meal');
};

export const removeMealDish = async (mealId: string, dishId: string): Promise<void> => {
  const res = await fetch(`${API_BASE}/meals/${mealId}/dishes/${dishId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to remove dish from meal');
};

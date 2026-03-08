import { API_BASE } from './client';

export interface GroceryLine {
  ingredientId: string;
  description: string;
  variation: string;
  amount: number;
  measure: string;
  storeArea: string;
}

export const getGroceryList = async (menuId: string): Promise<GroceryLine[]> => {
  const res = await fetch(`${API_BASE}/menus/${menuId}/grocery-list`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch grocery list');
  const { data } = await res.json();
  return data;
};

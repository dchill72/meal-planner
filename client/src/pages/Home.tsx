import { useState, useEffect } from 'react';
import { Box, Card, CardContent, Divider, Typography } from '@mui/material';
import { getIngredients } from '../api/ingredients';
import { getDishes } from '../api/dishes';
import { getMeals } from '../api/meals';
import { getMenus, Menu } from '../api/menus';

interface Stats {
  ingredients: number;
  dishes: number;
  meals: number;
  menus: number;
  upcomingEntries: { date: string; mealName: string; headcount: number; cook: string }[];
}

const today = () => new Date().toISOString().slice(0, 10);

const formatDate = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const upcomingFrom = (menus: Menu[]): Stats['upcomingEntries'] => {
  const t = today();
  const entries: Stats['upcomingEntries'] = [];
  for (const menu of menus) {
    for (const entry of menu.entries ?? []) {
      if (entry.date >= t) {
        entries.push({
          date: entry.date,
          mealName: entry.mealId, // resolved below
          headcount: entry.headcount,
          cook: entry.cook,
        });
      }
    }
  }
  return entries.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 7);
};

interface StatCardProps {
  label: string;
  value: number;
}

const StatCard = ({ label, value }: StatCardProps) => (
  <Card variant="outlined" sx={{ minWidth: 120, textAlign: 'center' }}>
    <CardContent sx={{ pb: '16px !important' }}>
      <Typography variant="h4">{value}</Typography>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
    </CardContent>
  </Card>
);

export const Home = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [mealNames, setMealNames] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([getIngredients(), getDishes(), getMeals(), getMenus()])
      .then(([ingredients, dishes, meals, menus]) => {
        const nameMap: Record<string, string> = {};
        for (const m of meals) nameMap[m.id] = m.name;
        setMealNames(nameMap);

        setStats({
          ingredients: ingredients.length,
          dishes: dishes.length,
          meals: meals.length,
          menus: menus.length,
          upcomingEntries: upcomingFrom(menus),
        });
      })
      .catch(console.error);
  }, []);

  if (!stats) return null;

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Dashboard
      </Typography>

      {/* Stat cards */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 4 }}>
        <StatCard label="Ingredients" value={stats.ingredients} />
        <StatCard label="Dishes" value={stats.dishes} />
        <StatCard label="Meals" value={stats.meals} />
        <StatCard label="Menus" value={stats.menus} />
      </Box>

      {/* Upcoming entries */}
      <Typography variant="h6" gutterBottom>
        Upcoming
      </Typography>
      {stats.upcomingEntries.length === 0 ? (
        <Typography variant="body2" color="text.disabled">
          No upcoming meals scheduled.
        </Typography>
      ) : (
        <Box>
          {stats.upcomingEntries.map((entry, i) => (
            <Box key={i}>
              {i > 0 && <Divider />}
              <Box sx={{ py: 1.5, display: 'flex', gap: 2, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>
                  {formatDate(entry.date)}
                </Typography>
                <Typography>{mealNames[entry.mealName] ?? entry.mealName}</Typography>
                {entry.headcount > 0 && (
                  <Typography variant="body2" color="text.secondary">
                    {entry.headcount} {entry.headcount === 1 ? 'person' : 'people'}
                  </Typography>
                )}
                {entry.cook && (
                  <Typography variant="body2" color="text.secondary">
                    cook: {entry.cook}
                  </Typography>
                )}
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

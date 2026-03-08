import { useState, useEffect } from 'react';
import { Box, Card, CardContent, Divider, Typography } from '@mui/material';
import { getIngredients } from '../api/ingredients';
import { getDishes } from '../api/dishes';
import { getMeals, Meal } from '../api/meals';
import { getMenus, Menu } from '../api/menus';
import { MonthCalendar, CalendarEntry } from '../components/MonthCalendar';

interface Stats {
  ingredients: number;
  dishes: number;
  meals: number;
  menus: number;
}

const TODAY = new Date().toISOString().slice(0, 10);

const formatDate = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const buildCalendarEntries = (
  menus: Menu[],
  mealMap: Record<string, string>,
  year: number,
  month: number,
): Record<string, CalendarEntry[]> => {
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  const result: Record<string, CalendarEntry[]> = {};
  for (const menu of menus) {
    for (const entry of menu.entries ?? []) {
      if (!entry.date.startsWith(prefix)) continue;
      if (!result[entry.date]) result[entry.date] = [];
      result[entry.date].push({
        label: mealMap[entry.mealId] ?? '—',
        sublabel: entry.cook || undefined,
      });
    }
  }
  return result;
};

const upcomingEntries = (menus: Menu[], mealMap: Record<string, string>) => {
  const entries: { date: string; mealName: string; headcount: number; cook: string }[] = [];
  for (const menu of menus) {
    for (const entry of menu.entries ?? []) {
      if (entry.date >= TODAY) {
        entries.push({
          date: entry.date,
          mealName: mealMap[entry.mealId] ?? entry.mealId,
          headcount: entry.headcount,
          cook: entry.cook,
        });
      }
    }
  }
  return entries.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 7);
};

const StatCard = ({ label, value }: { label: string; value: number }) => (
  <Card variant="outlined" sx={{ minWidth: 120, textAlign: 'center' }}>
    <CardContent sx={{ pb: '16px !important' }}>
      <Typography variant="h4">{value}</Typography>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
    </CardContent>
  </Card>
);

export const Home = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [mealMap, setMealMap] = useState<Record<string, string>>({});
  const [upcoming, setUpcoming] = useState<ReturnType<typeof upcomingEntries>>([]);

  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);

  useEffect(() => {
    Promise.all([getIngredients(), getDishes(), getMeals(), getMenus()])
      .then(([ingredients, dishes, meals, fetchedMenus]: [any[], any[], Meal[], Menu[]]) => {
        const map: Record<string, string> = {};
        for (const m of meals) map[m.id] = m.name;
        setMealMap(map);
        setMenus(fetchedMenus);
        setStats({
          ingredients: ingredients.length,
          dishes: dishes.length,
          meals: meals.length,
          menus: fetchedMenus.length,
        });
        setUpcoming(upcomingEntries(fetchedMenus, map));
      })
      .catch(console.error);
  }, []);

  const handlePrev = () => {
    if (calMonth === 1) { setCalYear((y) => y - 1); setCalMonth(12); }
    else setCalMonth((m) => m - 1);
  };

  const handleNext = () => {
    if (calMonth === 12) { setCalYear((y) => y + 1); setCalMonth(1); }
    else setCalMonth((m) => m + 1);
  };

  if (!stats) return null;

  const calEntries = buildCalendarEntries(menus, mealMap, calYear, calMonth);

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

      {/* Month calendar */}
      <MonthCalendar
        year={calYear}
        month={calMonth}
        entries={calEntries}
        onPrev={handlePrev}
        onNext={handleNext}
      />

      {/* Upcoming list */}
      <Typography variant="h6" sx={{ mt: 4, mb: 1 }}>
        Upcoming
      </Typography>
      {upcoming.length === 0 ? (
        <Typography variant="body2" color="text.disabled">
          No upcoming meals scheduled.
        </Typography>
      ) : (
        <Box>
          {upcoming.map((entry, i) => (
            <Box key={i}>
              {i > 0 && <Divider />}
              <Box sx={{ py: 1.5, display: 'flex', gap: 2, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>
                  {formatDate(entry.date)}
                </Typography>
                <Typography>{entry.mealName}</Typography>
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

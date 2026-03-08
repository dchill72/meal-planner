import { useState, useEffect } from 'react';
import {
  Box,
  Divider,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import { getMenus, Menu } from '../api/menus';
import { GroceryLine, getGroceryList } from '../api/grocery';

const formatAmount = (n: number) => {
  return parseFloat(n.toPrecision(6)).toString();
};

const formatLine = (line: GroceryLine) => {
  const name = line.variation ? `${line.description}: ${line.variation}` : line.description;
  const amount = formatAmount(line.amount);
  const measure = line.measure === 'count' ? '×' : line.measure;
  return `${amount} ${measure}  ${name}`;
};

const groupByArea = (lines: GroceryLine[]): Map<string, GroceryLine[]> => {
  const map = new Map<string, GroceryLine[]>();
  const sorted = [...lines].sort((a, b) => {
    const areaCompare = (a.storeArea || 'zzz').localeCompare(b.storeArea || 'zzz');
    if (areaCompare !== 0) return areaCompare;
    return a.description.localeCompare(b.description);
  });
  for (const line of sorted) {
    const area = line.storeArea || 'Other';
    if (!map.has(area)) map.set(area, []);
    map.get(area)!.push(line);
  }
  return map;
};

export const GroceryList = () => {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [selectedMenuId, setSelectedMenuId] = useState('');
  const [lines, setLines] = useState<GroceryLine[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getMenus().then(setMenus).catch(console.error);
  }, []);

  const handleMenuChange = async (menuId: string) => {
    setSelectedMenuId(menuId);
    if (!menuId) { setLines(null); return; }
    setLoading(true);
    try {
      const result = await getGroceryList(menuId);
      setLines(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const grouped = lines ? groupByArea(lines) : null;

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Grocery List
      </Typography>

      <Select
        size="small"
        displayEmpty
        value={selectedMenuId}
        onChange={(e) => handleMenuChange(e.target.value)}
        sx={{ minWidth: 240, mb: 3 }}
        renderValue={(v) => {
          const m = menus.find((x) => x.id === v);
          return m ? m.name : <Typography color="text.secondary">Select a menu…</Typography>;
        }}
      >
        {menus.map((m) => (
          <MenuItem key={m.id} value={m.id}>
            {m.name}
          </MenuItem>
        ))}
      </Select>

      {loading && (
        <Typography variant="body2" color="text.secondary">Loading…</Typography>
      )}

      {!loading && grouped && grouped.size === 0 && (
        <Typography variant="body2" color="text.disabled">
          No ingredients found. Make sure the menu has entries with meals that contain dishes with ingredients.
        </Typography>
      )}

      {!loading && grouped && grouped.size > 0 && (
        <Box>
          {Array.from(grouped.entries()).map(([area, areaLines], i) => (
            <Box key={area}>
              {i > 0 && <Divider sx={{ my: 2 }} />}
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                {area}
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 3 }}>
                {areaLines.map((line, j) => (
                  <Typography component="li" variant="body2" key={j} sx={{ mb: 0.25 }}>
                    {formatLine(line)}
                  </Typography>
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

import { Box, IconButton, Paper, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

export interface CalendarEntry {
  label: string;
  sublabel?: string;
}

interface Props {
  year: number;
  month: number; // 1–12
  entries: Record<string, CalendarEntry[]>; // keyed by YYYY-MM-DD
  onPrev: () => void;
  onNext: () => void;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const toISO = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Monday on or before the given date
const mondayBefore = (d: Date) => {
  const result = new Date(d);
  const dow = result.getDay();
  const offset = dow === 0 ? 6 : dow - 1;
  result.setDate(result.getDate() - offset);
  return result;
};

// Sunday on or after the given date
const sundayAfter = (d: Date) => {
  const result = new Date(d);
  const dow = result.getDay();
  const offset = dow === 0 ? 0 : 7 - dow;
  result.setDate(result.getDate() + offset);
  return result;
};

const buildWeeks = (year: number, month: number): string[][] => {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const start = mondayBefore(firstDay);
  const end = sundayAfter(lastDay);

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

export const MonthCalendar = ({ year, month, entries, onPrev, onNext }: Props) => {
  const today = new Date().toISOString().slice(0, 10);
  const weeks = buildWeeks(year, month);
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <IconButton size="small" onClick={onPrev}><ChevronLeftIcon /></IconButton>
        <Typography variant="h6" sx={{ flexGrow: 1, textAlign: 'center' }}>
          {MONTH_NAMES[month - 1]} {year}
        </Typography>
        <IconButton size="small" onClick={onNext}><ChevronRightIcon /></IconButton>
      </Box>

      {/* Grid */}
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
            minWidth: 560,
          }}
        >
          {/* Day-of-week headers */}
          {DAY_LABELS.map((label) => (
            <Box key={label} sx={{ bgcolor: 'background.paper', p: 0.75, textAlign: 'center' }}>
              <Typography variant="caption" fontWeight={600} color="text.secondary">
                {label}
              </Typography>
            </Box>
          ))}

          {/* Day cells */}
          {weeks.flatMap((week) =>
            week.map((iso) => {
              const inMonth = iso.startsWith(monthPrefix);
              const isToday = iso === today;
              const dayEntries = entries[iso] ?? [];

              return (
                <Paper
                  key={iso}
                  elevation={0}
                  square
                  sx={{
                    p: 0.75,
                    minHeight: 72,
                    bgcolor: isToday ? 'primary.50' : inMonth ? 'background.paper' : 'action.hover',
                    opacity: inMonth ? 1 : 0.45,
                    borderTop: isToday ? '2px solid' : 'none',
                    borderColor: 'primary.main',
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      fontWeight: isToday ? 700 : 400,
                      color: isToday ? 'primary.main' : 'text.secondary',
                      mb: 0.25,
                    }}
                  >
                    {Number(iso.slice(8))}
                  </Typography>
                  {dayEntries.map((e, i) => (
                    <Box key={i}>
                      <Typography variant="body2" sx={{ fontSize: '0.72rem', lineHeight: 1.3, fontWeight: 500 }}>
                        {e.label}
                      </Typography>
                      {e.sublabel && (
                        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.65rem' }}>
                          {e.sublabel}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Paper>
              );
            }),
          )}
        </Box>
      </Box>
    </Box>
  );
};

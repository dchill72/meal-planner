import React, { createContext, useContext, useMemo, useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { PaletteMode } from '@mui/material';
import { createAppTheme } from '../theme';

interface ThemeCtxType {
  mode: PaletteMode;
  setMode: (mode: PaletteMode) => void;
}

const ThemeCtx = createContext<ThemeCtxType>({ mode: 'light', setMode: () => {} });

const storedMode = (): PaletteMode => {
  const v = localStorage.getItem('themeMode');
  return v === 'dark' ? 'dark' : 'light';
};

export const ThemeContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [mode, setModeState] = useState<PaletteMode>(storedMode);

  const setMode = (m: PaletteMode) => {
    setModeState(m);
    localStorage.setItem('themeMode', m);
  };

  const theme = useMemo(() => createAppTheme(mode), [mode]);

  return (
    <ThemeCtx.Provider value={{ mode, setMode }}>
      <ThemeProvider theme={theme}>
        {children}
      </ThemeProvider>
    </ThemeCtx.Provider>
  );
};

export const useThemeCtx = () => useContext(ThemeCtx);

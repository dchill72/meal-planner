import * as React from 'react';
import {
  Box,
  CssBaseline,
  Divider,
  IconButton,
  Toolbar,
  Typography,
} from '@mui/material';
import { AppBar } from '../components/AppBar';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { Drawer } from '../components/Drawer';
import { Nav, ProfileNavItem } from '../components/Nav';
import { Container } from '@mui/system';
import { Outlet } from 'react-router-dom';
import { useThemeCtx } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../api/client';

export const Root = () => {
  const [open, setOpen] = React.useState(true);
  const { mode, setMode } = useThemeCtx();
  const { user, updateUser } = useAuth();

  const toggleDrawer = () => setOpen(!open);

  const handleToggleTheme = () => {
    const next = mode === 'light' ? 'dark' : 'light';
    setMode(next);
    if (user) {
      fetch(`${API_BASE}/me`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: user.name, theme: next }),
      }).catch(console.error);
      updateUser({ theme: next });
    }
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar position="absolute" open={open}>
        <Toolbar sx={{ pr: '24px' }}>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="open drawer"
            onClick={toggleDrawer}
            sx={{ marginRight: '36px', ...(open && { display: 'none' }) }}
          >
            <MenuIcon />
          </IconButton>
          <Typography component="h1" variant="h6" color="inherit" noWrap sx={{ flexGrow: 1 }}>
            Dashboard
          </Typography>
          <IconButton color="inherit" onClick={handleToggleTheme} aria-label="toggle theme">
            {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>
        </Toolbar>
      </AppBar>
      <Drawer variant="permanent" open={open}>
        <Toolbar
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', px: [1] }}
        >
          <IconButton onClick={toggleDrawer}>
            <ChevronLeftIcon />
          </IconButton>
        </Toolbar>
        <Divider />
        <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>
          <Nav />
          <Box sx={{ flexGrow: 1 }} />
          <Divider />
          <ProfileNavItem />
        </Box>
      </Drawer>
      <Box
        component="main"
        sx={{
          backgroundColor: (theme) =>
            theme.palette.mode === 'light'
              ? theme.palette.grey[100]
              : theme.palette.grey[900],
          flexGrow: 1,
          height: '100vh',
          overflow: 'auto',
        }}
      >
        <Toolbar />
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Outlet />
        </Container>
      </Box>
    </Box>
  );
};

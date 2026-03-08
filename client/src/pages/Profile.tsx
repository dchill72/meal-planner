import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Divider,
  Paper,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { useThemeCtx } from '../context/ThemeContext';
import { API_BASE } from '../api/client';

export const Profile = () => {
  const { user, loading, login, logout, updateUser } = useAuth();
  const { mode, setMode } = useThemeCtx();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user?.name]);

  if (loading) return null;

  if (!user) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <GoogleLogin onSuccess={(res) => login(res.credential!)} />
      </Box>
    );
  }

  const hasChanges = name !== user.name || mode !== (user.theme ?? 'light');

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`${API_BASE}/me`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, theme: mode }),
      });
      setMode(mode);
      updateUser({ name, theme: mode });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Paper sx={{ p: 4, maxWidth: 400, mx: 'auto', mt: 4 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Typography variant="body2" color="text.secondary">
          {user.email}
        </Typography>
        <TextField
          label="Display name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
        />
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Theme
          </Typography>
          <ToggleButtonGroup
            exclusive
            value={mode}
            onChange={(_, v) => { if (v) setMode(v); }}
            size="small"
          >
            <ToggleButton value="light">
              <Brightness7Icon fontSize="small" sx={{ mr: 0.5 }} /> Light
            </ToggleButton>
            <ToggleButton value="dark">
              <Brightness4Icon fontSize="small" sx={{ mr: 0.5 }} /> Dark
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || !hasChanges}
        >
          {saving ? 'Saving…' : 'Save'}
        </Button>
        <Divider />
        <Button variant="outlined" color="inherit" onClick={logout}>
          Sign out
        </Button>
      </Box>
    </Paper>
  );
};

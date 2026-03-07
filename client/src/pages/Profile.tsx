import { useEffect, useState } from 'react';
import { Box, Button, Divider, Paper, TextField, Typography } from '@mui/material';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';

export const Profile = () => {
  const { user, loading, login, logout, updateUser } = useAuth();
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

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('http://localhost:8000/me', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      updateUser({ name });
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
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || name === user.name}
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

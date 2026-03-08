import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Divider,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { useThemeCtx } from '../context/ThemeContext';
import { API_BASE } from '../api/client';

export const Profile = () => {
  const { user, loading, login, logout, updateUser } = useAuth();
  const { mode, setMode } = useThemeCtx();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const handleGenerateKey = async () => {
    setGeneratingKey(true);
    try {
      const res = await fetch(`${API_BASE}/me/mcp-key`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        updateUser({ mcpKey: data.mcpKey });
        setShowKey(true);
      }
    } finally {
      setGeneratingKey(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const mcpCommand = user.mcpKey
    ? `claude mcp add --transport http --scope user meal-planner ${API_BASE}/mcp --header "Authorization: Bearer ${user.mcpKey}"`
    : null;

  return (
    <Paper sx={{ p: 4, maxWidth: 520, mx: 'auto', mt: 4 }}>
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

        <Box>
          <Typography variant="subtitle2" gutterBottom>
            MCP API key
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Use this key to connect Claude Code to the meal planner MCP server.
          </Typography>
          {user.mcpKey ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <TextField
                label="API key"
                value={user.mcpKey}
                type={showKey ? 'text' : 'password'}
                fullWidth
                slotProps={{
                  input: {
                    readOnly: true,
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setShowKey((s) => !s)}>
                          {showKey ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                        </IconButton>
                        <Tooltip title={copied ? 'Copied!' : 'Copy key'}>
                          <IconButton size="small" onClick={() => handleCopy(user.mcpKey!)}>
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    ),
                  },
                }}
              />
              {mcpCommand && (
                <Box sx={{ position: 'relative' }}>
                  <TextField
                    label="claude mcp add command"
                    value={mcpCommand}
                    multiline
                    fullWidth
                    slotProps={{ input: { readOnly: true } }}
                    sx={{ fontFamily: 'monospace', '& textarea': { fontFamily: 'monospace', fontSize: '0.75rem' } }}
                  />
                  <Tooltip title={copied ? 'Copied!' : 'Copy command'}>
                    <IconButton
                      size="small"
                      onClick={() => handleCopy(mcpCommand)}
                      sx={{ position: 'absolute', top: 8, right: 8 }}
                    >
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
              <Button
                variant="outlined"
                size="small"
                startIcon={<RefreshIcon />}
                onClick={handleGenerateKey}
                disabled={generatingKey}
                color="warning"
              >
                {generatingKey ? 'Regenerating…' : 'Regenerate key'}
              </Button>
            </Box>
          ) : (
            <Button
              variant="outlined"
              onClick={handleGenerateKey}
              disabled={generatingKey}
            >
              {generatingKey ? 'Generating…' : 'Generate MCP key'}
            </Button>
          )}
        </Box>

        <Divider />
        <Button variant="outlined" color="inherit" onClick={logout}>
          Sign out
        </Button>
      </Box>
    </Paper>
  );
};

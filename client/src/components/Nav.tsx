import * as React from 'react';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import DashboardIcon from '@mui/icons-material/Dashboard';
import MenusIcon from '@mui/icons-material/MenuBook';
import DinnerDiningIcon from '@mui/icons-material/DinnerDining';
import EggIcon from '@mui/icons-material/Egg';
import LocalDiningIcon from '@mui/icons-material/LocalDining';
import LocalGroceryStoreIcon from '@mui/icons-material/LocalGroceryStore';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { Link, List, Tooltip } from '@mui/material';
import { useAuth } from '../context/AuthContext';

export const Nav = () => {
  return (
    <List component="nav">
      <ListItemButton LinkComponent={Link} href="/">
        <ListItemIcon>
          <DashboardIcon />
        </ListItemIcon>
        <ListItemText primary="Home" />
      </ListItemButton>
      <ListItemButton LinkComponent={Link} href="/menus">
        <ListItemIcon>
          <MenusIcon />
        </ListItemIcon>
        <ListItemText primary="Menus" />
      </ListItemButton>
      <ListItemButton LinkComponent={Link} href="/meals">
        <ListItemIcon>
          <LocalDiningIcon />
        </ListItemIcon>
        <ListItemText primary="Meals" />
      </ListItemButton>
      <ListItemButton LinkComponent={Link} href="/dishes">
        <ListItemIcon>
          <DinnerDiningIcon />
        </ListItemIcon>
        <ListItemText primary="Dishes" />
      </ListItemButton>
      <ListItemButton LinkComponent={Link} href="/ingredients">
        <ListItemIcon>
          <EggIcon />
        </ListItemIcon>
        <ListItemText primary="Pantry" />
      </ListItemButton>
      <ListItemButton LinkComponent={Link} href="/grocery">
        <ListItemIcon>
          <LocalGroceryStoreIcon />
        </ListItemIcon>
        <ListItemText primary="Grocery List" />
      </ListItemButton>
    </List>
  );
};

export const ProfileNavItem = () => {
  const { user } = useAuth();

  return (
    <Tooltip title={user ? user.email : 'Sign in'} placement="right">
      <ListItemButton LinkComponent={Link} href="/profile">
        <ListItemIcon>
          <AccountCircleIcon />
        </ListItemIcon>
        <ListItemText primary={user ? user.email : 'Sign in'} />
      </ListItemButton>
    </Tooltip>
  );
};

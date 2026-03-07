import { Root } from './pages/Root';
import { Menus } from './pages/Menus';
import { Home } from './pages/Home';
import { createBrowserRouter } from 'react-router-dom';
import { Dishes } from './pages/Dishes';
import { Ingredients } from './pages/Ingredients';
import { Meals } from './pages/Meals';
import { GroceryList } from './pages/Grocery';
import { Profile } from './pages/Profile';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Root />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: 'menus',
        element: <Menus />,
      },
      {
        path: 'meals',
        element: <Meals />,
      },
      {
        path: 'dishes',
        element: <Dishes />,
      },
      {
        path: 'ingredients',
        element: <Ingredients />,
      },
      {
        path: 'grocery',
        element: <GroceryList />,
      },
      {
        path: 'profile',
        element: <Profile />,
      },
    ],
  },
]);

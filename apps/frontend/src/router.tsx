import { createBrowserRouter } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { SearchPage } from './pages/SearchPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { CategorySchemeListPage } from './pages/CategorySchemeListPage';
import { SchemeDetailsPage } from './pages/SchemeDetailsPage';
import { AuthPage } from './pages/AuthPage';
import { ProfilePage } from './pages/ProfilePage';
import { ChecklistPage } from './pages/ChecklistPage';
import { AssistantPage } from './pages/AssistantPage';
import { UIPreviewPage } from './pages/dev/UIPreviewPage';

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/search', element: <SearchPage /> },
  { path: '/categories', element: <CategoriesPage /> },
  { path: '/categories/:slug', element: <CategorySchemeListPage /> },
  { path: '/schemes/:idOrSlug', element: <SchemeDetailsPage /> },
  { path: '/auth', element: <AuthPage /> },
  { path: '/profile', element: <ProfilePage /> },
  { path: '/checklist', element: <ChecklistPage /> },
  { path: '/assistant', element: <AssistantPage /> },
  { path: '/dev/ui-preview', element: <UIPreviewPage /> }
]);

import { createBrowserRouter } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage.js';
import { SearchPage } from './pages/SearchPage.js';
import { SchemeDetailsPage } from './pages/SchemeDetailsPage.js';
import { AuthPage } from './pages/AuthPage.js';
import { ProfilePage } from './pages/ProfilePage.js';
import { ChecklistPage } from './pages/ChecklistPage.js';
import { AssistantPage } from './pages/AssistantPage.js';
import { UIPreviewPage } from './pages/dev/UIPreviewPage.js';

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/search', element: <SearchPage /> },
  { path: '/schemes/:idOrSlug', element: <SchemeDetailsPage /> },
  { path: '/auth', element: <AuthPage /> },
  { path: '/profile', element: <ProfilePage /> },
  { path: '/checklist', element: <ChecklistPage /> },
  { path: '/assistant', element: <AssistantPage /> },
  { path: '/dev/ui-preview', element: <UIPreviewPage /> }
]);

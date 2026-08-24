import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { RequireAuth } from './auth/RequireAuth';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { SearchPage } from './pages/SearchPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { CategorySchemeListPage } from './pages/CategorySchemeListPage';
import { SchemeDetailsPage } from './pages/SchemeDetailsPage';
import { SavedSchemesPage } from './pages/SavedSchemesPage';
import { ChecklistPage } from './pages/ChecklistPage';
import { EligibilityCheckerPage } from './pages/EligibilityCheckerPage';
import { CompareSchemesPage } from './pages/CompareSchemesPage';
import { AssistantPage } from './pages/AssistantPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { OnboardingGate, OnboardingPage, OnboardingChoicePage, AiOnboardingPlaceholder } from './onboarding';

export const router = createBrowserRouter([
  // Public surfaces carry their own header and footer.
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },

  /*
   * The questions asked on first arrival. Signed in, but deliberately
   * outside both the shell and the onboarding gate: it needs the whole
   * screen for one large question at a time, and a gate that guarded its
   * own destination would redirect for ever.
   */
  {
    path: '/welcome',
    element: (
      <RequireAuth>
        <OnboardingChoicePage />
      </RequireAuth>
    )
  },
  {
    path: '/welcome/manual',
    element: (
      <RequireAuth>
        <OnboardingPage />
      </RequireAuth>
    )
  },
  {
    path: '/welcome/ai',
    element: (
      <RequireAuth>
        <AiOnboardingPlaceholder />
      </RequireAuth>
    )
  },

  // Everything else is the application proper: rail, search bar, records.
  // It sits behind sign-in, so the only public surfaces are the two above.
  {
    element: (
      <RequireAuth>
        <OnboardingGate>
          <AppShell />
        </OnboardingGate>
      </RequireAuth>
    ),
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/search', element: <SearchPage /> },
      { path: '/categories', element: <CategoriesPage /> },
      { path: '/categories/:slug', element: <CategorySchemeListPage /> },
      { path: '/schemes/:idOrSlug', element: <SchemeDetailsPage /> },
      { path: '/saved', element: <SavedSchemesPage /> },
      { path: '/eligibility', element: <EligibilityCheckerPage /> },
      { path: '/checklist', element: <ChecklistPage /> },
      { path: '/compare', element: <CompareSchemesPage /> },
      { path: '/assistant', element: <AssistantPage /> },
      { path: '/profile', element: <ProfilePage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '*', element: <NotFoundPage /> }
    ]
  }
]);

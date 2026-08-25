import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { RequireAuth } from './auth/RequireAuth';
import { OnboardingGate, OnboardingChoicePage } from './onboarding';

// Public entry points and onboarding stay outside the shell, so each gets
// its own Suspense boundary rather than sharing AppShell's.
const LandingPage = lazy(() => import('./pages/LandingPage').then((m) => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const OnboardingPage = lazy(() => import('./onboarding').then((m) => ({ default: m.OnboardingPage })));
const AiOnboardingPage = lazy(() => import('./onboarding').then((m) => ({ default: m.AiOnboardingPage })));

// Everything behind the shell is lazy too — AppShell wraps its <Outlet />
// in its own Suspense, so these only need to be split, not individually
// wrapped.
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const SearchPage = lazy(() => import('./pages/SearchPage').then((m) => ({ default: m.SearchPage })));
const CategoriesPage = lazy(() => import('./pages/CategoriesPage').then((m) => ({ default: m.CategoriesPage })));
const CategorySchemeListPage = lazy(() =>
  import('./pages/CategorySchemeListPage').then((m) => ({ default: m.CategorySchemeListPage }))
);
const SchemeDetailsPage = lazy(() =>
  import('./pages/SchemeDetailsPage').then((m) => ({ default: m.SchemeDetailsPage }))
);
const SavedSchemesPage = lazy(() =>
  import('./pages/SavedSchemesPage').then((m) => ({ default: m.SavedSchemesPage }))
);
const ChecklistPage = lazy(() => import('./pages/ChecklistPage').then((m) => ({ default: m.ChecklistPage })));
const EligibilityCheckerPage = lazy(() =>
  import('./pages/EligibilityCheckerPage').then((m) => ({ default: m.EligibilityCheckerPage }))
);
const CompareSchemesPage = lazy(() =>
  import('./pages/CompareSchemesPage').then((m) => ({ default: m.CompareSchemesPage }))
);
const AssistantPage = lazy(() => import('./pages/AssistantPage').then((m) => ({ default: m.AssistantPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center" role="status" aria-label="Loading page">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
    </div>
  );
}

export const router = createBrowserRouter([
  // Public surfaces carry their own header and footer.
  {
    path: '/',
    element: (
      <Suspense fallback={<RouteFallback />}>
        <LandingPage />
      </Suspense>
    )
  },
  {
    path: '/login',
    element: (
      <Suspense fallback={<RouteFallback />}>
        <LoginPage />
      </Suspense>
    )
  },

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
        <Suspense fallback={<RouteFallback />}>
          <OnboardingPage />
        </Suspense>
      </RequireAuth>
    )
  },
  {
    path: '/welcome/ai',
    element: (
      <RequireAuth>
        <Suspense fallback={<RouteFallback />}>
          <AiOnboardingPage />
        </Suspense>
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

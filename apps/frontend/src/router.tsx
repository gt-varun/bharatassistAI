import { Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { RequireAuth } from './auth/RequireAuth';
import { lazyWithRetry } from './lib/lazyWithRetry';
import { OnboardingGate, OnboardingChoicePage } from './onboarding';

// Public entry points and onboarding stay outside the shell, so each gets
// its own Suspense boundary rather than sharing AppShell's.
const LandingPage = lazyWithRetry(() => import('./pages/LandingPage').then((m) => ({ default: m.LandingPage })));
const LoginPage = lazyWithRetry(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const OnboardingPage = lazyWithRetry(() => import('./onboarding').then((m) => ({ default: m.OnboardingPage })));
const AiOnboardingPage = lazyWithRetry(() =>
  import('./onboarding').then((m) => ({ default: m.AiOnboardingPage }))
);

// Everything behind the shell is lazy too — AppShell wraps its <Outlet />
// in its own Suspense, so these only need to be split, not individually
// wrapped.
const DashboardPage = lazyWithRetry(() =>
  import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage }))
);
const SearchPage = lazyWithRetry(() => import('./pages/SearchPage').then((m) => ({ default: m.SearchPage })));
const CategoriesPage = lazyWithRetry(() =>
  import('./pages/CategoriesPage').then((m) => ({ default: m.CategoriesPage }))
);
const CategorySchemeListPage = lazyWithRetry(() =>
  import('./pages/CategorySchemeListPage').then((m) => ({ default: m.CategorySchemeListPage }))
);
const SchemeDetailsPage = lazyWithRetry(() =>
  import('./pages/SchemeDetailsPage').then((m) => ({ default: m.SchemeDetailsPage }))
);
const SavedSchemesPage = lazyWithRetry(() =>
  import('./pages/SavedSchemesPage').then((m) => ({ default: m.SavedSchemesPage }))
);
const ChecklistPage = lazyWithRetry(() =>
  import('./pages/ChecklistPage').then((m) => ({ default: m.ChecklistPage }))
);
const EligibilityCheckerPage = lazyWithRetry(() =>
  import('./pages/EligibilityCheckerPage').then((m) => ({ default: m.EligibilityCheckerPage }))
);
const CompareSchemesPage = lazyWithRetry(() =>
  import('./pages/CompareSchemesPage').then((m) => ({ default: m.CompareSchemesPage }))
);
const AssistantPage = lazyWithRetry(() =>
  import('./pages/AssistantPage').then((m) => ({ default: m.AssistantPage }))
);
const ProfilePage = lazyWithRetry(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const SettingsPage = lazyWithRetry(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);
const NotFoundPage = lazyWithRetry(() =>
  import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage }))
);

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

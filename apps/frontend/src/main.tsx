import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from './router.js';
import { AuthProvider } from './auth/AuthContext.js';
import { OfflineNotice } from './components/ui/OfflineNotice.js';
import { initNativeShell } from './native/shell.js';
import i18n from './i18n/config.js';
import './index.css';

// Restore the reader's text-size preference before the first paint.
const savedScale = localStorage.getItem('bharatassist_text_scale');
if (savedScale && savedScale !== 'normal') {
  document.documentElement.dataset.textScale = savedScale;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

// Scheme content is served in the reader's language, so a language change
// invalidates every cached response — otherwise the interface switches and
// the scheme records stay in the language they were fetched in.
i18n.on('languageChanged', () => {
  queryClient.invalidateQueries();
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
        {/*
          Outside the router on purpose: losing the connection is a property
          of the device, not of the route, and the notice has to reach the
          landing and sign-in pages too. It renders nothing when online.
        */}
        <OfflineNotice />
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);

// Status bar, keyboard, hardware back and splash. A no-op in the browser,
// and deliberately after render() so the splash lifts on a painted frame
// rather than an empty one.
void initNativeShell();

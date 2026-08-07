import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from './router.js';
import { AuthProvider } from './auth/AuthContext.js';
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
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);

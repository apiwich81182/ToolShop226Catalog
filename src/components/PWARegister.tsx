'use client';

import { useEffect } from 'react';

export function PWARegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            // Check for updates on every load
            registration.update().catch(() => {});
          })
          .catch((err) => {
            console.debug('ServiceWorker registration skipped:', err);
          });
      });
    }
  }, []);

  return null;
}


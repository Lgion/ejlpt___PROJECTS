'use client';

import { useEffect } from 'react';
import { seedLocalDatabase } from '@/lib/db';

export function DatabaseSeeder() {
  useEffect(() => {
    seedLocalDatabase().catch((err) => {
      console.error('[DatabaseSeeder] Error initializing database:', err);
    });
  }, []);

  return null;
}

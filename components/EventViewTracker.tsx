'use client';

import { useEffect } from 'react';
import { pixel } from '@/lib/pixel';

export default function EventViewTracker({ eventTitle }: { eventTitle: string }) {
  useEffect(() => {
    pixel.viewEvent({ content_name: eventTitle });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

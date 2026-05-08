'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function BackButton({ className }: { className: string }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      className={`group ${className}`}
    >
      <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform duration-300" />
      BACK
    </button>
  );
}

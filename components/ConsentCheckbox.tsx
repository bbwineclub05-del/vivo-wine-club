'use client';

import { type ReactNode } from 'react';

interface ConsentCheckboxProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  /** required=true: submission must stay blocked until checked (e.g. Privacy Policy). required=false: optional, must never block submission (e.g. newsletter). */
  required: boolean;
  error?: string;
}

export default function ConsentCheckbox({ id, checked, onChange, label, required, error }: ConsentCheckboxProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-start gap-2.5">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-required={required}
          aria-invalid={!!error}
          className="mt-0.5 w-4 h-4 shrink-0 rounded border-[#e8d5d5] text-[#731515] accent-[#731515] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#731515] focus-visible:ring-offset-2 cursor-pointer"
        />
        <label
          htmlFor={id}
          className="text-[12px] text-[#4a2a2a] leading-relaxed cursor-pointer"
          style={{ fontFamily: 'var(--font-nunito)' }}
        >
          {label}
        </label>
      </div>
      {error && (
        <p className="text-[10px] text-[#731515] pl-[26px]" style={{ fontFamily: 'var(--font-nunito)' }}>
          {error}
        </p>
      )}
    </div>
  );
}

'use client';

import { ReactNode } from 'react';

type SocialIcon = {
  label: string;
  icon: ReactNode;
};

const socialIcons: SocialIcon[] = [
  {
    label: 'Facebook',
    icon: (
      <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M15.12 8.1h2.18V4.32A28.1 28.1 0 0 0 14.12 4c-3.14 0-5.29 1.97-5.29 5.59v3.34H5.36v4.23h3.47V24h4.26v-6.84h3.33l.53-4.23h-3.86V10c0-1.22.33-1.9 2.03-1.9Z" />
      </svg>
    ),
  },
  {
    label: 'Instagram',
    icon: (
      <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4.1" />
        <circle cx="17.35" cy="6.65" r="1.1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: 'X',
    icon: (
      <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M13.86 10.47 21.15 2h-1.73l-6.33 7.35L8.04 2H2.2l7.64 11.12L2.2 22h1.73l6.68-7.76L15.96 22h5.84l-7.94-11.53Zm-2.36 2.74-.77-1.11L4.57 3.3H7.2l4.97 7.11.77 1.11 6.48 9.27h-2.63l-5.29-7.58Z" />
      </svg>
    ),
  },
  {
    label: 'YouTube',
    icon: (
      <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.5 6.2a3 3 0 0 0-2.1-2.13C19.55 3.57 12 3.57 12 3.57s-7.55 0-9.4.5A3 3 0 0 0 .5 6.2 31.2 31.2 0 0 0 0 12a31.2 31.2 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.13c1.85.5 9.4.5 9.4.5s7.55 0 9.4-.5a3 3 0 0 0 2.1-2.13A31.2 31.2 0 0 0 24 12a31.2 31.2 0 0 0-.5-5.8ZM9.55 15.57V8.43L15.82 12l-6.27 3.57Z" />
      </svg>
    ),
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-white/75 px-5 py-6">
      <div className="mx-auto flex max-w-[92rem] flex-col items-center gap-3 text-center">
        <p className="text-sm font-medium text-slate-600">American University of Nigeria &copy; 2026</p>
        <div className="flex items-center justify-center gap-2" aria-label="American University of Nigeria social media">
          {socialIcons.map((item) => (
            <span
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white text-ink shadow-sm"
              key={item.label}
              title={item.label}
            >
              <span className="sr-only">{item.label}</span>
              {item.icon}
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
}

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const sans = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SITC Graduation Clearance',
  description: 'Graduation application, degree audit, and clearance workflow for AUN SITC.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={sans.variable}>
      <body>{children}</body>
    </html>
  );
}

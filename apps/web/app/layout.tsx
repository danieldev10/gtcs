import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SITC Graduation Clearance',
  description: 'Graduation application, degree audit, and clearance workflow for AUN SITC.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

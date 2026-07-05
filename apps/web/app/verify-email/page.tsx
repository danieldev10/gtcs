import { Suspense } from 'react';
import { VerifyEmailClient } from './verify-email-client';

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center px-5">
          <div className="rounded-lg border border-line bg-white px-4 py-3 text-sm font-medium text-ink shadow-soft">
            Verifying email
          </div>
        </main>
      }
    >
      <VerifyEmailClient />
    </Suspense>
  );
}

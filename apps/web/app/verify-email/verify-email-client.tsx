'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { SITC_SCHOOL_NAME } from '@gtcs/shared';
import { AuthSession, authRequest, saveAuthSession } from '../../src/lib/auth';
import { SchoolLogo } from '../school-logo';

type VerificationState =
  | { status: 'verifying' }
  | { status: 'verified'; userName: string }
  | { status: 'failed'; message: string };

export function VerifyEmailClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [state, setState] = useState<VerificationState>({ status: 'verifying' });

  useEffect(() => {
    if (!token) {
      setState({ status: 'failed', message: 'Verification token is missing.' });
      return;
    }

    authRequest<AuthSession & { message: string }>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
      .then((session) => {
        saveAuthSession(session);
        setState({
          status: 'verified',
          userName: session.user.name ?? session.user.email,
        });
      })
      .catch((caught) => {
        setState({
          status: 'failed',
          message: caught instanceof Error ? caught.message : 'Verification failed.',
        });
      });
  }, [token]);

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-8">
      <section className="w-full max-w-md rounded-lg border border-line bg-white p-6 text-center shadow-soft">
        <div className="flex justify-center">
          <SchoolLogo />
        </div>
        <p className="mt-4 text-sm font-semibold text-spruce">{SITC_SCHOOL_NAME}</p>

        {state.status === 'verifying' ? (
          <>
            <Loader2 aria-hidden className="mx-auto mt-6 h-8 w-8 animate-spin text-spruce" />
            <h1 className="mt-4 text-xl font-semibold text-ink">Verifying email</h1>
          </>
        ) : null}

        {state.status === 'verified' ? (
          <>
            <CheckCircle2 aria-hidden className="mx-auto mt-6 h-9 w-9 text-emerald-600" />
            <h1 className="mt-4 text-xl font-semibold text-ink">Email verified</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Welcome, {state.userName}. Your account is ready.
            </p>
            <a
              className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-spruce px-4 text-sm font-semibold text-white"
              href="/"
            >
              Open workspace
            </a>
          </>
        ) : null}

        {state.status === 'failed' ? (
          <>
            <XCircle aria-hidden className="mx-auto mt-6 h-9 w-9 text-red-600" />
            <h1 className="mt-4 text-xl font-semibold text-ink">Verification failed</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">{state.message}</p>
            <a
              className="mt-5 inline-flex h-10 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-semibold text-ink"
              href="/"
            >
              Back to sign in
            </a>
          </>
        ) : null}
      </section>
    </main>
  );
}

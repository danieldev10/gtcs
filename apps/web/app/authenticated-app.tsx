'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import {
  ArrowRight,
  Loader2,
  MailCheck,
} from 'lucide-react';
import graduationHero from '../src/Graduation.png';
import { apiBaseUrl } from '../src/lib/config';
import {
  AuthSession,
  AuthUser,
  authRequest,
  clearAuthSession,
  getStoredAccessToken,
  saveAuthSession,
} from '../src/lib/auth';
import { SchoolLogo } from './school-logo';
import { SiteFooter } from './site-footer';
import { StaffWorkspace } from './staff-workspace';
import { DashboardWorkspace } from './student-workspace';

type AuthState =
  | { status: 'checking' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; accessToken: string; user: AuthUser };

type AuthMode = 'login' | 'signup';

export function AuthenticatedApp() {
  const [authState, setAuthState] = useState<AuthState>({ status: 'checking' });

  useEffect(() => {
    const accessToken = getStoredAccessToken();

    if (!accessToken) {
      setAuthState({ status: 'anonymous' });
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5000);

    fetch(`${apiBaseUrl}/auth/me`, {
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Session expired.');
        }

        const user = (await response.json()) as AuthUser;
        setAuthState({ status: 'authenticated', accessToken, user });
      })
      .catch(() => {
        clearAuthSession();
        setAuthState({ status: 'anonymous' });
      })
      .finally(() => {
        window.clearTimeout(timeout);
      });

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  if (authState.status === 'checking') {
    return (
      <main className="flex min-h-screen items-center justify-center px-5">
        <div className="flex items-center gap-3 rounded-lg border border-line bg-white px-4 py-3 text-sm font-medium text-ink shadow-soft">
          <Loader2 aria-hidden className="h-4 w-4 animate-spin text-spruce" />
          Checking session
        </div>
      </main>
    );
  }

  if (authState.status === 'anonymous') {
    return (
      <AuthScreen
        onAuthenticated={(session) => {
          saveAuthSession(session);
          setAuthState({
            status: 'authenticated',
            accessToken: session.accessToken,
            user: session.user,
          });
        }}
      />
    );
  }

  const handleSignOut = () => {
    clearAuthSession();
    setAuthState({ status: 'anonymous' });
  };

  return authState.user.role === 'STUDENT' ? (
    <DashboardWorkspace accessToken={authState.accessToken} onSignOut={handleSignOut} user={authState.user} />
  ) : (
    <StaffWorkspace accessToken={authState.accessToken} onSignOut={handleSignOut} user={authState.user} />
  );
}

function AuthScreen({ onAuthenticated }: { onAuthenticated: (session: AuthSession) => void }) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [debugVerificationToken, setDebugVerificationToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    studentId: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const verificationHref = useMemo(
    () => (debugVerificationToken ? `/verify-email?token=${encodeURIComponent(debugVerificationToken)}` : null),
    [debugVerificationToken],
  );

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);

    try {
      const session = await authRequest<AuthSession>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(loginForm),
      });
      onAuthenticated(session);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setDebugVerificationToken(null);

    if (signupForm.password !== signupForm.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await authRequest<{
        message: string;
        emailSent: boolean;
        debug?: { verificationToken?: string };
      }>('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          firstName: signupForm.firstName,
          middleName: signupForm.middleName || undefined,
          lastName: signupForm.lastName,
          studentId: signupForm.studentId,
          email: signupForm.email,
          phone: signupForm.phone || undefined,
          password: signupForm.password,
        }),
      });

      setNotice(
        response.emailSent
          ? 'Account created. Check your email to verify your account before signing in.'
          : 'Account created. Email delivery is not available locally, so use the development verification link.',
      );
      setDebugVerificationToken(response.debug?.verificationToken ?? null);
      setMode('login');
      setLoginForm({ email: signupForm.email, password: '' });
      setSignupForm({
        firstName: '',
        middleName: '',
        lastName: '',
        studentId: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to create account.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col">
      <div className="flex-1 px-5 py-8">
        <div className="mx-auto grid min-h-[calc(100vh-9rem)] max-w-6xl items-center gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="relative h-44 overflow-hidden rounded-lg border border-line shadow-soft sm:h-64 lg:h-[440px] lg:self-center">
            <Image
              alt="American University of Nigeria graduates at commencement"
              className="object-cover"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 45vw"
              src={graduationHero}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/10" />
            <div className="absolute inset-x-0 bottom-0 flex items-center gap-4 p-6">
              <SchoolLogo size="lg" />
              <div>
                <p className="text-sm font-semibold text-white/90">American University of Nigeria</p>
                <h1 className="text-3xl font-semibold text-white">Graduation Clearance</h1>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-line border-t-4 border-t-spruce bg-white p-5 shadow-soft">
            <div className="grid grid-cols-2 rounded-md border border-line bg-mist p-1">
              <button
                className={`h-10 rounded-md text-sm font-semibold ${
                  mode === 'login' ? 'bg-white text-ink shadow-sm' : 'text-slate-600'
                }`}
                onClick={() => setMode('login')}
                type="button"
              >
                Sign in
              </button>
              <button
                className={`h-10 rounded-md text-sm font-semibold ${
                  mode === 'signup' ? 'bg-white text-ink shadow-sm' : 'text-slate-600'
                }`}
                onClick={() => setMode('signup')}
                type="button"
              >
                Create account
              </button>
            </div>

            {notice ? (
              <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                <div className="flex gap-2">
                  <MailCheck aria-hidden className="mt-0.5 h-4 w-4 flex-none" />
                  <div>
                    <p>{notice}</p>
                    {verificationHref ? (
                      <a className="mt-2 inline-flex font-semibold underline" href={verificationHref}>
                        Open development verification link
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {error ? <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

            {mode === 'login' ? (
              <form className="mt-5 grid gap-3" onSubmit={(event) => void handleLogin(event)}>
                <AuthInput
                  autoComplete="email"
                  label="Email"
                  onChange={(value) => setLoginForm((current) => ({ ...current, email: value }))}
                  type="email"
                  value={loginForm.email}
                />
                <AuthInput
                  autoComplete="current-password"
                  label="Password"
                  onChange={(value) => setLoginForm((current) => ({ ...current, password: value }))}
                  type="password"
                  value={loginForm.password}
                />
                <SubmitButton label="Sign in" loading={submitting} />
              </form>
            ) : (
              <form className="mt-5 grid gap-3" onSubmit={(event) => void handleSignup(event)}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <AuthInput
                    autoComplete="given-name"
                    label="First name"
                    onChange={(value) => setSignupForm((current) => ({ ...current, firstName: value }))}
                    value={signupForm.firstName}
                  />
                  <AuthInput
                    autoComplete="family-name"
                    label="Last name"
                    onChange={(value) => setSignupForm((current) => ({ ...current, lastName: value }))}
                    value={signupForm.lastName}
                  />
                </div>
                <AuthInput
                  autoComplete="additional-name"
                  label="Middle name"
                  onChange={(value) => setSignupForm((current) => ({ ...current, middleName: value }))}
                  required={false}
                  value={signupForm.middleName}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <AuthInput
                    autoComplete="off"
                    label="AUN Student ID"
                    maxLength={9}
                    onChange={(value) => setSignupForm((current) => ({ ...current, studentId: value.toUpperCase() }))}
                    placeholder="A00022937"
                    value={signupForm.studentId}
                  />
                  <AuthInput
                    autoComplete="email"
                    label="AUN email"
                    onChange={(value) => setSignupForm((current) => ({ ...current, email: value }))}
                    type="email"
                    value={signupForm.email}
                  />
                </div>
                <AuthInput
                  autoComplete="tel"
                  label="Phone"
                  onChange={(value) => setSignupForm((current) => ({ ...current, phone: value }))}
                  required={false}
                  value={signupForm.phone}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <AuthInput
                    autoComplete="new-password"
                    label="Password"
                    onChange={(value) => setSignupForm((current) => ({ ...current, password: value }))}
                    type="password"
                    value={signupForm.password}
                  />
                  <AuthInput
                    autoComplete="new-password"
                    label="Confirm password"
                    onChange={(value) => setSignupForm((current) => ({ ...current, confirmPassword: value }))}
                    type="password"
                    value={signupForm.confirmPassword}
                  />
                </div>
                <SubmitButton label="Create account" loading={submitting} />
              </form>
            )}
          </section>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}

function AuthInput({
  autoComplete,
  label,
  maxLength,
  onChange,
  placeholder,
  required = true,
  type = 'text',
  value,
}: {
  autoComplete?: string;
  label: string;
  maxLength?: number;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  value: string;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium text-ink">
      {label}
      <input
        autoComplete={autoComplete}
        className="h-10 rounded-md border border-line px-3 text-sm font-normal outline-none focus:border-spruce"
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        type={type}
        value={value}
      />
    </label>
  );
}

function SubmitButton({ label, loading }: { label: string; loading: boolean }) {
  return (
    <button
      className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-spruce px-3 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
      disabled={loading}
      type="submit"
    >
      {loading ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <ArrowRight aria-hidden className="h-4 w-4" />}
      {label}
    </button>
  );
}

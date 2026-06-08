import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ClipboardList,
  FileUp,
  GraduationCap,
  ShieldCheck,
} from 'lucide-react';
import { SITC_SCHOOL_NAME, sitcProgramTracks } from '@gtcs/shared';
import { apiBaseUrl } from '../src/lib/config';
import { DashboardClient } from './dashboard-client';

const workflow = [
  {
    label: 'Student',
    title: 'Application packet',
    detail: 'Profile, survey, documents, transcript courses',
    icon: ClipboardList,
  },
  {
    label: 'Audit',
    title: 'SITC requirements',
    detail: 'Catalog rules, in-progress courses, pending courses',
    icon: BookOpenCheck,
  },
  {
    label: 'Clearance',
    title: 'Office decisions',
    detail: 'Bursary, Chair, Dean, Registry, Provost',
    icon: ShieldCheck,
  },
];

export default function Home() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-line bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-spruce text-white">
              <GraduationCap aria-hidden className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-spruce">{SITC_SCHOOL_NAME}</p>
              <h1 className="text-xl font-semibold text-ink">Graduation Clearance</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-medium text-ink shadow-sm">
              <FileUp aria-hidden className="h-4 w-4" />
              Upload
            </button>
            <button className="inline-flex h-10 items-center gap-2 rounded-md bg-spruce px-3 text-sm font-semibold text-white shadow-sm">
              <CheckCircle2 aria-hidden className="h-4 w-4" />
              Start Application
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-lg border border-line bg-white p-5 shadow-soft">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium text-marigold">Fall/Spring pilot workspace</p>
              <h2 className="mt-1 text-2xl font-semibold text-ink">SITC-only digital clearance</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Applications, document uploads, degree audits, and multi-office approvals for the
                active graduation term.
              </p>
            </div>
            <div className="rounded-md bg-mist px-3 py-2 text-sm font-medium text-ink">
              {sitcProgramTracks.length} pathways
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {workflow.map((item) => (
              <article key={item.label} className="rounded-md border border-line bg-mist p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase text-spruce">{item.label}</span>
                  <item.icon aria-hidden className="h-5 w-5 text-spruce" />
                </div>
                <h3 className="mt-3 text-base font-semibold text-ink">{item.title}</h3>
                <p className="mt-1 text-sm leading-5 text-slate-600">{item.detail}</p>
              </article>
            ))}
          </div>
        </div>

        <DashboardClient />
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-8">
        <div className="rounded-lg border border-line bg-white p-5 shadow-soft">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-ink">Environment Connections</h2>
              <p className="mt-1 text-sm text-slate-600">
                Supabase Postgres, AWS S3, Google SMTP, Railway, and Vercel.
              </p>
            </div>
            <a
              className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink shadow-sm"
              href={`${apiBaseUrl}/health`}
              rel="noreferrer"
              target="_blank"
            >
              Open Health
              <ArrowRight aria-hidden className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

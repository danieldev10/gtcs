'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, RefreshCw } from 'lucide-react';
import { apiBaseUrl } from '../src/lib/config';

type SummaryResponse = {
  totalApplications: number;
  statusCounts: Record<string, number>;
  recentApplications: Array<{
    id: string;
    status: string;
    term: string;
    createdAt: string;
    student: {
      id: string;
      name: string;
      program: string;
    };
  }>;
  integrations: {
    database: boolean;
    s3: boolean;
    smtp: boolean;
  };
};

type ApplicationResponse = {
  id: string;
  status: string;
  term: string;
  student: {
    id: string;
    name: string;
    program: string;
  };
  documentCount: number;
  clearanceCount: number;
};

type DraftForm = {
  studentId: string;
  email: string;
  firstName: string;
  lastName: string;
  currentGpa: string;
};

const initialForm: DraftForm = {
  studentId: '',
  email: '',
  firstName: '',
  lastName: '',
  currentGpa: '',
};

type DashboardClientProps = {
  accessToken?: string;
};

export function DashboardClient({ accessToken }: DashboardClientProps) {
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [applications, setApplications] = useState<ApplicationResponse[]>([]);
  const [form, setForm] = useState<DraftForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queueItems = useMemo(
    () => [
      ['Draft applications', summary?.statusCounts.DRAFT ?? 0, 'Students preparing submissions'],
      ['Bursary pending', summary?.statusCounts.BURSARY_PENDING ?? 0, 'Financial clearance queue'],
      ['Chair review', summary?.statusCounts.CHAIR_REVIEW ?? 0, 'Academic decision queue'],
      ['Registry final', summary?.statusCounts.FINAL_REGISTRY_REVIEW ?? 0, 'Final clearance queue'],
    ],
    [summary],
  );

  async function loadDashboard() {
    setError(null);
    setLoading(true);

    try {
      const requestInit: RequestInit = {
        cache: 'no-store',
        headers: accessToken ? { authorization: `Bearer ${accessToken}` } : undefined,
      };
      const [summaryResponse, applicationsResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/dashboard/summary`, requestInit),
        fetch(`${apiBaseUrl}/applications`, requestInit),
      ]);

      if (!summaryResponse.ok || !applicationsResponse.ok) {
        throw new Error('The API did not return dashboard data.');
      }

      setSummary(await summaryResponse.json());
      setApplications(await applicationsResponse.json());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }

  async function createDraft() {
    setError(null);
    setSaving(true);

    try {
      const response = await fetch(`${apiBaseUrl}/applications/draft`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          ...form,
          currentGpa: form.currentGpa ? Number(form.currentGpa) : undefined,
          termName: 'Pilot Graduation Term',
        }),
      });

      if (!response.ok) {
        throw new Error('Draft application could not be created.');
      }

      setForm(initialForm);
      await loadDashboard();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to create draft application.');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, [accessToken]);

  return (
    <>
      <aside className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-ink">Review Queues</h2>
          <button
            aria-label="Refresh dashboard"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-white text-ink"
            onClick={() => void loadDashboard()}
            type="button"
          >
            <RefreshCw aria-hidden className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 grid gap-3">
          {queueItems.map(([label, count, detail]) => (
            <div
              className="flex items-center justify-between rounded-md border border-line px-3 py-3"
              key={label}
            >
              <div>
                <p className="text-sm font-medium text-ink">{label}</p>
                <p className="text-xs text-slate-500">{detail}</p>
              </div>
              <span className="text-xl font-semibold text-spruce">{count}</span>
            </div>
          ))}
        </div>
      </aside>

      <div className="grid gap-5 lg:col-span-2 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-lg border border-line bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-ink">New Draft</h2>
            {saving ? (
              <Loader2 aria-hidden className="h-5 w-5 animate-spin text-spruce" />
            ) : (
              <Plus aria-hidden className="h-5 w-5 text-spruce" />
            )}
          </div>
          <div className="mt-4 grid gap-3">
            <input
              className="h-10 rounded-md border border-line px-3 text-sm outline-none focus:border-spruce"
              onChange={(event) => setForm((current) => ({ ...current, studentId: event.target.value }))}
              placeholder="Student ID"
              value={form.studentId}
            />
            <input
              className="h-10 rounded-md border border-line px-3 text-sm outline-none focus:border-spruce"
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="AUN email"
              type="email"
              value={form.email}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                className="h-10 rounded-md border border-line px-3 text-sm outline-none focus:border-spruce"
                onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
                placeholder="First name"
                value={form.firstName}
              />
              <input
                className="h-10 rounded-md border border-line px-3 text-sm outline-none focus:border-spruce"
                onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
                placeholder="Last name"
                value={form.lastName}
              />
            </div>
            <input
              className="h-10 rounded-md border border-line px-3 text-sm outline-none focus:border-spruce"
              onChange={(event) => setForm((current) => ({ ...current, currentGpa: event.target.value }))}
              placeholder="Current GPA"
              type="number"
              value={form.currentGpa}
            />
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-spruce px-3 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
              disabled={saving || !form.studentId || !form.email || !form.firstName || !form.lastName}
              onClick={() => void createDraft()}
              type="button"
            >
              {saving ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Plus aria-hidden className="h-4 w-4" />}
              Create Draft
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-line bg-white p-5 shadow-soft">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-ink">Applications</h2>
              <p className="text-sm text-slate-500">
                {loading ? 'Loading' : `${summary?.totalApplications ?? applications.length} total`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {summary &&
                Object.entries(summary.integrations).map(([name, active]) => (
                  <span
                    className={`rounded-md px-2 py-1 text-xs font-semibold ${
                      active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                    }`}
                    key={name}
                  >
                    {name.toUpperCase()}
                  </span>
                ))}
            </div>
          </div>

          {error ? <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

          <div className="mt-4 overflow-hidden rounded-md border border-line">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-mist text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-3 font-semibold">Student</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Term</th>
                  <th className="px-3 py-3 font-semibold">Docs</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((application) => (
                  <tr className="border-t border-line" key={application.id}>
                    <td className="px-3 py-3">
                      <p className="font-medium text-ink">{application.student.name}</p>
                      <p className="text-xs text-slate-500">{application.student.id}</p>
                    </td>
                    <td className="px-3 py-3 text-slate-700">{application.status}</td>
                    <td className="px-3 py-3 text-slate-700">{application.term}</td>
                    <td className="px-3 py-3 text-slate-700">{application.documentCount}</td>
                  </tr>
                ))}
                {!loading && applications.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-center text-slate-500" colSpan={4}>
                      No applications yet
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

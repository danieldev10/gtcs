'use client';

import { ReactNode, useEffect, useMemo, useState } from 'react';
import { ExternalLink, FileText, Loader2, LogOut, RefreshCw, X } from 'lucide-react';
import { SITC_SCHOOL_NAME } from '@gtcs/shared';
import { apiBaseUrl } from '../src/lib/config';
import { AuthUser } from '../src/lib/auth';
import { SchoolLogo } from './school-logo';
import { SiteFooter } from './site-footer';

const staffRoles = [
  'BURSARY_OFFICER',
  'PROGRAM_CHAIR',
  'DEAN',
  'REGISTRY_OFFICER',
  'PROVOST',
  'ADMIN',
] as const;

type StaffRole = (typeof staffRoles)[number];

type StaffDocumentType =
  | 'JAMB_ADMISSION_LETTER'
  | 'JAMB_RESULT_SLIP'
  | 'NIN_SLIP'
  | 'CREDIT_AUDIT_SHEET'
  | 'UNOFFICIAL_TRANSCRIPT'
  | 'SUPPORTING_DOCUMENT';

type StaffDocument = {
  id: string;
  type: StaffDocumentType;
  originalName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  verifiedAt: string | null;
  createdAt: string;
};

type StaffApplication = {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  term: string;
  documentCount: number;
  clearanceCount: number;
  documents: StaffDocument[];
  bursaryPaymentRequest: {
    amount: number | null;
    currency: string;
    note: string;
    requestedAt: string | null;
    receiptUploaded: boolean;
    receiptUploadedAt: string | null;
  } | null;
  bursaryReceipt: {
    id: string;
    originalName: string | null;
    mimeType: string | null;
    sizeBytes: number | null;
    createdAt: string;
  } | null;
  student: {
    id: string;
    name: string;
    major: string;
  };
};

type StaffDashboard = {
  role: StaffRole;
  title: string;
  roleLabel: string;
  officeLabel: string;
  queueLabel: string;
  description: string;
  statuses: string[];
  activeQueueCount: number;
  statusCounts: Record<string, number>;
  queueApplications: StaffApplication[];
};

const statusLabels: Record<string, string> = {
  BURSARY_PENDING: 'Bursary pending',
  BURSARY_NOT_CLEARED: 'Bursary not cleared',
  BURSARY_CLEARED: 'Bursary cleared',
  CHAIR_REVIEW: 'Program chair review',
  CHAIR_NOT_CLEARED: 'Program chair not cleared',
  CHAIR_CLEARED: 'Program chair cleared',
  DEAN_REVIEW: 'Dean review',
  DEAN_NOT_CLEARED: 'Dean not cleared',
  DEAN_CLEARED: 'Dean cleared',
  REGISTRY_INTAKE_REVIEW: 'Registry intake review',
  WAITING_FOR_FINAL_GRADES: 'Waiting for final grades',
  FINAL_REGISTRY_REVIEW: 'Final registry review',
  PROVOST_REVIEW: 'Provost review',
  COMPLETED: 'Completed',
  NOT_CLEARED: 'Not cleared',
  RETURNED_TO_STUDENT: 'Returned to student',
  WITHDRAWN: 'Withdrawn',
  DRAFT: 'Draft',
};

const roleLabels: Record<string, string> = {
  BURSARY_OFFICER: 'Bursary Officer',
  PROGRAM_CHAIR: 'Program Chair',
  DEAN: 'Dean',
  REGISTRY_OFFICER: 'Registry Officer',
  PROVOST: 'Provost',
  ADMIN: 'Admin',
  STUDENT: 'Student',
};

const bursaryActionStatuses = new Set(['BURSARY_PENDING', 'BURSARY_NOT_CLEARED']);
type RegistryIntakeChecklistKey =
  | 'graduationRequirementsSatisfied'
  | 'jambAdmissionLetterAttached'
  | 'jambResultSlipAttached'
  | 'graduationSurveyCompleted'
  | 'ninSlipAttached'
  | 'creditAuditAttached'
  | 'unofficialTranscriptAttached';

type RegistryIntakeChecklistItem = {
  key: RegistryIntakeChecklistKey;
  label: string;
  documentType?: StaffDocumentType;
};

const registryIntakeChecklistItems: RegistryIntakeChecklistItem[] = [
  {
    key: 'graduationRequirementsSatisfied',
    label: 'Student has satisfied all graduation requirements',
  },
  {
    key: 'jambAdmissionLetterAttached',
    label: 'JAMB admission letter is attached',
    documentType: 'JAMB_ADMISSION_LETTER',
  },
  {
    key: 'jambResultSlipAttached',
    label: 'JAMB result slip is attached',
    documentType: 'JAMB_RESULT_SLIP',
  },
  {
    key: 'graduationSurveyCompleted',
    label: 'Graduation survey form is completed and attached',
  },
  {
    key: 'ninSlipAttached',
    label: 'NIN slip is attached',
    documentType: 'NIN_SLIP',
  },
  {
    key: 'creditAuditAttached',
    label: 'Credit audit is attached',
    documentType: 'CREDIT_AUDIT_SHEET',
  },
  {
    key: 'unofficialTranscriptAttached',
    label: 'Unofficial transcript is attached',
    documentType: 'UNOFFICIAL_TRANSCRIPT',
  },
] as const satisfies RegistryIntakeChecklistItem[];

type RegistryIntakeChecklistState = Record<RegistryIntakeChecklistKey, boolean>;

const emptyRegistryIntakeChecklist = Object.fromEntries(
  registryIntakeChecklistItems.map((item) => [item.key, false]),
) as RegistryIntakeChecklistState;

type StaffWorkspaceProps = {
  accessToken: string;
  onSignOut: () => void;
  user: AuthUser;
};

export function StaffWorkspace({ accessToken, onSignOut, user }: StaffWorkspaceProps) {
  const [dashboard, setDashboard] = useState<StaffDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAllowedRole = useMemo(() => staffRoles.includes(user.role as StaffRole), [user.role]);

  async function loadDashboard() {
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/dashboard/staff`, {
        cache: 'no-store',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.status === 401 || response.status === 403) {
        throw new Error('Your account does not have access to this dashboard.');
      }

      if (!response.ok) {
        throw new Error('The staff dashboard could not be loaded.');
      }

      setDashboard(await response.json());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load staff dashboard.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAllowedRole) {
      void loadDashboard();
    } else {
      setLoading(false);
    }
  }, [isAllowedRole, accessToken]);

  if (!isAllowedRole) {
    return (
      <RoleAccessShell onSignOut={onSignOut} user={user}>
        <div className="rounded-lg border border-line bg-white p-6 shadow-soft">
          <h2 className="text-xl font-semibold text-ink">Role not configured</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            This account signed in successfully, but its role is not connected to a dashboard yet.
          </p>
        </div>
      </RoleAccessShell>
    );
  }

  return (
    <RoleAccessShell onSignOut={onSignOut} user={user}>
      {loading ? (
        <div className="flex min-h-[420px] items-center justify-center rounded-lg border border-line bg-white shadow-soft">
          <div className="flex items-center gap-3 text-sm font-medium text-ink">
            <Loader2 aria-hidden className="h-4 w-4 animate-spin text-spruce" />
            Loading staff dashboard
          </div>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : dashboard ? (
        <div className="grid gap-5">
          <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-spruce">Staff workspace</p>
                <h2 className="mt-2 text-2xl font-semibold text-ink">{dashboard.title}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{dashboard.description}</p>
              </div>
              <button
                aria-label="Refresh staff dashboard"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink transition hover:bg-mist"
                onClick={() => void loadDashboard()}
                type="button"
              >
                <RefreshCw aria-hidden className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </section>

          <ApplicationTable
            accessToken={accessToken}
            applications={dashboard.queueApplications}
            emptyText="No applications are waiting in this queue."
            onRefresh={loadDashboard}
            role={dashboard.role}
            title="Current Queue"
          />
        </div>
      ) : null}
    </RoleAccessShell>
  );
}

function RoleAccessShell({
  children,
  onSignOut,
  user,
}: {
  children: ReactNode;
  onSignOut: () => void;
  user: AuthUser;
}) {
  return (
    <main className="flex min-h-screen flex-col">
      <header className="border-b border-line bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <SchoolLogo size="sm" />
            <div>
              <p className="text-sm font-medium text-spruce">{SITC_SCHOOL_NAME}</p>
              <h1 className="text-xl font-semibold text-ink">Graduation Clearance</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-pill border border-line bg-mist px-3 py-1.5 text-sm font-semibold text-ink">
              {roleLabels[user.role] ?? user.role}
            </div>
            <div className="rounded-pill border border-line bg-white px-3 py-1.5 text-sm text-slate-600">
              {user.email}
            </div>
            <button
              className="inline-flex h-9 items-center gap-2 rounded-pill border border-line bg-white px-3 text-sm font-medium text-ink transition hover:bg-mist"
              onClick={onSignOut}
              type="button"
            >
              <LogOut aria-hidden className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </header>
      <section className="mx-auto w-full max-w-7xl flex-1 px-5 py-6">{children}</section>
      <SiteFooter />
    </main>
  );
}

function ApplicationTable({
  accessToken,
  applications,
  emptyText,
  onRefresh,
  role,
  title,
}: {
  accessToken: string;
  applications: StaffApplication[];
  emptyText: string;
  onRefresh: () => Promise<void>;
  role: StaffRole;
  title: string;
}) {
  const [reviewApplication, setReviewApplication] = useState<StaffApplication | null>(null);
  const canUseBursaryActions = role === 'BURSARY_OFFICER' || role === 'ADMIN';
  const canUseRegistryActions = role === 'REGISTRY_OFFICER' || role === 'ADMIN';
  const canUseChairActions = role === 'PROGRAM_CHAIR' || role === 'ADMIN';
  const canUseDeanActions = role === 'DEAN' || role === 'ADMIN';
  const canUseProvostActions = role === 'PROVOST' || role === 'ADMIN';
  const showActionColumn = applications.some(
    (application) =>
      (canUseBursaryActions && bursaryActionStatuses.has(application.status)) ||
      (canUseRegistryActions && application.status === 'REGISTRY_INTAKE_REVIEW') ||
      (canUseRegistryActions && application.status === 'FINAL_REGISTRY_REVIEW') ||
      (canUseChairActions && application.status === 'CHAIR_REVIEW') ||
      (canUseDeanActions && application.status === 'DEAN_REVIEW') ||
      (canUseProvostActions && application.status === 'PROVOST_REVIEW'),
  );

  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <p className="text-sm text-slate-500">{applications.length} application{applications.length === 1 ? '' : 's'}</p>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-md border border-line">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-mist text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-3 font-semibold">Student</th>
              <th className="px-3 py-3 font-semibold">Major</th>
              <th className="px-3 py-3 font-semibold">Status</th>
              <th className="px-3 py-3 font-semibold">Term</th>
              <th className="px-3 py-3 font-semibold">Docs</th>
              <th className="px-3 py-3 font-semibold">Submitted</th>
              {showActionColumn ? <th className="px-3 py-3 font-semibold">Action</th> : null}
            </tr>
          </thead>
          <tbody>
            {applications.map((application) => {
              const actionable =
                (canUseBursaryActions && bursaryActionStatuses.has(application.status)) ||
                (canUseRegistryActions && application.status === 'REGISTRY_INTAKE_REVIEW') ||
                (canUseRegistryActions && application.status === 'FINAL_REGISTRY_REVIEW') ||
                (canUseChairActions && application.status === 'CHAIR_REVIEW') ||
                (canUseDeanActions && application.status === 'DEAN_REVIEW') ||
                (canUseProvostActions && application.status === 'PROVOST_REVIEW');

              return (
                <tr className="border-t border-line" key={application.id}>
                  <td className="px-3 py-3">
                    <p className="font-medium text-ink">{application.student.name}</p>
                    <p className="text-xs text-slate-500">{application.student.id}</p>
                  </td>
                  <td className="px-3 py-3 text-slate-700">{application.student.major}</td>
                  <td className="px-3 py-3 font-medium text-ink">{formatStatus(application.status)}</td>
                  <td className="px-3 py-3 text-slate-700">{application.term}</td>
                  <td className="px-3 py-3 text-slate-700">{application.documentCount}</td>
                  <td className="px-3 py-3 text-slate-700">{formatDate(application.submittedAt)}</td>
                  {showActionColumn ? (
                    <td className="px-3 py-3">
                      {actionable ? (
                        <button
                          className="inline-flex h-9 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink transition hover:bg-mist"
                          onClick={() => setReviewApplication(application)}
                          type="button"
                        >
                          <FileText aria-hidden className="h-4 w-4" />
                          Review
                        </button>
                      ) : null}
                    </td>
                  ) : null}
                </tr>
              );
            })}
            {applications.length === 0 ? (
              <tr>
                <td className="px-3 py-8 text-center text-slate-500" colSpan={showActionColumn ? 7 : 6}>
                  {emptyText}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {reviewApplication ? (
        <ReviewActionModal
          accessToken={accessToken}
          application={reviewApplication}
          onChanged={async () => {
            await onRefresh();
            setReviewApplication(null);
          }}
          onClose={() => setReviewApplication(null)}
          role={role}
        />
      ) : null}
    </section>
  );
}

function ReviewActionModal({
  accessToken,
  application,
  onChanged,
  onClose,
  role,
}: {
  accessToken: string;
  application: StaffApplication;
  onChanged: () => Promise<void>;
  onClose: () => void;
  role: StaffRole;
}) {
  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm sm:p-8"
      onClick={onClose}
      role="dialog"
    >
      <div className="my-4 w-full max-w-2xl rounded-lg border border-line bg-white shadow-soft" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-line p-5">
          <div>
            <p className="text-xs font-semibold uppercase text-spruce">Application review</p>
            <h2 className="mt-1 text-xl font-semibold text-ink">{application.student.name}</h2>
            <p className="mt-1 text-sm text-slate-600">
              {application.student.id} • {formatStatus(application.status)}
            </p>
          </div>
          <button
            aria-label="Close review"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-ink transition hover:bg-mist"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-4 p-5">
          <div className="grid gap-3 rounded-md border border-line bg-mist/50 p-3 text-sm sm:grid-cols-2">
            <ReviewMeta label="Major" value={application.student.major} />
            <ReviewMeta label="Term" value={application.term} />
            <ReviewMeta label="Documents" value={String(application.documentCount)} />
            <ReviewMeta label="Submitted" value={formatDate(application.submittedAt)} />
          </div>

          <StaffActionForm
            accessToken={accessToken}
            application={application}
            onChanged={onChanged}
            role={role}
          />
        </div>
      </div>
    </div>
  );
}

function ReviewMeta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 font-medium text-ink">{value}</p>
    </div>
  );
}

function StaffActionForm({
  accessToken,
  application,
  onChanged,
  role,
}: {
  accessToken: string;
  application: StaffApplication;
  onChanged: () => Promise<void>;
  role: StaffRole;
}) {
  const canUseBursaryActions = role === 'BURSARY_OFFICER' || role === 'ADMIN';
  const canUseRegistryActions = role === 'REGISTRY_OFFICER' || role === 'ADMIN';
  const canUseChairActions = role === 'PROGRAM_CHAIR' || role === 'ADMIN';
  const canUseDeanActions = role === 'DEAN' || role === 'ADMIN';
  const canUseProvostActions = role === 'PROVOST' || role === 'ADMIN';

  if (canUseBursaryActions && bursaryActionStatuses.has(application.status)) {
    return <BursaryActions accessToken={accessToken} application={application} onChanged={onChanged} />;
  }

  if (canUseRegistryActions && application.status === 'REGISTRY_INTAKE_REVIEW') {
    return <RegistryIntakeActions accessToken={accessToken} application={application} onChanged={onChanged} />;
  }

  if (canUseRegistryActions && application.status === 'FINAL_REGISTRY_REVIEW') {
    return <FinalRegistryActions accessToken={accessToken} application={application} onChanged={onChanged} />;
  }

  if (canUseChairActions && application.status === 'CHAIR_REVIEW') {
    return (
      <AcademicDecisionActions
        accessToken={accessToken}
        application={application}
        endpointSegment="program-chair"
        label="Program Chair"
        onChanged={onChanged}
      />
    );
  }

  if (canUseDeanActions && application.status === 'DEAN_REVIEW') {
    return (
      <AcademicDecisionActions
        accessToken={accessToken}
        application={application}
        endpointSegment="dean"
        label="Dean"
        onChanged={onChanged}
      />
    );
  }

  if (canUseProvostActions && application.status === 'PROVOST_REVIEW') {
    return <ProvostSignoffActions accessToken={accessToken} application={application} onChanged={onChanged} />;
  }

  return (
    <p className="rounded-md border border-line bg-mist p-3 text-sm text-slate-600">
      No action is available for this application in your current role.
    </p>
  );
}

function BursaryActions({
  accessToken,
  application,
  onChanged,
}: {
  accessToken: string;
  application: StaffApplication;
  onChanged: () => Promise<void>;
}) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [financiallyCleared, setFinanciallyCleared] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function requestPayment() {
    setBusyAction('payment');
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`${apiBaseUrl}/applications/${application.id}/bursary/payment-request`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          currency: 'NGN',
          note,
        }),
      });
      const body = (await response.json().catch(() => null)) as { emailSent?: boolean; message?: string } | null;

      if (!response.ok) {
        throw new Error(body?.message ?? 'Unable to send payment request.');
      }

      setAmount('');
      setNote('');
      setNotice(body?.emailSent === false ? 'Payment request saved, but email was not sent.' : 'Payment request emailed.');
      await onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to request payment.');
    } finally {
      setBusyAction(null);
    }
  }

  async function clearBursary() {
    setBusyAction('clear');
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`${apiBaseUrl}/applications/${application.id}/bursary/clear`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          financiallyCleared,
          remarks,
        }),
      });
      const body = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        throw new Error(body?.message ?? 'Unable to clear this application.');
      }

      setRemarks('');
      setFinanciallyCleared(false);
      setNotice('Bursary signoff completed.');
      await onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to clear Bursary.');
    } finally {
      setBusyAction(null);
    }
  }

  async function openReceipt() {
    if (!application.bursaryReceipt) {
      return;
    }

    setBusyAction('receipt');
    setError(null);

    try {
      const response = await fetch(
        `${apiBaseUrl}/applications/${application.id}/documents/${application.bursaryReceipt.id}/download`,
        {
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
        },
      );
      const body = (await response.json().catch(() => null)) as { downloadUrl?: string; message?: string } | null;

      if (!response.ok || !body?.downloadUrl) {
        throw new Error(body?.message ?? 'Unable to open receipt.');
      }

      window.open(body.downloadUrl, '_blank', 'noopener,noreferrer');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to open receipt.');
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="grid gap-3">
      {application.bursaryPaymentRequest ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
          <p className="font-semibold">
            Payment requested: {formatCurrency(application.bursaryPaymentRequest.amount, application.bursaryPaymentRequest.currency)}
          </p>
          <p className="mt-1">{application.bursaryPaymentRequest.note}</p>
          <p className="mt-1">
            Receipt: {application.bursaryReceipt ? application.bursaryReceipt.originalName ?? 'Uploaded receipt' : 'Not uploaded yet'}
          </p>
        </div>
      ) : null}

      <div className="grid gap-2">
        <input
          className="h-9 rounded-md border border-line px-3 text-sm outline-none focus:border-spruce"
          min="1"
          onChange={(event) => setAmount(event.target.value)}
          placeholder="Outstanding amount"
          type="number"
          value={amount}
        />
        <textarea
          className="min-h-16 rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-spruce"
          onChange={(event) => setNote(event.target.value)}
          placeholder="Payment details for the student"
          value={note}
        />
        <button
          className="inline-flex h-9 items-center justify-center rounded-md border border-amber-200 bg-amber-50 px-3 text-sm font-semibold text-amber-900 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={busyAction !== null || !amount || note.trim().length < 3}
          onClick={() => void requestPayment()}
          type="button"
        >
          {busyAction === 'payment' ? 'Sending...' : 'Request payment'}
        </button>
      </div>

      {application.bursaryReceipt ? (
        <button
          className="inline-flex h-9 items-center justify-center rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-60"
          disabled={busyAction !== null}
          onClick={() => void openReceipt()}
          type="button"
        >
          {busyAction === 'receipt' ? 'Opening...' : 'Open receipt'}
        </button>
      ) : null}

      <div className="grid gap-2">
        <label className="flex items-start gap-2 rounded-md border border-line bg-white p-3 text-sm font-medium text-ink">
          <input
            checked={financiallyCleared}
            className="mt-1"
            onChange={(event) => setFinanciallyCleared(event.target.checked)}
            type="checkbox"
          />
          <span>Student is financially cleared to graduate.</span>
        </label>
        <textarea
          className="min-h-14 rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-spruce"
          onChange={(event) => setRemarks(event.target.value)}
          placeholder="Bursary remarks"
          value={remarks}
        />
        <button
          className="inline-flex h-9 items-center justify-center rounded-md bg-spruce px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={busyAction !== null || !financiallyCleared || remarks.trim().length < 3}
          onClick={() => void clearBursary()}
          type="button"
        >
          {busyAction === 'clear' ? 'Clearing...' : 'Cleared / sign off'}
        </button>
      </div>

      {notice ? <p className="rounded-md bg-emerald-50 p-2 text-xs font-medium text-emerald-800">{notice}</p> : null}
      {error ? <p className="rounded-md bg-red-50 p-2 text-xs font-medium text-red-700">{error}</p> : null}
    </div>
  );
}

function RegistryIntakeActions({
  accessToken,
  application,
  onChanged,
}: {
  accessToken: string;
  application: StaffApplication;
  onChanged: () => Promise<void>;
}) {
  const [checklist, setChecklist] = useState<RegistryIntakeChecklistState>({ ...emptyRegistryIntakeChecklist });
  const [remarks, setRemarks] = useState('');
  const [busyAction, setBusyAction] = useState<'clear' | 'request' | null>(null);
  const [openingDocumentId, setOpeningDocumentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const checklistComplete = registryIntakeChecklistItems.every((item) => checklist[item.key]);
  const missingDocumentTypes = registryIntakeChecklistItems
    .filter((item) => item.documentType && !checklist[item.key])
    .map((item) => item.documentType as StaffDocumentType);

  function updateChecklistItem(key: RegistryIntakeChecklistKey, checked: boolean) {
    setChecklist((current) => ({
      ...current,
      [key]: checked,
    }));
  }

  async function openDocument(document: StaffDocument) {
    setOpeningDocumentId(document.id);
    setError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/applications/${application.id}/documents/${document.id}/download`, {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });
      const body = (await response.json().catch(() => null)) as { downloadUrl?: string; message?: string } | null;

      if (!response.ok || !body?.downloadUrl) {
        throw new Error(body?.message ?? 'Unable to open this document.');
      }

      window.open(body.downloadUrl, '_blank', 'noopener,noreferrer');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to open this document.');
    } finally {
      setOpeningDocumentId(null);
    }
  }

  async function requestCompleteDocuments() {
    setBusyAction('request');
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`${apiBaseUrl}/applications/${application.id}/registry/intake/document-request`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          ...checklist,
          remarks,
        }),
      });
      const body = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        throw new Error(body?.message ?? 'Unable to request complete documents.');
      }

      setNotice('Document request sent to the student.');
      await onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to request complete documents.');
    } finally {
      setBusyAction(null);
    }
  }

  async function clearRegistryIntake() {
    setBusyAction('clear');
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`${apiBaseUrl}/applications/${application.id}/registry/intake/clear`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          ...checklist,
          remarks: remarks || undefined,
        }),
      });
      const body = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        throw new Error(body?.message ?? 'Unable to clear Registry intake.');
      }

      setChecklist({ ...emptyRegistryIntakeChecklist });
      setRemarks('');
      setNotice('Registry intake signoff completed.');
      await onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to clear Registry intake.');
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="grid gap-3">
      <div className="rounded-md border border-sky-100 bg-sky-50 p-3 text-xs leading-5 text-sky-900">
        <p className="font-semibold">Academic Registry intake</p>
        <p className="mt-1">Complete the Section C checks before sending this application to SITC.</p>
      </div>

      <div className="grid gap-2">
        {registryIntakeChecklistItems.map((item) => {
          const document = item.documentType ? findLatestDocumentByType(application, item.documentType) : null;

          return (
            <div className="flex items-center justify-between gap-3 rounded-md border border-line bg-white px-3 py-2 text-sm text-ink" key={item.key}>
              <label className="flex min-w-0 flex-1 items-start gap-2">
                <input
                  checked={checklist[item.key]}
                  className="mt-1"
                  onChange={(event) => updateChecklistItem(item.key, event.target.checked)}
                  type="checkbox"
                />
                <span>{item.label}</span>
              </label>
              {item.documentType ? (
                <button
                  className="inline-flex h-8 flex-none items-center justify-center gap-1.5 rounded-md border border-line bg-white px-2.5 text-xs font-semibold text-ink transition hover:bg-mist disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!document || openingDocumentId !== null}
                  onClick={() => {
                    if (document) {
                      void openDocument(document);
                    }
                  }}
                  type="button"
                >
                  {openingDocumentId === document?.id ? (
                    <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ExternalLink aria-hidden className="h-3.5 w-3.5" />
                  )}
                  {document ? 'View' : 'No file'}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      <textarea
        className="min-h-14 rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-spruce"
        onChange={(event) => setRemarks(event.target.value)}
        placeholder={checklistComplete ? 'Registry remarks optional' : 'Explain the missing or incorrect documents'}
        value={remarks}
      />

      {checklistComplete ? (
        <button
          className="inline-flex h-9 items-center justify-center rounded-md bg-spruce px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={busyAction !== null}
          onClick={() => void clearRegistryIntake()}
          type="button"
        >
          {busyAction === 'clear' ? 'Clearing...' : 'Registry sign off'}
        </button>
      ) : (
        <button
          className="inline-flex h-9 items-center justify-center rounded-md border border-amber-200 bg-amber-50 px-3 text-sm font-semibold text-amber-900 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={busyAction !== null || missingDocumentTypes.length === 0 || remarks.trim().length < 3}
          onClick={() => void requestCompleteDocuments()}
          type="button"
        >
          {busyAction === 'request' ? 'Sending request...' : 'Request Complete Documents'}
        </button>
      )}
      {!checklistComplete && missingDocumentTypes.length === 0 ? (
        <p className="text-xs leading-5 text-slate-500">
          Untick at least one document-backed item before requesting document corrections.
        </p>
      ) : null}

      {notice ? <p className="rounded-md bg-emerald-50 p-2 text-xs font-medium text-emerald-800">{notice}</p> : null}
      {error ? <p className="rounded-md bg-red-50 p-2 text-xs font-medium text-red-700">{error}</p> : null}
    </div>
  );
}

function findLatestDocumentByType(application: StaffApplication, documentType: StaffDocumentType) {
  return application.documents.find((document) => document.type === documentType) ?? null;
}

function FinalRegistryActions({
  accessToken,
  application,
  onChanged,
}: {
  accessToken: string;
  application: StaffApplication;
  onChanged: () => Promise<void>;
}) {
  const [completionTerm, setCompletionTerm] = useState<'Fall' | 'Spring' | 'Summer' | ''>('');
  const [finalGpa, setFinalGpa] = useState('');
  const [degreeHonors, setDegreeHonors] = useState('');
  const [comments, setComments] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const finalGpaValue = Number(finalGpa);
  const finalGpaIsValid = finalGpa.trim().length > 0 && Number.isFinite(finalGpaValue) && finalGpaValue >= 0 && finalGpaValue <= 4;

  async function submitFinalRegistry() {
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`${apiBaseUrl}/applications/${application.id}/registry/final/decision`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          completionTerm,
          finalGpa,
          degreeHonors,
          comments: comments || undefined,
        }),
      });
      const body = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        throw new Error(body?.message ?? 'Unable to save Final Registry review.');
      }

      setCompletionTerm('');
      setFinalGpa('');
      setDegreeHonors('');
      setComments('');
      setNotice('Final Registry review saved and sent to Provost.');
      await onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save Final Registry review.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3">
      <div className="rounded-md border border-sky-100 bg-sky-50 p-3 text-xs leading-5 text-sky-900">
        <p className="font-semibold">Final Registry review</p>
        <p className="mt-1">Record the final graduation details before sending this application to Provost.</p>
      </div>

      <fieldset className="grid gap-2">
        <legend className="text-xs font-semibold uppercase text-slate-500">Degree requirement completed in</legend>
        {(['Fall', 'Spring', 'Summer'] as const).map((term) => (
          <label className="flex items-center gap-2 rounded-md border border-line bg-white p-3 text-sm font-medium text-ink" key={term}>
            <input
              checked={completionTerm === term}
              name={`${application.id}-completion-term`}
              onChange={() => setCompletionTerm(term)}
              type="radio"
            />
            <span>{term}</span>
          </label>
        ))}
      </fieldset>

      <input
        className="h-9 rounded-md border border-line px-3 text-sm outline-none focus:border-spruce"
        max="4"
        min="0"
        onChange={(event) => setFinalGpa(event.target.value)}
        placeholder="Final GPA"
        step="0.01"
        type="number"
        value={finalGpa}
      />

      <input
        className="h-9 rounded-md border border-line px-3 text-sm outline-none focus:border-spruce"
        onChange={(event) => setDegreeHonors(event.target.value)}
        placeholder="Class of Degree / Degree Honors"
        value={degreeHonors}
      />

      <textarea
        className="min-h-16 rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-spruce"
        onChange={(event) => setComments(event.target.value)}
        placeholder="Comments"
        value={comments}
      />

      <button
        className="inline-flex h-9 items-center justify-center rounded-md bg-spruce px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        disabled={busy || !completionTerm || !finalGpaIsValid || degreeHonors.trim().length < 1}
        onClick={() => void submitFinalRegistry()}
        type="button"
      >
        {busy ? 'Saving...' : 'Send to Provost'}
      </button>

      {notice ? <p className="rounded-md bg-emerald-50 p-2 text-xs font-medium text-emerald-800">{notice}</p> : null}
      {error ? <p className="rounded-md bg-red-50 p-2 text-xs font-medium text-red-700">{error}</p> : null}
    </div>
  );
}

function AcademicDecisionActions({
  accessToken,
  application,
  endpointSegment,
  label,
  onChanged,
}: {
  accessToken: string;
  application: StaffApplication;
  endpointSegment: 'program-chair' | 'dean';
  label: 'Program Chair' | 'Dean';
  onChanged: () => Promise<void>;
}) {
  const [decision, setDecision] = useState<'CLEARED' | 'NOT_CLEARED' | ''>('');
  const [comments, setComments] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submitDecision() {
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`${apiBaseUrl}/applications/${application.id}/${endpointSegment}/decision`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          decision,
          comments,
        }),
      });
      const body = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        throw new Error(body?.message ?? `Unable to save ${label} decision.`);
      }

      const noticeText =
        decision === 'CLEARED'
          ? `${label} signoff completed.`
          : `${label} marked this application as not cleared.`;

      setDecision('');
      setComments('');
      setNotice(noticeText);
      await onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : `Unable to save ${label} decision.`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3">
      <div className="rounded-md border border-emerald-100 bg-emerald-50 p-3 text-xs leading-5 text-emerald-900">
        <p className="font-semibold">{label} review</p>
        <p className="mt-1">Choose a decision and add a comment before saving this review.</p>
      </div>

      <div className="grid gap-2">
        <label className="flex items-start gap-2 rounded-md border border-line bg-white p-3 text-sm font-medium text-ink">
          <input
            checked={decision === 'CLEARED'}
            className="mt-1"
            name={`${application.id}-${endpointSegment}-decision`}
            onChange={() => setDecision('CLEARED')}
            type="radio"
          />
          <span>Cleared</span>
        </label>
        <label className="flex items-start gap-2 rounded-md border border-line bg-white p-3 text-sm font-medium text-ink">
          <input
            checked={decision === 'NOT_CLEARED'}
            className="mt-1"
            name={`${application.id}-${endpointSegment}-decision`}
            onChange={() => setDecision('NOT_CLEARED')}
            type="radio"
          />
          <span>Not cleared</span>
        </label>
      </div>

      <textarea
        className="min-h-16 rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-spruce"
        onChange={(event) => setComments(event.target.value)}
        placeholder={`${label} comment`}
        value={comments}
      />

      <button
        className="inline-flex h-9 items-center justify-center rounded-md bg-spruce px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        disabled={busy || !decision || comments.trim().length < 3}
        onClick={() => void submitDecision()}
        type="button"
      >
        {busy ? 'Saving...' : 'Save decision'}
      </button>

      {notice ? <p className="rounded-md bg-emerald-50 p-2 text-xs font-medium text-emerald-800">{notice}</p> : null}
      {error ? <p className="rounded-md bg-red-50 p-2 text-xs font-medium text-red-700">{error}</p> : null}
    </div>
  );
}

function ProvostSignoffActions({
  accessToken,
  application,
  onChanged,
}: {
  accessToken: string;
  application: StaffApplication;
  onChanged: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function signOff() {
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`${apiBaseUrl}/applications/${application.id}/provost/signoff`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json',
        },
      });
      const body = (await response.json().catch(() => null)) as { emailSent?: boolean; message?: string } | null;

      if (!response.ok) {
        throw new Error(body?.message ?? 'Unable to complete Provost signoff.');
      }

      setNotice(
        body?.emailSent === false
          ? 'Application completed, but the student email was not sent.'
          : 'Application completed and student notified.',
      );
      await onChanged();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to complete Provost signoff.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3">
      <div className="rounded-md border border-emerald-100 bg-emerald-50 p-3 text-xs leading-5 text-emerald-900">
        <p className="font-semibold">Provost final approval</p>
        <p className="mt-1">Sign off to complete this application and notify the student.</p>
      </div>

      <button
        className="inline-flex h-9 items-center justify-center rounded-md bg-spruce px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        disabled={busy}
        onClick={() => void signOff()}
        type="button"
      >
        {busy ? 'Signing off...' : 'Sign off'}
      </button>

      {notice ? <p className="rounded-md bg-emerald-50 p-2 text-xs font-medium text-emerald-800">{notice}</p> : null}
      {error ? <p className="rounded-md bg-red-50 p-2 text-xs font-medium text-red-700">{error}</p> : null}
    </div>
  );
}

function formatStatus(status: string) {
  return statusLabels[status] ?? status.replaceAll('_', ' ').toLowerCase();
}

function formatDate(value: string | null) {
  if (!value) {
    return 'Not submitted';
  }

  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatCurrency(amount: number | null, currency: string) {
  if (amount === null) {
    return currency;
  }

  return `${currency} ${amount.toLocaleString('en-US')}`;
}

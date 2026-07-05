import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { DashboardWorkspace } from './student-workspace';

const profileResponse = {
  id: 'profile-1',
  email: 'ada@aun.edu.ng',
  studentId: 'A00022937',
  firstName: 'Ada',
  middleName: null,
  lastName: 'Lovelace',
  school: 'School of Information Technology and Communication',
  major: 'Software Engineering',
  majorCode: 'SE',
  catalogYearLabel: '2022-2026',
  expectedGraduationTerm: 'Fall 2026',
  concentration: null,
  minor: null,
  currentGpa: 3.75,
  phone: '+2348012345678',
  shippingAddress: 'AUN Campus',
  parentGuardian: {
    name: 'Annabella Milbanke',
    relationship: 'Parent',
    phone: '+2348099999999',
    email: null,
  },
  updatedAt: '2026-06-10T20:00:00.000Z',
};

const applicationResponse = {
  id: 'application-1',
  status: 'DRAFT',
  term: 'Fall 2026',
  createdAt: '2026-06-10T20:00:00.000Z',
  updatedAt: '2026-06-10T20:00:00.000Z',
  submittedAt: null,
  nameOnCertificate: 'Ada Lovelace',
  certificateMailingAddress: 'AUN Campus',
  openErpChecks: {
    concentrationDeclared: 'YES',
    majorAccurate: 'YES',
    concentrationAccurate: 'YES',
    minorAccurate: 'YES',
    fullNameAccurate: 'YES',
    dateOfBirthAccurate: 'YES',
    genderAccurate: 'YES',
    stateOfOriginAccurate: 'YES',
    catalogYearAccurate: 'YES',
  },
  studentRemarks: null,
  studentAttestationAcceptedAt: '2026-06-10T20:00:00.000Z',
  formComplete: true,
  documentCount: 0,
  surveySubmitted: false,
  workflowLog: [],
  profile: {
    studentId: 'A00022937',
    name: 'Ada Lovelace',
    major: 'Software Engineering',
    majorCode: 'SE',
    catalogYear: '2022-2026',
    currentGpa: 3.75,
  },
};

const submittedApplicationResponse = {
  ...applicationResponse,
  status: 'BURSARY_PENDING',
  submittedAt: '2026-06-13T04:20:00.000Z',
  updatedAt: '2026-06-13T04:20:00.000Z',
  documentCount: 5,
  surveySubmitted: true,
  workflowLog: [
    {
      id: 'log-1',
      action: 'SUBMITTED',
      actor: {
        email: 'ada@aun.edu.ng',
        id: 'user-1',
        name: 'Ada Lovelace',
        role: 'STUDENT',
      },
      createdAt: '2026-06-13T04:20:00.000Z',
      metadata: {
        status: 'BURSARY_PENDING',
      },
    },
  ],
};

const documentsResponse = {
  applicationId: 'application-1',
  requiredComplete: true,
  documentCount: 5,
  requiredDocuments: [
    {
      type: 'JAMB_ADMISSION_LETTER',
      label: 'JAMB admission letter',
      description: 'Official admission letter used to confirm entry record.',
      required: true,
      uploaded: true,
      upload: {
        id: 'doc-1',
        type: 'JAMB_ADMISSION_LETTER',
        originalName: 'jamb-admission.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 12000,
        verifiedAt: null,
        createdAt: '2026-06-13T04:00:00.000Z',
      },
    },
  ],
  documents: [],
};

const surveyResponse = {
  applicationId: 'application-1',
  submittedAt: '2026-06-13T04:10:00.000Z',
  answers: {
    immediatePlan: 'NYSC',
    attendCommencement: 'YES',
    attendSeniorWeek: 'MAYBE',
    commencementTicketSuggestion: '6',
    awardsDinnerTicketSuggestion: '4',
    commencementInfoMethod: 'EMAIL',
    guestLodgingPreference: 'AUN_HOTEL',
    townTransportPlan: 'PERSONAL_CAR',
    photoAlbumOpinion: 'I_LOVE_IT',
    attendedCommencementBefore: 'NO',
    commencementExpectations: 'A smooth ceremony.',
    myAunIs: 'Growth',
  },
};

const user = {
  id: 'user-1',
  email: 'ada@aun.edu.ng',
  name: 'Ada Lovelace',
  role: 'STUDENT',
  emailVerified: true,
  studentProfile: {
    id: 'profile-1',
    studentId: 'A00022937',
    firstName: 'Ada',
    middleName: null,
    lastName: 'Lovelace',
  },
};

describe(DashboardWorkspace, () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('loads and renders the authenticated student profile workspace', async () => {
    const fetchMock = vi.fn((url: string) => {
      const body = url.endsWith('/applications/me/current') ? null : profileResponse;

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(body),
      } as Response);
    });

    vi.stubGlobal('fetch', fetchMock);

    render(
      createElement(DashboardWorkspace, {
        accessToken: 'test-token',
        onSignOut: vi.fn(),
        user,
      }),
    );

    expect(await screen.findByText('Student Profile')).toBeInTheDocument();
    expect(screen.getByDisplayValue('A00022937')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Software Engineering')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/student/profile',
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'Bearer test-token',
        }),
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/applications/me/current',
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'Bearer test-token',
        }),
      }),
    );
  });

  it('opens the application form when the application tab is selected', async () => {
    const fetchMock = vi.fn((url: string) => {
      const body = url.endsWith('/applications/me/current') ? applicationResponse : profileResponse;

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(body),
      } as Response);
    });

    vi.stubGlobal('fetch', fetchMock);

    render(
      createElement(DashboardWorkspace, {
        accessToken: 'test-token',
        onSignOut: vi.fn(),
        user,
      }),
    );

    expect(await screen.findByText('Student Profile')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /2 Application/i }));

    expect(screen.getByText('Graduation Application')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Ada Lovelace')).toBeInTheDocument();
  });

  it('shows a status tracker instead of editable forms after final submission', async () => {
    const fetchMock = vi.fn((url: string) => {
      let body: unknown = profileResponse;

      if (url.endsWith('/applications/me/current')) {
        body = submittedApplicationResponse;
      }

      if (url.endsWith('/documents/me')) {
        body = documentsResponse;
      }

      if (url.endsWith('/survey/me')) {
        body = surveyResponse;
      }

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(body),
      } as Response);
    });

    vi.stubGlobal('fetch', fetchMock);

    render(
      createElement(DashboardWorkspace, {
        accessToken: 'test-token',
        onSignOut: vi.fn(),
        user,
      }),
    );

    expect(await screen.findByText('Application submitted')).toBeInTheDocument();
    expect(screen.queryByText('Submitted application')).not.toBeInTheDocument();
    expect(screen.queryByText('What Happens Next')).not.toBeInTheDocument();
    expect(screen.getAllByText('Bursary pending')[0]).toBeInTheDocument();
    expect(screen.getByText('Clearance status')).toBeInTheDocument();
    expect(screen.getAllByText('Bursary')[0]).toBeInTheDocument();
    expect(screen.getByText('SITC')).toBeInTheDocument();
    expect(screen.getAllByText('Registry')).toHaveLength(2);
    expect(screen.getByText('Provost')).toBeInTheDocument();
    expect(screen.queryByText('Program Chair')).not.toBeInTheDocument();
    expect(screen.queryByText('Dean')).not.toBeInTheDocument();
    expect(screen.queryByText('Final Registry')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save Profile/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Continue Application/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Upload$/i })).not.toBeInTheDocument();
  });
});

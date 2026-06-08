import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { DashboardClient } from './dashboard-client';

const summaryResponse = {
  totalApplications: 1,
  statusCounts: {
    DRAFT: 1,
  },
  recentApplications: [],
  integrations: {
    database: true,
    s3: true,
    smtp: false,
  },
};

const applicationsResponse = [
  {
    id: 'app-1',
    status: 'DRAFT',
    term: 'Pilot Graduation Term',
    student: {
      id: 'A00000001',
      name: 'Ada Lovelace',
      program: 'CSC',
    },
    documentCount: 0,
    clearanceCount: 0,
  },
];

describe(DashboardClient, () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('loads and renders dashboard data from the API', async () => {
    const fetchMock = vi.fn((url: string) => {
      const body = url.endsWith('/dashboard/summary') ? summaryResponse : applicationsResponse;

      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(body),
      } as Response);
    });

    vi.stubGlobal('fetch', fetchMock);

    render(createElement(DashboardClient));

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('A00000001')).toBeInTheDocument();
    expect(screen.getByText('1 total')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/dashboard/summary',
      expect.objectContaining({ cache: 'no-store' }),
    );
  });
});

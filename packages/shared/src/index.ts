export const SITC_SCHOOL_NAME = 'School of Information Technology and Communication';

export const sitcProgramTracks = [
  'CS_AI',
  'CS_CB',
  'CS_NDC',
  'CS_WMAD',
  'CS_CSA',
  'DSC',
  'IS_GENERIC',
  'IS_DA',
  'IS_ISA',
  'IS_MIS',
  'IS_SAD',
  'SE',
] as const;

export type SitcProgramTrack = (typeof sitcProgramTracks)[number];

export const applicationStatuses = [
  'draft',
  'submitted',
  'returned_to_student',
  'bursary_pending',
  'bursary_not_cleared',
  'bursary_cleared',
  'chair_review',
  'chair_not_cleared',
  'chair_cleared',
  'dean_review',
  'dean_not_cleared',
  'dean_cleared',
  'registry_intake_review',
  'waiting_for_final_grades',
  'final_registry_review',
  'provost_review',
  'completed',
  'not_cleared',
  'withdrawn',
] as const;

export type ApplicationStatus = (typeof applicationStatuses)[number];

export const documentTypes = [
  'jamb_admission_letter',
  'jamb_result_slip',
  'nin_slip',
  'unofficial_transcript',
  'supporting_document',
] as const;

export type DocumentType = (typeof documentTypes)[number];

export type HealthResponse = {
  status: 'ok';
  service: string;
  timestamp: string;
};

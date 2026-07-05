'use client';

import { ChangeEvent, FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FileText,
  FileUp,
  Loader2,
  LogOut,
  Save,
  UserRound,
  X,
} from 'lucide-react';
import { SITC_SCHOOL_NAME, sitcProgramTrackOptions } from '@gtcs/shared';
import { apiBaseUrl } from '../src/lib/config';
import { AuthUser } from '../src/lib/auth';
import { SchoolLogo } from './school-logo';
import { SiteFooter } from './site-footer';

type StudentProfile = {
  id: string;
  email: string;
  studentId: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  school: string;
  major: string | null;
  majorCode: string | null;
  catalogYearLabel: string | null;
  expectedGraduationTerm: string | null;
  concentration: string | null;
  minor: string | null;
  currentGpa: number | null;
  phone: string | null;
  shippingAddress: string | null;
  parentGuardian: {
    name: string | null;
    relationship: string | null;
    phone: string | null;
    email: string | null;
  };
  updatedAt: string;
};

type ProfileFormState = {
  firstName: string;
  middleName: string;
  lastName: string;
  majorCode: string;
  catalogYearLabel: string;
  expectedGraduationTerm: string;
  concentration: string;
  minor: string;
  currentGpa: string;
  phone: string;
  shippingAddress: string;
  parentGuardianName: string;
  parentGuardianRelationship: string;
  parentGuardianPhone: string;
  parentGuardianEmail: string;
};

type GraduationApplication = {
  id: string;
  status: string;
  term: string;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  nameOnCertificate: string | null;
  certificateMailingAddress: string | null;
  openErpChecks: ApplicationOpenErpCheckResponse | null;
  studentRemarks: string | null;
  studentAttestationAcceptedAt: string | null;
  formComplete: boolean;
  documentCount: number;
  surveySubmitted: boolean;
  bursaryPaymentRequest: {
    amount: number | null;
    currency: string;
    note: string;
    requestedAt: string | null;
    receiptUploaded: boolean;
    receiptUploadedAt: string | null;
  } | null;
  bursaryReceipt: UploadedDocument | null;
  registryDocumentRequest: RegistryDocumentRequest | null;
  workflowLog: WorkflowLogEntry[];
  profile: {
    studentId: string;
    name: string;
    major: string | null;
    majorCode: string | null;
    catalogYear: string | null;
    currentGpa: number | null;
  };
};

type ApplicationFormState = {
  certificateMailingAddress: string;
  openErpChecks: ApplicationOpenErpChecks;
  studentRemarks: string;
  attestationAccepted: boolean;
};

type ApplicationOpenErpCheckKey =
  | 'concentrationDeclared'
  | 'majorAccurate'
  | 'concentrationAccurate'
  | 'minorAccurate'
  | 'fullNameAccurate'
  | 'dateOfBirthAccurate'
  | 'genderAccurate'
  | 'stateOfOriginAccurate'
  | 'catalogYearAccurate';

type ApplicationOpenErpChecks = Record<ApplicationOpenErpCheckKey, string>;
type ApplicationOpenErpCheckResponse = Partial<Record<ApplicationOpenErpCheckKey, string | null>>;

type DocumentType =
  | 'JAMB_ADMISSION_LETTER'
  | 'JAMB_RESULT_SLIP'
  | 'NIN_SLIP'
  | 'CREDIT_AUDIT_SHEET'
  | 'UNOFFICIAL_TRANSCRIPT'
  | 'SUPPORTING_DOCUMENT';

type UploadedDocument = {
  id: string;
  type: DocumentType;
  originalName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  verifiedAt: string | null;
  createdAt: string;
};

type RegistryDocumentRequest = {
  completed: boolean;
  completedAt: string | null;
  missingChecks: string[];
  remarks: string;
  requestedAt: string | null;
  requiredDocumentTypes: DocumentType[];
};

type WorkflowLogEntry = {
  id: string;
  action: string;
  actor: {
    email: string;
    id: string;
    name: string | null;
    role: string;
  } | null;
  createdAt: string;
  metadata: unknown;
};

type DocumentRequirement = {
  type: DocumentType;
  label: string;
  description: string;
  required: boolean;
  uploaded: boolean;
  upload: UploadedDocument | null;
};

type ProgressItem = {
  complete: boolean;
  label: string;
};

type DocumentState = {
  applicationId: string;
  requiredComplete: boolean;
  documentCount: number;
  requiredDocuments: DocumentRequirement[];
  bursaryReceiptRequired: boolean;
  bursaryReceipt: UploadedDocument | null;
  documents: UploadedDocument[];
};

type PresignedUpload = {
  bucket: string;
  key: string;
  uploadUrl: string;
  expiresIn: number;
};

type SurveyAnswers = {
  immediatePlan: string;
  immediatePlanOther: string;
  attendCommencement: string;
  attendCommencementReason: string;
  preferVirtualConferral: string;
  attendSeniorWeek: string;
  attendSeniorWeekReason: string;
  commencementTicketSuggestion: string;
  awardsDinnerTicketSuggestion: string;
  commencementInfoMethod: string;
  commencementInfoOther: string;
  guestLodgingPreference: string;
  guestLodgingOther: string;
  townTransportPlan: string;
  townTransportOther: string;
  photoAlbumOpinion: string;
  attendedCommencementBefore: string;
  attendedCommencementYear: string;
  commencementOrganizationRating: string;
  improvementSuggestions: string;
  awardCategorySuggestions: string;
  participatedPrograms: string[];
  participatedProgramsOther: string;
  commencementExpectations: string;
  myAunIs: string;
};

type SurveyState = {
  applicationId: string;
  answers: Partial<SurveyAnswers>;
  submittedAt: string | null;
};

type WorkspaceStep = 'profile' | 'application' | 'documents' | 'survey' | 'submit';

const emptyProfileForm: ProfileFormState = {
  firstName: '',
  middleName: '',
  lastName: '',
  majorCode: '',
  catalogYearLabel: '',
  expectedGraduationTerm: '',
  concentration: '',
  minor: '',
  currentGpa: '',
  phone: '',
  shippingAddress: '',
  parentGuardianName: '',
  parentGuardianRelationship: '',
  parentGuardianPhone: '',
  parentGuardianEmail: '',
};

const emptyApplicationForm: ApplicationFormState = {
  certificateMailingAddress: '',
  openErpChecks: {
    concentrationDeclared: '',
    majorAccurate: '',
    concentrationAccurate: '',
    minorAccurate: '',
    fullNameAccurate: '',
    dateOfBirthAccurate: '',
    genderAccurate: '',
    stateOfOriginAccurate: '',
    catalogYearAccurate: '',
  },
  studentRemarks: '',
  attestationAccepted: false,
};

const emptySurveyAnswers: SurveyAnswers = {
  immediatePlan: '',
  immediatePlanOther: '',
  attendCommencement: '',
  attendCommencementReason: '',
  preferVirtualConferral: '',
  attendSeniorWeek: '',
  attendSeniorWeekReason: '',
  commencementTicketSuggestion: '',
  awardsDinnerTicketSuggestion: '',
  commencementInfoMethod: '',
  commencementInfoOther: '',
  guestLodgingPreference: '',
  guestLodgingOther: '',
  townTransportPlan: '',
  townTransportOther: '',
  photoAlbumOpinion: '',
  attendedCommencementBefore: '',
  attendedCommencementYear: '',
  commencementOrganizationRating: '',
  improvementSuggestions: '',
  awardCategorySuggestions: '',
  participatedPrograms: [],
  participatedProgramsOther: '',
  commencementExpectations: '',
  myAunIs: '',
};

const catalogYearOptions = ['2020-2024', '2021-2025', '2022-2026', '2023-2027', '2024-2028'];
const graduationTermOptions = ['Fall 2026', 'Spring 2027', 'Fall 2027', 'Spring 2028'];
const yesNoOptions = [
  { value: 'YES', label: 'Yes' },
  { value: 'NO', label: 'No' },
];
const immediatePlanOptions = [
  { value: 'NYSC', label: 'NYSC' },
  { value: 'WORK', label: 'Work' },
  { value: 'GRADUATE_DEGREE', label: 'Graduate Degree' },
  { value: 'LAW_SCHOOL', label: 'Law School' },
  { value: 'OTHER', label: 'Other' },
];
const yesMaybeNoOptions = [
  { value: 'YES', label: 'Yes' },
  { value: 'MAYBE', label: 'Maybe' },
  { value: 'NO', label: 'No' },
];
const commencementTicketOptions = ['5', '6', '7', '8'].map((value) => ({ value, label: `${value} tickets` }));
const awardsDinnerTicketOptions = ['2', '3', '4', '5', '6'].map((value) => ({
  value,
  label: `${value} tickets`,
}));
const commencementInfoOptions = [
  { value: 'TEXT', label: 'Text' },
  { value: 'MAIL', label: 'Mail (FedEx or NiPost EMS)' },
  { value: 'EMAIL', label: 'E-mail' },
  { value: 'OTHER', label: 'Other' },
];
const guestLodgingOptions = [
  { value: 'AUN_HOTEL', label: 'AUN Hotel' },
  { value: 'AUN_RESIDENCE_HALLS', label: 'AUN Residence Halls' },
  { value: 'SURROUNDING_HOTELS', label: 'Surrounding Hotels' },
  { value: 'OTHER', label: 'Other' },
];
const townTransportOptions = [
  { value: 'USE_ME', label: 'Use me' },
  { value: 'PERSONAL_CAR', label: 'Personal car' },
  { value: 'AUN_TRANSPORTATION', label: 'AUN transportation' },
  { value: 'OTHER', label: 'Other' },
];
const photoAlbumOptions = [
  { value: 'I_LOVE_IT', label: 'I love it' },
  { value: 'INTERESTING', label: 'Interesting' },
  { value: 'DONT_LIKE_IDEA', label: 'I don’t like the idea' },
  { value: 'PLEASE_LETS_DO_IT', label: 'Please let do it' },
];
const priorCommencementOptions = [
  { value: 'YES', label: 'Yes' },
  { value: 'NO', label: 'No' },
  { value: 'WANTED_BUT_OFF_CAMPUS', label: 'I have always wanted to, but I am never on campus' },
];
const organizationRatingOptions = [
  { value: 'VERY_SATISFIED', label: 'Very Satisfied' },
  { value: 'SATISFIED', label: 'Satisfied' },
  { value: 'NEUTRAL', label: 'Neutral' },
  { value: 'UNSATISFIED', label: 'Unsatisfied' },
  { value: 'VERY_UNSATISFIED', label: 'Very Unsatisfied' },
];
const participatedProgramOptions = [
  { value: 'MODEL_UN', label: 'Model UN' },
  { value: 'STUDY_ABROAD', label: 'Study Abroad' },
  { value: 'EMERGING_LEADERS_ACADEMY', label: 'Emerging Leaders Academy' },
  { value: 'HULT_PRIZE', label: 'Hult Prize' },
  { value: 'OTHER', label: 'Other' },
];
const openErpReviewFields: Array<{ label: string; name: ApplicationOpenErpCheckKey }> = [
  {
    label: 'Concentration declaration form completed',
    name: 'concentrationDeclared',
  },
  { label: 'Major accurately captured on OpenERP', name: 'majorAccurate' },
  { label: 'Concentration accurately captured on OpenERP', name: 'concentrationAccurate' },
  { label: 'Minor accurately captured on OpenERP', name: 'minorAccurate' },
  { label: 'Full name accurately captured on OpenERP', name: 'fullNameAccurate' },
  { label: 'Date of birth accurately captured on OpenERP', name: 'dateOfBirthAccurate' },
  { label: 'Gender accurately captured on OpenERP', name: 'genderAccurate' },
  { label: 'State of origin accurately captured on OpenERP', name: 'stateOfOriginAccurate' },
  { label: 'Catalog year accurately captured on OpenERP', name: 'catalogYearAccurate' },
];
const surveyReviewFields: Array<{
  label: string;
  name: keyof SurveyAnswers;
  options?: Array<{ label: string; value: string }>;
}> = [
    { label: 'Immediate plan after graduation', name: 'immediatePlan', options: immediatePlanOptions },
    { label: 'Other immediate plan', name: 'immediatePlanOther' },
    { label: 'Attending commencement ceremony', name: 'attendCommencement', options: yesMaybeNoOptions },
    { label: 'Reason for not attending commencement', name: 'attendCommencementReason' },
    { label: 'Prefers virtual conferral', name: 'preferVirtualConferral', options: yesMaybeNoOptions },
    { label: 'Attending Senior Week', name: 'attendSeniorWeek', options: yesMaybeNoOptions },
    { label: 'Reason for not attending Senior Week', name: 'attendSeniorWeekReason' },
    { label: 'Suggested commencement tickets', name: 'commencementTicketSuggestion', options: commencementTicketOptions },
    { label: 'Suggested awards dinner tickets', name: 'awardsDinnerTicketSuggestion', options: awardsDinnerTicketOptions },
    { label: 'Best information method', name: 'commencementInfoMethod', options: commencementInfoOptions },
    { label: 'Other information method', name: 'commencementInfoOther' },
    { label: 'Preferred guest lodging', name: 'guestLodgingPreference', options: guestLodgingOptions },
    { label: 'Other guest lodging', name: 'guestLodgingOther' },
    { label: 'Town transport plan', name: 'townTransportPlan', options: townTransportOptions },
    { label: 'Other transport plan', name: 'townTransportOther' },
    { label: 'Class photo album opinion', name: 'photoAlbumOpinion', options: photoAlbumOptions },
    { label: 'Previously attended commencement', name: 'attendedCommencementBefore', options: priorCommencementOptions },
    { label: 'Commencement attendance year', name: 'attendedCommencementYear' },
    { label: 'Commencement organization rating', name: 'commencementOrganizationRating', options: organizationRatingOptions },
    { label: 'Improvement suggestions', name: 'improvementSuggestions' },
    { label: 'Award category suggestions', name: 'awardCategorySuggestions' },
    { label: 'AUN programs participated in', name: 'participatedPrograms', options: participatedProgramOptions },
    { label: 'Other AUN program', name: 'participatedProgramsOther' },
    { label: 'Commencement expectations', name: 'commencementExpectations' },
    { label: 'My AUN is', name: 'myAunIs' },
  ];
const clearanceWorkflowSteps = [
  {
    key: 'bursary',
    label: 'Bursary',
    description: 'Financial clearance',
  },
  {
    key: 'registry-intake',
    label: 'Registry',
    description: 'Application and document intake',
  },
  {
    key: 'sitc',
    label: 'SITC',
    description: 'Academic and school clearance',
  },
  {
    key: 'registry-final',
    label: 'Registry',
    description: 'Final records and audit',
  },
  {
    key: 'provost',
    label: 'Provost',
    description: 'Final approval',
  },
] as const;

type WorkflowStepKey = (typeof clearanceWorkflowSteps)[number]['key'];

const applicationStatusMeta: Record<
  string,
  {
    currentOffice: string;
    label: string;
    nextAction: string;
    step: WorkflowStepKey;
    studentAction: string;
    tone: 'neutral' | 'success' | 'warning' | 'danger';
    workflowComplete?: boolean;
  }
> = {
  DRAFT: {
    currentOffice: 'Student',
    label: 'Draft',
    nextAction: 'Complete all sections and submit the application.',
    step: 'bursary',
    studentAction: 'Continue editing the graduation application.',
    tone: 'neutral',
  },
  SUBMITTED: {
    currentOffice: 'Bursary',
    label: 'Submitted',
    nextAction: 'Bursary will begin financial clearance.',
    step: 'bursary',
    studentAction: 'No action needed unless the application is returned.',
    tone: 'neutral',
  },
  RETURNED_TO_STUDENT: {
    currentOffice: 'Student',
    label: 'Returned to student',
    nextAction: 'Make the requested corrections and resubmit.',
    step: 'registry-intake',
    studentAction: 'Upload the documents requested by Registry.',
    tone: 'warning',
  },
  BURSARY_PENDING: {
    currentOffice: 'Bursary',
    label: 'Bursary pending',
    nextAction: 'Bursary will confirm fees and financial clearance.',
    step: 'bursary',
    studentAction: 'No action needed unless Bursary requests payment or documents.',
    tone: 'neutral',
  },
  BURSARY_NOT_CLEARED: {
    currentOffice: 'Bursary',
    label: 'Payment required',
    nextAction: 'Pay the outstanding balance and upload your receipt for Bursary review.',
    step: 'bursary',
    studentAction: 'Upload your payment receipt after paying the outstanding balance.',
    tone: 'warning',
  },
  BURSARY_CLEARED: {
    currentOffice: 'Registry',
    label: 'Bursary cleared',
    nextAction: 'Registry will check submitted forms and required attachments.',
    step: 'registry-intake',
    studentAction: 'No action needed.',
    tone: 'success',
  },
  CHAIR_REVIEW: {
    currentOffice: 'SITC',
    label: 'SITC review',
    nextAction: 'SITC will review academic requirements and school clearance.',
    step: 'sitc',
    studentAction: 'No action needed unless contacted by SITC.',
    tone: 'neutral',
  },
  CHAIR_NOT_CLEARED: {
    currentOffice: 'SITC',
    label: 'SITC not cleared',
    nextAction: 'Academic requirement issues must be resolved.',
    step: 'sitc',
    studentAction: 'Contact SITC for next steps.',
    tone: 'danger',
  },
  CHAIR_CLEARED: {
    currentOffice: 'SITC',
    label: 'SITC review',
    nextAction: 'SITC school clearance is in progress.',
    step: 'sitc',
    studentAction: 'No action needed.',
    tone: 'success',
  },
  DEAN_REVIEW: {
    currentOffice: 'SITC',
    label: 'SITC review',
    nextAction: 'SITC will complete school clearance.',
    step: 'sitc',
    studentAction: 'No action needed unless contacted by SITC.',
    tone: 'neutral',
  },
  DEAN_NOT_CLEARED: {
    currentOffice: 'SITC',
    label: 'SITC not cleared',
    nextAction: 'SITC must resolve the school clearance issue.',
    step: 'sitc',
    studentAction: 'Contact SITC for guidance.',
    tone: 'danger',
  },
  DEAN_CLEARED: {
    currentOffice: 'Registry',
    label: 'SITC cleared',
    nextAction: 'Registry will begin records and final audit review.',
    step: 'registry-final',
    studentAction: 'No action needed.',
    tone: 'success',
  },
  REGISTRY_INTAKE_REVIEW: {
    currentOffice: 'Registry',
    label: 'Registry review',
    nextAction: 'Registry checks submitted forms and required attachments.',
    step: 'registry-intake',
    studentAction: 'No action needed unless Registry requests corrections.',
    tone: 'neutral',
  },
  WAITING_FOR_FINAL_GRADES: {
    currentOffice: 'Registry',
    label: 'Waiting for final grades',
    nextAction: 'Registry is waiting for final grades before completing final audit.',
    step: 'registry-final',
    studentAction: 'Complete any remaining academic work.',
    tone: 'neutral',
  },
  FINAL_REGISTRY_REVIEW: {
    currentOffice: 'Registry',
    label: 'Registry review',
    nextAction: 'Registry confirms final GPA, degree completion, and honors.',
    step: 'registry-final',
    studentAction: 'No action needed unless Registry contacts you.',
    tone: 'neutral',
  },
  PROVOST_REVIEW: {
    currentOffice: 'Provost',
    label: 'Provost review',
    nextAction: 'Provost performs final approval.',
    step: 'provost',
    studentAction: 'No action needed.',
    tone: 'neutral',
  },
  COMPLETED: {
    currentOffice: 'Completed',
    label: 'Completed',
    nextAction: 'Graduation clearance is complete.',
    step: 'provost',
    studentAction: 'Watch your AUN email for ceremony and transcript updates.',
    tone: 'success',
    workflowComplete: true,
  },
  NOT_CLEARED: {
    currentOffice: 'Registry',
    label: 'Not cleared',
    nextAction: 'The application was not cleared.',
    step: 'registry-final',
    studentAction: 'Contact Registry or SITC for details.',
    tone: 'danger',
  },
  WITHDRAWN: {
    currentOffice: 'Student',
    label: 'Withdrawn',
    nextAction: 'The application is no longer active.',
    step: 'bursary',
    studentAction: 'Contact Registry if this was not intended.',
    tone: 'warning',
  },
};

export function DashboardWorkspace({
  accessToken,
  onSignOut,
  user,
}: {
  accessToken: string;
  onSignOut: () => void;
  user: AuthUser;
}) {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [form, setForm] = useState<ProfileFormState>(emptyProfileForm);
  const [application, setApplication] = useState<GraduationApplication | null>(null);
  const [applicationForm, setApplicationForm] = useState<ApplicationFormState>(emptyApplicationForm);
  const [documents, setDocuments] = useState<DocumentState | null>(null);
  const [survey, setSurvey] = useState<SurveyState | null>(null);
  const [surveyForm, setSurveyForm] = useState<SurveyAnswers>(emptySurveyAnswers);
  const [activeStep, setActiveStep] = useState<WorkspaceStep>('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applicationSaving, setApplicationSaving] = useState(false);
  const [startingApplication, setStartingApplication] = useState(false);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [uploadingDocumentType, setUploadingDocumentType] = useState<DocumentType | null>(null);
  const [uploadingBursaryReceipt, setUploadingBursaryReceipt] = useState(false);
  const [surveySaving, setSurveySaving] = useState(false);
  const [finalSubmitting, setFinalSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    Promise.all([
      studentApiRequest<StudentProfile>('/student/profile', accessToken),
      studentApiRequest<GraduationApplication | null>('/applications/me/current', accessToken),
    ])
      .then(([loadedProfile, loadedApplication]) => {
        if (cancelled) {
          return;
        }

        setProfile(loadedProfile);
        setForm(profileToForm(loadedProfile));
        setApplication(loadedApplication);

        if (loadedApplication) {
          setApplicationForm(applicationToForm(loadedApplication));

          if (loadedApplication.submittedAt) {
            setActiveStep('submit');
          }
        }

        if (loadedApplication?.formComplete) {
          void studentApiRequest<DocumentState>('/documents/me', accessToken)
            .then((loadedDocuments) => {
              if (cancelled) {
                return;
              }

              setDocuments(loadedDocuments);

              if (loadedDocuments.requiredComplete) {
                void studentApiRequest<SurveyState>('/survey/me', accessToken)
                  .then((loadedSurvey) => {
                    if (!cancelled) {
                      setSurvey(loadedSurvey);
                      setSurveyForm(surveyToForm(loadedSurvey));
                    }
                  })
                  .catch(() => undefined);
              }
            })
            .catch(() => undefined);
        }
      })
      .catch((caught) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : 'Unable to load student profile.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  useEffect(() => {
    if (!reviewOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setReviewOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [reviewOpen]);

  const profileCompletionItems = useMemo(() => getCompletionItems(form), [form]);
  const profileCompletedCount = profileCompletionItems.filter((item) => item.complete).length;
  const profileComplete = profileCompletedCount === profileCompletionItems.length;
  const applicationComplete = Boolean(application?.formComplete);
  const documentsComplete = Boolean(documents?.requiredComplete);
  const surveyComplete = Boolean(survey?.submittedAt ?? application?.surveySubmitted);
  const completionItems = useMemo(
    () =>
      getApplicationProgressItems({
        applicationComplete,
        documents,
        profileItems: profileCompletionItems,
        surveyComplete,
      }),
    [applicationComplete, documents, profileCompletionItems, surveyComplete],
  );
  const completedCount = completionItems.filter((item) => item.complete).length;
  const completionPercent = Math.round((completedCount / completionItems.length) * 100);
  const requiredProgressComplete = completedCount === completionItems.length;
  const finalSubmitted = Boolean(application?.submittedAt);
  const statusMeta = getApplicationStatusMeta(application?.status);

  async function refreshApplication() {
    const updatedApplication = await studentApiRequest<GraduationApplication | null>(
      '/applications/me/current',
      accessToken,
    );

    setApplication(updatedApplication);

    if (updatedApplication) {
      setApplicationForm(applicationToForm(updatedApplication));
    }

    return updatedApplication;
  }

  function openApplicationStep() {
    if (!profileComplete || startingApplication) {
      return;
    }

    if (application) {
      setActiveStep('application');
      return;
    }

    void handleStartApplication();
  }

  function openDocumentsStep() {
    if (!applicationComplete || documentsLoading) {
      return;
    }

    setActiveStep('documents');
    void loadDocuments();
  }

  function openSurveyStep() {
    if (!documentsComplete || surveySaving) {
      return;
    }

    setActiveStep('survey');
    void loadSurvey();
  }

  function openSubmitStep() {
    if (!surveyComplete) {
      return;
    }

    setActiveStep('submit');
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const updatedProfile = await studentApiRequest<StudentProfile>('/student/profile', accessToken, {
        method: 'PATCH',
        body: JSON.stringify(formToPayload(form)),
      });

      setProfile(updatedProfile);
      setForm(profileToForm(updatedProfile));

      if (application) {
        const updatedApplication = await studentApiRequest<GraduationApplication | null>(
          '/applications/me/current',
          accessToken,
        );

        setApplication(updatedApplication);

        if (updatedApplication) {
          setApplicationForm(applicationToForm(updatedApplication));
        }
      }

      setNotice('Profile saved.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save student profile.');
    } finally {
      setSaving(false);
    }
  }

  async function handleStartApplication() {
    setStartingApplication(true);
    setError(null);
    setNotice(null);

    try {
      const startedApplication = await studentApiRequest<GraduationApplication>(
        '/applications/me/start',
        accessToken,
        {
          method: 'POST',
          body: JSON.stringify({}),
        },
      );

      setApplication(startedApplication);
      setApplicationForm(applicationToForm(startedApplication));
      setActiveStep('application');
      setNotice('Application draft ready.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to start graduation application.');
    } finally {
      setStartingApplication(false);
    }
  }

  async function handleSaveApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setApplicationSaving(true);
    setError(null);
    setNotice(null);

    try {
      const updatedApplication = await studentApiRequest<GraduationApplication>(
        '/applications/me/current',
        accessToken,
        {
          method: 'PATCH',
          body: JSON.stringify(applicationFormToPayload(applicationForm)),
        },
      );

      setApplication(updatedApplication);
      setApplicationForm(applicationToForm(updatedApplication));
      setNotice('Application draft saved.');

      if (updatedApplication.formComplete) {
        await loadDocuments(true);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save graduation application.');
    } finally {
      setApplicationSaving(false);
    }
  }

  async function loadDocuments(force = false) {
    if (!applicationComplete && !force) {
      return null;
    }

    setDocumentsLoading(true);
    setError(null);

    try {
      const loadedDocuments = await studentApiRequest<DocumentState>('/documents/me', accessToken);
      setDocuments(loadedDocuments);
      return loadedDocuments;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load document checklist.');
      return null;
    } finally {
      setDocumentsLoading(false);
    }
  }

  async function handleUploadDocument(documentType: DocumentType, file: File) {
    setUploadingDocumentType(documentType);
    setError(null);
    setNotice(null);

    try {
      const contentType = file.type || 'application/octet-stream';
      const presignedUpload = await studentApiRequest<PresignedUpload>('/documents/me/presign', accessToken, {
        method: 'POST',
        body: JSON.stringify({
          documentType,
          contentType,
        }),
      });

      const uploadResponse = await uploadFileToS3(presignedUpload.uploadUrl, file, contentType);

      if (!uploadResponse.ok) {
        throw new Error('S3 rejected the upload. Check bucket CORS and try again.');
      }

      const updatedDocuments = await studentApiRequest<DocumentState>('/documents/me/complete', accessToken, {
        method: 'POST',
        body: JSON.stringify({
          documentType,
          bucket: presignedUpload.bucket,
          key: presignedUpload.key,
          originalName: file.name,
          mimeType: contentType,
          sizeBytes: file.size,
        }),
      });

      setDocuments(updatedDocuments);
      await refreshApplication();
      if (updatedDocuments.requiredComplete) {
        await loadSurvey(true);
      }
      setNotice('Document uploaded.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to upload document.');
    } finally {
      setUploadingDocumentType(null);
    }
  }

  async function handleUploadBursaryReceipt(file: File) {
    setUploadingBursaryReceipt(true);
    setError(null);
    setNotice(null);

    try {
      const contentType = file.type || 'application/octet-stream';
      const presignedUpload = await studentApiRequest<PresignedUpload>(
        '/documents/me/bursary-receipt/presign',
        accessToken,
        {
          method: 'POST',
          body: JSON.stringify({
            contentType,
          }),
        },
      );

      const uploadResponse = await uploadFileToS3(presignedUpload.uploadUrl, file, contentType);

      if (!uploadResponse.ok) {
        throw new Error('S3 rejected the receipt upload. Check bucket CORS and try again.');
      }

      await studentApiRequest<DocumentState>('/documents/me/bursary-receipt/complete', accessToken, {
        method: 'POST',
        body: JSON.stringify({
          bucket: presignedUpload.bucket,
          key: presignedUpload.key,
          originalName: file.name,
          mimeType: contentType,
          sizeBytes: file.size,
        }),
      });

      await refreshApplication();
      await loadDocuments(true);
      setNotice('Payment receipt uploaded. Bursary will review it and continue your application.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to upload payment receipt.');
    } finally {
      setUploadingBursaryReceipt(false);
    }
  }

  async function loadSurvey(force = false) {
    if (!documentsComplete && !force) {
      return null;
    }

    setError(null);

    try {
      const loadedSurvey = await studentApiRequest<SurveyState>('/survey/me', accessToken);
      setSurvey(loadedSurvey);
      setSurveyForm(surveyToForm(loadedSurvey));
      return loadedSurvey;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load senior survey.');
      return null;
    }
  }

  async function handleSaveSurvey(submit: boolean) {
    setSurveySaving(true);
    setError(null);
    setNotice(null);

    try {
      const updatedSurvey = await studentApiRequest<SurveyState>('/survey/me', accessToken, {
        method: 'PATCH',
        body: JSON.stringify({
          answers: surveyFormToPayload(surveyForm),
          submit,
        }),
      });

      setSurvey(updatedSurvey);
      setSurveyForm(surveyToForm(updatedSurvey));
      await refreshApplication();
      setNotice(submit ? 'Senior survey submitted.' : 'Senior survey saved.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save senior survey.');
    } finally {
      setSurveySaving(false);
    }
  }

  async function handleFinalSubmit() {
    setFinalSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      const submittedApplication = await studentApiRequest<GraduationApplication>(
        '/applications/me/submit',
        accessToken,
        {
          method: 'POST',
          body: JSON.stringify({}),
        },
      );

      setApplication(submittedApplication);
      setApplicationForm(applicationToForm(submittedApplication));
      setActiveStep('submit');
      setNotice('Graduation application submitted for clearance review.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to submit graduation application.');
    } finally {
      setFinalSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col">
      <header className="border-b border-line bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-[92rem] flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <SchoolLogo size="sm" />
            <div>
              <p className="text-sm font-medium text-spruce">{SITC_SCHOOL_NAME}</p>
              <h1 className="text-xl font-semibold text-ink">Graduation Clearance</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-pill border border-line bg-mist px-3 py-1.5 text-sm text-ink">
              <span className="font-semibold">{profile?.studentId ?? user.studentProfile?.studentId ?? user.role}</span>
            </div>
            {finalSubmitted ? (
              <>
                <button
                  className="inline-flex h-9 items-center gap-2 rounded-pill bg-ink px-4 text-sm font-semibold text-white transition hover:opacity-90"
                  onClick={() => setReviewOpen(true)}
                  type="button"
                >
                  <FileText aria-hidden className="h-4 w-4" />
                  Review application
                </button>
                <div className={`rounded-pill border px-3 py-1.5 text-sm font-semibold ${statusToneClass(statusMeta.tone)}`}>
                  {statusMeta.label}
                </div>
              </>
            ) : null}
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

      <section className="mx-auto w-full max-w-[92rem] flex-1 px-5 py-6">
        {loading ? (
          <div className="flex min-h-[420px] items-center justify-center rounded-lg border border-line bg-white shadow-soft">
            <div className="flex items-center gap-3 text-sm font-medium text-ink">
              <Loader2 aria-hidden className="h-4 w-4 animate-spin text-spruce" />
              Loading student workspace
            </div>
          </div>
        ) : finalSubmitted && application ? (
          <SubmittedApplicationView
            application={application}
            documents={documents}
            error={error}
            notice={notice}
            onUploadBursaryReceipt={handleUploadBursaryReceipt}
            onUploadDocument={handleUploadDocument}
            profile={profile}
            uploadingBursaryReceipt={uploadingBursaryReceipt}
            uploadingDocumentType={uploadingDocumentType}
          />
        ) : (
          <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
            <div className="grid gap-5">
              <StudentProgress
                activeStep={activeStep}
                applicationComplete={applicationComplete}
                documentsComplete={documentsComplete}
                finalSubmitted={finalSubmitted}
                onSelectApplication={openApplicationStep}
                onSelectDocuments={openDocumentsStep}
                onSelectProfile={() => setActiveStep('profile')}
                onSelectSubmit={openSubmitStep}
                onSelectSurvey={openSurveyStep}
                profileComplete={profileComplete}
                surveyComplete={surveyComplete}
                startingApplication={startingApplication}
              />

              {activeStep === 'profile' ? (
                <form className="rounded-lg border border-line bg-white shadow-soft" onSubmit={(event) => void handleSave(event)}>
                  <div className="border-b border-line p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <UserRound aria-hidden className="h-5 w-5 text-spruce" />
                          <h2 className="text-lg font-semibold text-ink">Student Profile</h2>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">
                          {profile ? `${profile.firstName} ${profile.lastName}` : user.email}
                        </p>
                      </div>
                      <button
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-spruce px-4 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={saving}
                        type="submit"
                      >
                        {saving ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Save aria-hidden className="h-4 w-4" />}
                        Save Profile
                      </button>
                    </div>

                    {error ? (
                      <p className="mt-4 rounded-md border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                        {error}
                      </p>
                    ) : null}

                    {notice ? (
                      <p className="mt-4 rounded-md border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-800">
                        {notice}
                      </p>
                    ) : null}
                  </div>

                  <div className="grid gap-6 p-5">
                    <section className="grid gap-4">
                      <SectionHeading title="Identity" />
                      <div className="grid gap-3 md:grid-cols-3">
                        <TextField
                          label="First name"
                          onChange={(value) => setForm((current) => ({ ...current, firstName: value }))}
                          required
                          value={form.firstName}
                        />
                        <TextField
                          label="Middle name"
                          onChange={(value) => setForm((current) => ({ ...current, middleName: value }))}
                          value={form.middleName}
                        />
                        <TextField
                          label="Last name"
                          onChange={(value) => setForm((current) => ({ ...current, lastName: value }))}
                          required
                          value={form.lastName}
                        />
                      </div>
                      <div className="grid gap-3 md:grid-cols-3">
                        <ReadOnlyField label="AUN Student ID" value={profile?.studentId ?? user.studentProfile?.studentId ?? ''} />
                        <ReadOnlyField label="AUN email" value={profile?.email ?? user.email} />
                        <TextField
                          label="Phone"
                          onChange={(value) => setForm((current) => ({ ...current, phone: value }))}
                          required
                          type="tel"
                          value={form.phone}
                        />
                      </div>
                    </section>

                    <section className="grid gap-4 border-t border-line pt-5">
                      <SectionHeading title="Academic Details" />
                      <div className="grid gap-3 md:grid-cols-2">
                        <SelectField
                          label="Major"
                          onChange={(value) => setForm((current) => ({ ...current, majorCode: value }))}
                          options={sitcProgramTrackOptions}
                          placeholder="Select major"
                          required
                          value={form.majorCode}
                        />
                        <TextField
                          label="Concentration"
                          onChange={(value) => setForm((current) => ({ ...current, concentration: value }))}
                          value={form.concentration}
                        />
                      </div>
                      <div className="grid gap-3 md:grid-cols-3">
                        <SelectField
                          label="Catalog year"
                          onChange={(value) => setForm((current) => ({ ...current, catalogYearLabel: value }))}
                          options={catalogYearOptions.map((value) => ({ value, label: value }))}
                          placeholder="Select catalog"
                          required
                          value={form.catalogYearLabel}
                        />
                        <SelectField
                          label="Expected graduation term"
                          onChange={(value) => setForm((current) => ({ ...current, expectedGraduationTerm: value }))}
                          options={graduationTermOptions.map((value) => ({ value, label: value }))}
                          placeholder="Select term"
                          required
                          value={form.expectedGraduationTerm}
                        />
                        <TextField
                          label="Current GPA"
                          max="4"
                          min="0"
                          onChange={(value) => setForm((current) => ({ ...current, currentGpa: value }))}
                          required
                          step="0.01"
                          type="number"
                          value={form.currentGpa}
                        />
                      </div>
                      <TextField
                        label="Minor"
                        onChange={(value) => setForm((current) => ({ ...current, minor: value }))}
                        value={form.minor}
                      />
                    </section>

                    <section className="grid gap-4 border-t border-line pt-5">
                      <SectionHeading title="Contact And Guardian" />
                      <label className="grid gap-1 text-sm font-medium text-ink">
                        Mailing address
                        <textarea
                          className="min-h-24 rounded-md border border-line px-3 py-2 text-sm font-normal outline-none focus:border-spruce"
                          onChange={(event) =>
                            setForm((current) => ({ ...current, shippingAddress: event.target.value }))
                          }
                          required
                          value={form.shippingAddress}
                        />
                      </label>
                      <div className="grid gap-3 md:grid-cols-2">
                        <TextField
                          label="Parent/guardian name"
                          onChange={(value) => setForm((current) => ({ ...current, parentGuardianName: value }))}
                          value={form.parentGuardianName}
                        />
                        <TextField
                          label="Relationship"
                          onChange={(value) =>
                            setForm((current) => ({ ...current, parentGuardianRelationship: value }))
                          }
                          value={form.parentGuardianRelationship}
                        />
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <TextField
                          label="Parent/guardian phone"
                          onChange={(value) => setForm((current) => ({ ...current, parentGuardianPhone: value }))}
                          type="tel"
                          value={form.parentGuardianPhone}
                        />
                        <TextField
                          label="Parent/guardian email"
                          onChange={(value) => setForm((current) => ({ ...current, parentGuardianEmail: value }))}
                          type="email"
                          value={form.parentGuardianEmail}
                        />
                      </div>
                    </section>
                  </div>
                </form>
              ) : activeStep === 'application' ? (
                <ApplicationDraftForm
                  application={application}
                  form={applicationForm}
                  loading={startingApplication}
                  onChange={setApplicationForm}
                  onStart={() => void handleStartApplication()}
                  onSubmit={(event) => void handleSaveApplication(event)}
                  profile={profile}
                  profileComplete={profileComplete}
                  saving={applicationSaving}
                />
              ) : activeStep === 'documents' ? (
                <DocumentUploadsPanel
                  applicationComplete={applicationComplete}
                  documents={documents}
                  loading={documentsLoading}
                  onRefresh={() => void loadDocuments()}
                  onUpload={(documentType, file) => void handleUploadDocument(documentType, file)}
                  uploadingDocumentType={uploadingDocumentType}
                />
              ) : activeStep === 'survey' ? (
                <SeniorSurveyForm
                  documentsComplete={documentsComplete}
                  form={surveyForm}
                  onChange={setSurveyForm}
                  onSave={(submit) => void handleSaveSurvey(submit)}
                  saving={surveySaving}
                  survey={survey}
                />
              ) : (
                <ReviewSubmitPanel
                  application={application}
                  documents={documents}
                  onSubmit={() => void handleFinalSubmit()}
                  profile={profile}
                  submitting={finalSubmitting}
                  survey={survey}
                />
              )}
            </div>

            <aside className="grid content-start gap-5 xl:sticky xl:top-6">
              <div className="rounded-lg border border-line bg-white p-6 shadow-soft">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-marigold">Your progress</p>
                    <h2 className="mt-1 text-3xl font-semibold text-ink">{completionPercent}%</h2>
                  </div>
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full ${requiredProgressComplete ? 'bg-ink text-white' : 'bg-mist text-marigold'
                      }`}
                  >
                    {requiredProgressComplete ? (
                      <CheckCircle2 aria-hidden className="h-6 w-6" />
                    ) : (
                      <CircleAlert aria-hidden className="h-6 w-6" />
                    )}
                  </div>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-mist">
                  <div
                    className="h-2 rounded-full bg-ink transition-all"
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
                <div className="mt-5 grid gap-2.5">
                  {completionItems.map((item) => (
                    <div className="flex items-center gap-2.5 text-sm" key={item.label}>
                      <CheckCircle2
                        aria-hidden
                        className={`h-4 w-4 flex-none ${item.complete ? 'text-ink' : 'text-plum'}`}
                      />
                      <span className={item.complete ? 'font-medium text-ink' : 'text-marigold'}>{item.label}</span>
                    </div>
                  ))}
                </div>

                <button
                  className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-pill bg-spruce px-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={!profileComplete}
                  onClick={
                    !applicationComplete
                      ? openApplicationStep
                      : !documentsComplete
                        ? openDocumentsStep
                        : !surveyComplete
                          ? openSurveyStep
                          : openSubmitStep
                  }
                  type="button"
                >
                  {!applicationComplete
                    ? application
                      ? 'Continue application'
                      : 'Start application'
                    : !documentsComplete
                      ? 'Upload documents'
                      : !surveyComplete
                        ? 'Complete survey'
                        : 'Review & submit'}
                  <ArrowRight aria-hidden className="h-4 w-4" />
                </button>
              </div>
            </aside>
          </div>
        )}
      </section>

      <SiteFooter />

      {reviewOpen && application ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm sm:p-8"
          onClick={() => setReviewOpen(false)}
          role="dialog"
        >
          <div className="relative my-4 w-full max-w-4xl" onClick={(event) => event.stopPropagation()}>
            <button
              aria-label="Close review"
              className="absolute -right-3 -top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-ink shadow-soft transition hover:bg-mist"
              onClick={() => setReviewOpen(false)}
              type="button"
            >
              <X aria-hidden className="h-4 w-4" />
            </button>
            <ReviewSubmitPanel
              application={application}
              documents={documents}
              onSubmit={() => undefined}
              profile={profile}
              submitting={false}
              survey={survey}
            />
          </div>
        </div>
      ) : null}
    </main>
  );
}

function SubmittedApplicationView({
  application,
  documents,
  error,
  notice,
  onUploadBursaryReceipt,
  onUploadDocument,
  profile,
  uploadingBursaryReceipt,
  uploadingDocumentType,
}: {
  application: GraduationApplication;
  documents: DocumentState | null;
  error: string | null;
  notice: string | null;
  onUploadBursaryReceipt: (file: File) => void;
  onUploadDocument: (documentType: DocumentType, file: File) => void;
  profile: StudentProfile | null;
  uploadingBursaryReceipt: boolean;
  uploadingDocumentType: DocumentType | null;
}) {
  return (
    <div className="grid items-start gap-5 xl:grid-cols-[1fr_360px] 2xl:grid-cols-[1fr_400px]">
      <div className="grid content-start gap-5">
        {error ? (
          <p className="rounded-md border border-red-100 bg-red-50 p-3 text-sm text-red-700">{error}</p>
        ) : null}

        {notice ? (
          <p className="rounded-md border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-800">
            {notice}
          </p>
        ) : null}

        <WorkflowTracker status={application.status} />
        <ClearanceSummary application={application} profile={profile} />

        {application.status === 'BURSARY_NOT_CLEARED' && application.bursaryPaymentRequest ? (
          <BursaryReceiptPanel
            application={application}
            onUpload={onUploadBursaryReceipt}
            uploading={uploadingBursaryReceipt}
          />
        ) : null}

        {application.status === 'RETURNED_TO_STUDENT' && application.registryDocumentRequest ? (
          <RegistryDocumentRequestPanel
            application={application}
            documents={documents}
            onUpload={onUploadDocument}
            uploadingDocumentType={uploadingDocumentType}
          />
        ) : null}
      </div>

      <aside className="grid content-start gap-5">
        <ApplicationSystemLog application={application} />
      </aside>
    </div>
  );
}

function ApplicationSystemLog({ application }: { application: GraduationApplication }) {
  const entries = buildSystemLogEntries(application);

  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
      <ol className="mt-5 max-h-[460px] space-y-4 overflow-y-auto pr-1">
        {entries.map((entry, index) => (
          <li className="relative pl-8" key={entry.id}>
            {index < entries.length - 1 ? (
              <span className="absolute left-3 top-7 h-[calc(100%+1rem)] w-px bg-line" />
            ) : null}
            <span
              className={`absolute left-0 top-0 inline-flex h-6 w-6 items-center justify-center rounded-full border ${systemLogToneClass(
                entry.tone,
              )}`}
            >
              {entry.tone === 'success' ? (
                <CheckCircle2 aria-hidden className="h-3.5 w-3.5" />
              ) : entry.tone === 'warning' || entry.tone === 'danger' ? (
                <CircleAlert aria-hidden className="h-3.5 w-3.5" />
              ) : (
                <Clock3 aria-hidden className="h-3.5 w-3.5" />
              )}
            </span>
            <div className="rounded-lg border border-line bg-mist/40 p-3">
              <p className="text-sm font-semibold text-ink">{entry.title}</p>
              <time className="mt-1 block text-[11px] font-medium text-slate-500">
                {formatDateTime(entry.createdAt)}
              </time>
              {entry.actor ? (
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {entry.actor}
                </p>
              ) : null}
              {entry.details.length > 0 ? (
                <div className="mt-2 grid gap-1 border-t border-line pt-2">
                  {entry.details.map((detail) => (
                    <p className="text-xs leading-5 text-slate-600" key={detail}>
                      {detail}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ClearanceSummary({
  application,
  profile,
}: {
  application: GraduationApplication;
  profile: StudentProfile | null;
}) {
  const finalRegistryReview = getFinalRegistryReview(application);
  const gpa = finalRegistryReview.finalGpa ?? profile?.currentGpa ?? application.profile.currentGpa;
  const completionTerm = finalRegistryReview.completionTerm ?? application.term ?? profile?.expectedGraduationTerm;
  const graduationDate = finalRegistryReview.graduationDate;

  const items = [
    {
      helper: finalRegistryReview.finalGpa === null ? 'Current recorded GPA' : 'Final Registry record',
      label: 'GPA',
      value: formatGpa(gpa),
    },
    {
      helper: finalRegistryReview.degreeHonors ? 'Confirmed by Final Registry' : 'Awaiting final record',
      label: 'Degree Honours',
      value: finalRegistryReview.degreeHonors ?? 'Pending',
    },
    {
      helper: finalRegistryReview.completionTerm ? 'Degree requirement completed in' : 'Expected graduation term',
      label: 'Completion Term',
      value: completionTerm ?? 'Pending',
    },
    {
      helper: graduationDate ? 'Official graduation date' : 'To be updated by Registry',
      label: 'Graduation Date',
      value: graduationDate ? formatDateOnly(graduationDate) : 'To be announced',
    },
  ];

  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
      <div>
        <p className="text-sm font-semibold uppercase text-ink">Student details</p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <div className="min-h-32 rounded-md border border-emerald-100 bg-emerald-50/45 p-4" key={item.label}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
            <p className="mt-3 text-xl font-semibold text-ink">{item.value}</p>
            <p className="mt-2 text-xs leading-5 text-slate-600">{item.helper}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function BursaryReceiptPanel({
  application,
  onUpload,
  uploading,
}: {
  application: GraduationApplication;
  onUpload: (file: File) => void;
  uploading: boolean;
}) {
  const request = application.bursaryPaymentRequest;

  if (!request) {
    return null;
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file) {
      onUpload(file);
    }

    event.target.value = '';
  }

  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50/70 shadow-soft">
      <div className="border-b border-amber-200 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-amber-700">Bursary action required</p>
            <h2 className="mt-1 text-xl font-semibold text-ink">Upload payment receipt</h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Bursary has paused your application until this payment is confirmed.
            </p>
          </div>
          <div className="rounded-md border border-amber-200 bg-white px-3 py-2 text-sm font-semibold text-amber-800">
            {formatCurrency(request.amount, request.currency)}
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-5 lg:grid-cols-[1fr_280px]">
        <div className="rounded-md border border-amber-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">Bursary note</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">{request.note}</p>
          {request.requestedAt ? (
            <p className="mt-3 text-xs font-medium text-slate-500">Requested {formatDateTime(request.requestedAt)}</p>
          ) : null}
        </div>

        <div className="rounded-md border border-amber-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">Receipt status</p>
          {application.bursaryReceipt ? (
            <div className="mt-3 rounded-md border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-900">
              <p className="font-semibold">Receipt uploaded</p>
              <p className="mt-1 break-words text-xs">
                {application.bursaryReceipt.originalName ?? 'Payment receipt'}{' '}
                {formatFileSize(application.bursaryReceipt.sizeBytes)}
              </p>
              <p className="mt-1 text-xs">Uploaded {formatDateTime(application.bursaryReceipt.createdAt)}</p>
            </div>
          ) : (
            <p className="mt-2 text-sm leading-6 text-slate-600">No receipt uploaded yet.</p>
          )}

          <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-md bg-spruce px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-spruce-dark">
            {uploading ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <FileUp aria-hidden className="h-4 w-4" />}
            {application.bursaryReceipt ? 'Replace receipt' : 'Upload receipt'}
            <input
              className="sr-only"
              type="file"
              accept=".pdf,image/png,image/jpeg"
              disabled={uploading}
              onChange={handleFileChange}
            />
          </label>
          <p className="mt-2 text-xs leading-5 text-slate-500">Accepted formats: PDF, JPG, or PNG.</p>
        </div>
      </div>
    </section>
  );
}

function RegistryDocumentRequestPanel({
  application,
  documents,
  onUpload,
  uploadingDocumentType,
}: {
  application: GraduationApplication;
  documents: DocumentState | null;
  onUpload: (documentType: DocumentType, file: File) => void;
  uploadingDocumentType: DocumentType | null;
}) {
  const request = application.registryDocumentRequest;

  if (!request) {
    return null;
  }

  const requestedTypes = new Set(request.requiredDocumentTypes);
  const requestedDocuments =
    documents?.requiredDocuments.filter((document) => requestedTypes.has(document.type)) ?? [];

  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50/70 shadow-soft">
      <div className="border-b border-amber-200 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-amber-700">Registry action required</p>
            <h2 className="mt-1 text-xl font-semibold text-ink">Complete requested documents</h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Registry has returned your application for document correction. Upload the requested documents so review can continue.
            </p>
          </div>
          {request.requestedAt ? (
            <div className="rounded-md border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-800">
              Requested {formatDateTime(request.requestedAt)}
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 p-5">
        <div className="rounded-md border border-amber-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase text-slate-500">Registry remarks</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">{request.remarks}</p>
          {request.missingChecks.length > 0 ? (
            <div className="mt-3 grid gap-1 text-xs leading-5 text-slate-600">
              {request.missingChecks.map((item) => (
                <p key={item}>Missing or incorrect: {item}</p>
              ))}
            </div>
          ) : null}
        </div>

        {requestedDocuments.length > 0 ? (
          <div className="grid gap-3">
            {requestedDocuments.map((requirement) => (
              <DocumentRequirementCard
                key={requirement.type}
                onUpload={onUpload}
                requirement={requirement}
                uploading={uploadingDocumentType === requirement.type}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-line bg-white p-4 text-sm text-slate-600">
            Loading requested document slots. Refresh the page if this stays empty.
          </div>
        )}
      </div>
    </section>
  );
}

function WorkflowTracker({ status }: { status: string }) {
  const statusMeta = getApplicationStatusMeta(status);
  const currentIndex = clearanceWorkflowSteps.findIndex((step) => step.key === statusMeta.step);
  const workflowComplete = Boolean(statusMeta.workflowComplete);

  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase text-ink">Clearance status</p>

        </div>

      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {clearanceWorkflowSteps.map((step, index) => {
          const complete = workflowComplete || index < currentIndex;
          const active = !workflowComplete && index === currentIndex;

          return (
            <div
              className={`rounded-md border p-3 ${active
                ? 'border-spruce bg-emerald-50'
                : complete
                  ? 'border-emerald-100 bg-white'
                  : 'border-line bg-mist'
                }`}
              key={step.key}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2
                  aria-hidden
                  className={`h-4 w-4 ${complete || active ? 'text-spruce' : 'text-slate-300'}`}
                />
                <p className={`text-sm font-semibold ${active ? 'text-spruce' : 'text-ink'}`}>{step.label}</p>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-600">{step.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function StudentProgress({
  activeStep,
  applicationComplete,
  documentsComplete,
  finalSubmitted,
  onSelectApplication,
  onSelectDocuments,
  onSelectProfile,
  onSelectSubmit,
  onSelectSurvey,
  profileComplete,
  surveyComplete,
  startingApplication,
}: {
  activeStep: WorkspaceStep;
  applicationComplete: boolean;
  documentsComplete: boolean;
  finalSubmitted: boolean;
  onSelectApplication: () => void;
  onSelectDocuments: () => void;
  onSelectProfile: () => void;
  onSelectSubmit: () => void;
  onSelectSurvey: () => void;
  profileComplete: boolean;
  surveyComplete: boolean;
  startingApplication: boolean;
}) {
  const steps = [
    {
      label: 'Profile',
      active: activeStep === 'profile',
      complete: true,
      disabled: false,
      onClick: onSelectProfile,
    },
    {
      label: 'Application',
      active: activeStep === 'application',
      complete: applicationComplete,
      disabled: !profileComplete || startingApplication,
      onClick: onSelectApplication,
    },
    {
      label: 'Documents',
      active: activeStep === 'documents',
      complete: documentsComplete,
      disabled: !applicationComplete,
      onClick: onSelectDocuments,
    },
    {
      label: 'Survey',
      active: activeStep === 'survey',
      complete: surveyComplete,
      disabled: !documentsComplete,
      onClick: onSelectSurvey,
    },
    {
      label: 'Submit',
      active: activeStep === 'submit',
      complete: finalSubmitted,
      disabled: !surveyComplete,
      onClick: onSelectSubmit,
    },
  ];

  return (
    <section className="rounded-lg border border-line bg-white p-6 shadow-soft">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-marigold">Graduation Application</p>
        <h2 className="mt-1 text-2xl font-semibold text-ink">Let&apos;s get you ready to graduate</h2>
        <p className="mt-1 text-sm text-marigold">
          Work through each step in order — your progress saves as you go.
        </p>
      </div>
      <div className="mt-6 grid gap-2 sm:grid-cols-5">
        {steps.map((step, index) => (
          <button
            aria-label={`${index + 1} ${step.label}`}
            aria-current={step.active ? 'step' : undefined}
            className={`flex items-center gap-2 rounded-pill border px-4 py-2.5 text-left text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${step.active
              ? 'border-ink bg-ink text-white'
              : step.complete
                ? 'border-line bg-white text-ink hover:bg-mist'
                : 'border-transparent bg-mist text-marigold hover:bg-line'
              }`}
            disabled={step.disabled}
            key={step.label}
            onClick={step.onClick}
            type="button"
          >
            <span
              className={`flex h-5 w-5 flex-none items-center justify-center rounded-full text-xs ${step.active ? 'bg-white text-ink' : step.complete ? 'bg-ink text-white' : 'bg-white text-marigold'
                }`}
            >
              {step.complete && !step.active ? <CheckCircle2 aria-hidden className="h-3.5 w-3.5" /> : index + 1}
            </span>
            {step.label}
          </button>
        ))}
      </div>
    </section>
  );
}

function ApplicationDraftForm({
  application,
  form,
  loading,
  onChange,
  onStart,
  onSubmit,
  profile,
  profileComplete,
  saving,
}: {
  application: GraduationApplication | null;
  form: ApplicationFormState;
  loading: boolean;
  onChange: (form: ApplicationFormState) => void;
  onStart: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  profile: StudentProfile | null;
  profileComplete: boolean;
  saving: boolean;
}) {
  if (!application) {
    return (
      <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <div className="flex items-center gap-2">
          <FileText aria-hidden className="h-5 w-5 text-spruce" />
          <h2 className="text-lg font-semibold text-ink">Graduation Application</h2>
        </div>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Start a draft application using your completed profile details. You can still edit the
          ceremony intent, mailing address, and notes before document upload.
        </p>
        <button
          className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-spruce px-4 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={!profileComplete || loading}
          onClick={onStart}
          type="button"
        >
          {loading ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <ArrowRight aria-hidden className="h-4 w-4" />}
          Start Application Draft
        </button>
      </section>
    );
  }

  return (
    <form className="rounded-lg border border-line bg-white shadow-soft" onSubmit={onSubmit}>
      <div className="border-b border-line p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FileText aria-hidden className="h-5 w-5 text-spruce" />
              <h2 className="text-lg font-semibold text-ink">Graduation Application</h2>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Draft for {application.term}. Status: {getApplicationStatusMeta(application.status).label}
            </p>
          </div>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-spruce px-4 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
            disabled={saving}
            type="submit"
          >
            {saving ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Save aria-hidden className="h-4 w-4" />}
            Save Application
          </button>
        </div>
      </div>

      <div className="grid gap-6 p-5">
        <section className="grid gap-4">
          <SectionHeading title="Academic Confirmation" />
          <div className="grid gap-3 md:grid-cols-3">
            <ReadOnlyField label="Graduation term" value={application.term} />
            <ReadOnlyField label="Major" value={profile?.major ?? application.profile.major ?? 'Not selected'} />
            <ReadOnlyField
              label="Current GPA"
              value={String(profile?.currentGpa ?? application.profile.currentGpa ?? '')}
            />
          </div>
        </section>

        <section className="grid gap-4 border-t border-line pt-5">
          <SectionHeading title="Certificate Details" />
          <ReadOnlyField
            label="Name on certificate"
            value={application.nameOnCertificate ?? application.profile.name}
          />
          <label className="grid gap-1 text-sm font-medium text-ink">
            Detailed address for shipping of Diploma and Transcript
            <textarea
              className="min-h-24 rounded-md border border-line px-3 py-2 text-sm font-normal outline-none focus:border-spruce"
              onChange={(event) => onChange({ ...form, certificateMailingAddress: event.target.value })}
              required
              value={form.certificateMailingAddress}
            />
          </label>
        </section>

        <section className="grid gap-4 border-t border-line pt-5">
          <SectionHeading title="OpenERP Confirmation" />
          <div className="grid gap-3 md:grid-cols-2">
            <OpenErpCheckField
              label="8. Have you declared your concentration by completing a concentration declaration form?"
              name="concentrationDeclared"
              onChange={onChange}
              state={form}
            />
            <OpenErpCheckField
              label="9. Is your Major accurately captured on OpenERP?"
              name="majorAccurate"
              onChange={onChange}
              state={form}
            />
            <OpenErpCheckField
              label="10. Is your Concentration accurately captured on OpenERP?"
              name="concentrationAccurate"
              onChange={onChange}
              state={form}
            />
            <OpenErpCheckField
              label="11. Is your Minor accurately captured on OpenERP?"
              name="minorAccurate"
              onChange={onChange}
              state={form}
            />
            <OpenErpCheckField
              label="12. Is your full name accurately captured on OpenERP?"
              name="fullNameAccurate"
              onChange={onChange}
              state={form}
            />
            <OpenErpCheckField
              label="13. Is your date of birth accurately captured on OpenERP?"
              name="dateOfBirthAccurate"
              onChange={onChange}
              state={form}
            />
            <OpenErpCheckField
              label="14. Is your gender accurately captured on OpenERP?"
              name="genderAccurate"
              onChange={onChange}
              state={form}
            />
            <OpenErpCheckField
              label="15. Is your state of origin accurately captured on OpenERP?"
              name="stateOfOriginAccurate"
              onChange={onChange}
              state={form}
            />
            <OpenErpCheckField
              label="16. Is your Catalog year accurately captured on OpenERP?"
              name="catalogYearAccurate"
              onChange={onChange}
              state={form}
            />
          </div>
        </section>

        <section className="grid gap-4 border-t border-line pt-5">
          <SectionHeading title="Confirmation" />
          <label className="grid gap-1 text-sm font-medium text-ink">
            Student remarks
            <textarea
              className="min-h-24 rounded-md border border-line px-3 py-2 text-sm font-normal outline-none focus:border-spruce"
              onChange={(event) => onChange({ ...form, studentRemarks: event.target.value })}
              value={form.studentRemarks}
            />
          </label>
          <label className="flex items-start gap-3 rounded-md border border-line bg-mist p-3 text-sm text-ink">
            <input
              checked={form.attestationAccepted}
              className="mt-1 h-4 w-4 accent-spruce"
              onChange={(event) => onChange({ ...form, attestationAccepted: event.target.checked })}
              required
              type="checkbox"
            />
            <span>
              I confirm that my profile and application details are correct, and I understand that
              SITC and Registry will use this information for graduation clearance.
            </span>
          </label>
        </section>
      </div>
    </form>
  );
}

function DocumentUploadsPanel({
  applicationComplete,
  documents,
  loading,
  onRefresh,
  onUpload,
  uploadingDocumentType,
}: {
  applicationComplete: boolean;
  documents: DocumentState | null;
  loading: boolean;
  onRefresh: () => void;
  onUpload: (documentType: DocumentType, file: File) => void;
  uploadingDocumentType: DocumentType | null;
}) {
  if (!applicationComplete) {
    return (
      <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <div className="flex items-center gap-2">
          <FileUp aria-hidden className="h-5 w-5 text-spruce" />
          <h2 className="text-lg font-semibold text-ink">Document Uploads</h2>
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Complete and save the graduation application before uploading documents.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-line bg-white shadow-soft">
      <div className="border-b border-line p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FileUp aria-hidden className="h-5 w-5 text-spruce" />
              <h2 className="text-lg font-semibold text-ink">Document Uploads</h2>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              {documents?.documentCount ?? 0} uploaded. Required set {documents?.requiredComplete ? 'complete' : 'pending'}.
            </p>
          </div>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-semibold text-ink shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
            onClick={onRefresh}
            type="button"
          >
            {loading ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <FileText aria-hidden className="h-4 w-4" />}
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-3 p-5">
        {loading && !documents ? (
          <div className="flex min-h-40 items-center justify-center rounded-md border border-line bg-mist text-sm font-medium text-ink">
            <Loader2 aria-hidden className="mr-2 h-4 w-4 animate-spin text-spruce" />
            Loading document checklist
          </div>
        ) : null}

        {documents?.requiredDocuments.map((requirement) => (
          <DocumentRequirementCard
            key={requirement.type}
            onUpload={onUpload}
            requirement={requirement}
            uploading={uploadingDocumentType === requirement.type}
          />
        ))}
      </div>
    </section>
  );
}

function DocumentRequirementCard({
  onUpload,
  requirement,
  uploading,
}: {
  onUpload: (documentType: DocumentType, file: File) => void;
  requirement: DocumentRequirement;
  uploading: boolean;
}) {
  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file) {
      onUpload(requirement.type, file);
    }

    event.target.value = '';
  }

  return (
    <div className="rounded-md border border-line bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CheckCircle2
              aria-hidden
              className={`h-4 w-4 ${requirement.uploaded ? 'text-spruce' : 'text-slate-300'}`}
            />
            <h3 className="text-sm font-semibold text-ink">{requirement.label}</h3>
            {requirement.required ? (
              <span className="rounded-md bg-mist px-2 py-1 text-xs font-semibold text-slate-600">Required</span>
            ) : null}
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{requirement.description}</p>
          {requirement.upload ? (
            <p className="mt-2 text-sm font-medium text-spruce">
              {requirement.upload.originalName ?? 'Uploaded file'} {formatFileSize(requirement.upload.sizeBytes)}
            </p>
          ) : null}
        </div>
        <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-semibold text-ink shadow-sm">
          {uploading ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <FileUp aria-hidden className="h-4 w-4" />}
          {requirement.uploaded ? 'Replace' : 'Upload'}
          <input
            accept=".pdf,.jpg,.jpeg,.png"
            className="sr-only"
            disabled={uploading}
            onChange={handleFileChange}
            type="file"
          />
        </label>
      </div>
    </div>
  );
}

function SeniorSurveyForm({
  documentsComplete,
  form,
  onChange,
  onSave,
  saving,
  survey,
}: {
  documentsComplete: boolean;
  form: SurveyAnswers;
  onChange: (form: SurveyAnswers) => void;
  onSave: (submit: boolean) => void;
  saving: boolean;
  survey: SurveyState | null;
}) {
  if (!documentsComplete) {
    return (
      <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <div className="flex items-center gap-2">
          <FileText aria-hidden className="h-5 w-5 text-spruce" />
          <h2 className="text-lg font-semibold text-ink">Senior Survey</h2>
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Upload all required documents before completing the senior survey.
        </p>
      </section>
    );
  }

  return (
    <form
      className="rounded-lg border border-line bg-white shadow-soft"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(false);
      }}
    >
      <div className="border-b border-line p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FileText aria-hidden className="h-5 w-5 text-spruce" />
              <h2 className="text-lg font-semibold text-ink">Senior Survey</h2>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              {survey?.submittedAt ? 'Submitted' : 'Draft'} graduation senior survey.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-semibold text-ink shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
              disabled={saving}
              type="submit"
            >
              {saving ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Save aria-hidden className="h-4 w-4" />}
              Save Survey
            </button>
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-spruce px-4 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
              disabled={saving}
              onClick={() => onSave(true)}
              type="button"
            >
              {saving ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <CheckCircle2 aria-hidden className="h-4 w-4" />}
              Submit Survey
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 p-5">
        <section className="grid gap-4">
          <SectionHeading title="Contact and Plans" />
          <SelectField
            label="1. What is your immediate plan after graduation?"
            onChange={(value) => onChange({ ...form, immediatePlan: value })}
            options={immediatePlanOptions}
            placeholder="Select plan"
            required
            value={form.immediatePlan}
          />
          {form.immediatePlan === 'OTHER' ? (
            <TextField
              label="Other immediate plan"
              onChange={(value) => onChange({ ...form, immediatePlanOther: value })}
              value={form.immediatePlanOther}
            />
          ) : null}
        </section>

        <section className="grid gap-4 border-t border-line pt-5">
          <SectionHeading title="Commencement Attendance" />
          <div className="grid gap-3 md:grid-cols-2">
            <SelectField
              label="2. Attend the 16th Commencement Ceremony in May 2025?"
              onChange={(value) =>
                onChange({
                  ...form,
                  attendCommencement: value,
                  attendCommencementReason: value === 'NO' ? form.attendCommencementReason : '',
                  preferVirtualConferral: value === 'NO' ? form.preferVirtualConferral : '',
                })
              }
              options={yesMaybeNoOptions}
              placeholder="Select answer"
              required
              value={form.attendCommencement}
            />
            <SelectField
              label="4. Attend the 2025 Senior Week?"
              onChange={(value) =>
                onChange({
                  ...form,
                  attendSeniorWeek: value,
                  attendSeniorWeekReason: value === 'NO' ? form.attendSeniorWeekReason : '',
                })
              }
              options={yesMaybeNoOptions}
              placeholder="Select answer"
              required
              value={form.attendSeniorWeek}
            />
          </div>
          {form.attendCommencement === 'NO' ? (
            <div className="grid gap-3 md:grid-cols-2">
              <TextField
                label="Reason for not attending commencement"
                onChange={(value) => onChange({ ...form, attendCommencementReason: value })}
                required
                value={form.attendCommencementReason}
              />
              <SelectField
                label="3. Prefer virtual graduation if not attending?"
                onChange={(value) => onChange({ ...form, preferVirtualConferral: value })}
                options={yesMaybeNoOptions}
                placeholder="Select answer"
                required
                value={form.preferVirtualConferral}
              />
            </div>
          ) : null}
          {form.attendSeniorWeek === 'NO' ? (
            <TextField
              label="Reason for not attending Senior Week"
              onChange={(value) => onChange({ ...form, attendSeniorWeekReason: value })}
              required
              value={form.attendSeniorWeekReason}
            />
          ) : null}
        </section>

        <section className="grid gap-4 border-t border-line pt-5">
          <SectionHeading title="Tickets and Guest Logistics" />
          <div className="grid gap-3 md:grid-cols-2">
            <SelectField
              label="5. Suggested number of commencement tickets"
              onChange={(value) => onChange({ ...form, commencementTicketSuggestion: value })}
              options={commencementTicketOptions}
              placeholder="Select tickets"
              required
              value={form.commencementTicketSuggestion}
            />
            <SelectField
              label="6. Suggested number of Graduation Awards Dinner tickets"
              onChange={(value) => onChange({ ...form, awardsDinnerTicketSuggestion: value })}
              options={awardsDinnerTicketOptions}
              placeholder="Select tickets"
              required
              value={form.awardsDinnerTicketSuggestion}
            />
          </div>
          <SelectField
            label="7. Best way to inform parents, friends and family"
            onChange={(value) => onChange({ ...form, commencementInfoMethod: value })}
            options={commencementInfoOptions}
            placeholder="Select method"
            required
            value={form.commencementInfoMethod}
          />
          {form.commencementInfoMethod === 'OTHER' ? (
            <TextField
              label="Other information method"
              onChange={(value) => onChange({ ...form, commencementInfoOther: value })}
              value={form.commencementInfoOther}
            />
          ) : null}
          <div className="grid gap-3 md:grid-cols-2">
            <SelectField
              label="8. Preferred lodging for invitees/guests"
              onChange={(value) => onChange({ ...form, guestLodgingPreference: value })}
              options={guestLodgingOptions}
              placeholder="Select lodging"
              required
              value={form.guestLodgingPreference}
            />
            <SelectField
              label="9. How will guests get around town?"
              onChange={(value) => onChange({ ...form, townTransportPlan: value })}
              options={townTransportOptions}
              placeholder="Select transport"
              required
              value={form.townTransportPlan}
            />
          </div>
          {form.guestLodgingPreference === 'OTHER' ? (
            <TextField
              label="Other lodging preference"
              onChange={(value) => onChange({ ...form, guestLodgingOther: value })}
              value={form.guestLodgingOther}
            />
          ) : null}
          {form.townTransportPlan === 'OTHER' ? (
            <TextField
              label="Other transport plan"
              onChange={(value) => onChange({ ...form, townTransportOther: value })}
              value={form.townTransportOther}
            />
          ) : null}
        </section>

        <section className="grid gap-4 border-t border-line pt-5">
          <SectionHeading title="Commencement Experience" />
          <SelectField
            label="10. How do you feel about having a Class of 2025 Photo Album?"
            onChange={(value) => onChange({ ...form, photoAlbumOpinion: value })}
            options={photoAlbumOptions}
            placeholder="Select opinion"
            required
            value={form.photoAlbumOpinion}
          />
          <SelectField
            label="11. Have you attended any AUN Commencement Ceremonies?"
            onChange={(value) =>
              onChange({
                ...form,
                attendedCommencementBefore: value,
                attendedCommencementYear: value === 'YES' ? form.attendedCommencementYear : '',
                commencementOrganizationRating: value === 'YES' ? form.commencementOrganizationRating : '',
              })
            }
            options={priorCommencementOptions}
            placeholder="Select answer"
            required
            value={form.attendedCommencementBefore}
          />
          {form.attendedCommencementBefore === 'YES' ? (
            <div className="grid gap-3 md:grid-cols-2">
              <TextField
                label="If yes, what year?"
                onChange={(value) => onChange({ ...form, attendedCommencementYear: value })}
                required
                value={form.attendedCommencementYear}
              />
              <SelectField
                label="12. Rate the Commencement Ceremony organization"
                onChange={(value) => onChange({ ...form, commencementOrganizationRating: value })}
                options={organizationRatingOptions}
                placeholder="Select rating"
                required
                value={form.commencementOrganizationRating}
              />
            </div>
          ) : null}
          <TextareaField
            label="Suggestions for improvement"
            onChange={(value) => onChange({ ...form, improvementSuggestions: value })}
            value={form.improvementSuggestions}
          />
          <TextareaField
            label="13. Award category suggestions for Graduation Awards Ceremony"
            onChange={(value) => onChange({ ...form, awardCategorySuggestions: value })}
            value={form.awardCategorySuggestions}
          />
        </section>

        <section className="grid gap-4 border-t border-line pt-5">
          <SectionHeading title="AUN Experience" />
          <CheckboxGroup
            label="14. Programs participated in during your studies at AUN"
            onChange={(value) => onChange({ ...form, participatedPrograms: value })}
            options={participatedProgramOptions}
            value={form.participatedPrograms}
          />
          {form.participatedPrograms.includes('OTHER') ? (
            <TextField
              label="Other program"
              onChange={(value) => onChange({ ...form, participatedProgramsOther: value })}
              value={form.participatedProgramsOther}
            />
          ) : null}
          <TextareaField
            label="15. Expectations for the 2025 Commencement Ceremony"
            onChange={(value) => onChange({ ...form, commencementExpectations: value })}
            required
            value={form.commencementExpectations}
          />
          <TextareaField
            label="16. In one or two or three words, what would you say “My AUN is” to you after four/five-years?"
            onChange={(value) => onChange({ ...form, myAunIs: value })}
            required
            value={form.myAunIs}
          />
        </section>
      </div>
    </form>
  );
}

function ReviewSubmitPanel({
  application,
  documents,
  onSubmit,
  profile,
  submitting,
  survey,
}: {
  application: GraduationApplication | null;
  documents: DocumentState | null;
  onSubmit: () => void;
  profile: StudentProfile | null;
  submitting: boolean;
  survey: SurveyState | null;
}) {
  const ready = Boolean(application?.formComplete && documents?.requiredComplete && survey?.submittedAt);
  const submitted = Boolean(application?.submittedAt);
  const missingSections = [
    application?.formComplete ? null : 'graduation application',
    documents?.requiredComplete ? null : 'required documents',
    survey?.submittedAt ? null : 'senior survey',
  ].filter(Boolean);
  const openErpChecks = normalizeOpenErpChecks(application?.openErpChecks ?? null);
  const title = submitted ? 'Submitted Application Review' : 'Review and Submit';
  const description = submitted
    ? 'Read-only snapshot of the graduation application that was sent into clearance review.'
    : 'Review the saved graduation application before sending it into clearance review.';

  return (
    <section className="rounded-lg border border-line bg-white shadow-soft">
      <div className="border-b border-line p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CheckCircle2 aria-hidden className="h-5 w-5 text-spruce" />
              <h2 className="text-lg font-semibold text-ink">{title}</h2>
            </div>
            <p className="mt-1 text-sm text-slate-600">{description}</p>
          </div>
          <div className="rounded-md border border-line bg-mist px-3 py-2 text-sm font-semibold text-ink">
            {submitted ? 'Submitted' : ready ? 'Ready to submit' : 'Not ready'}
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-5">
        <ReviewSection title="Student Details">
          <ReviewItem label="Student name" value={profile ? `${profile.firstName} ${profile.middleName ?? ''} ${profile.lastName}` : application?.profile.name} />
          <ReviewItem label="AUN Student ID" value={profile?.studentId ?? application?.profile.studentId} />
          <ReviewItem label="AUN email" value={profile?.email} />
          <ReviewItem label="Phone" value={profile?.phone} />
          <ReviewItem label="Major" value={profile?.major ?? application?.profile.major} />
          <ReviewItem label="Concentration" value={profile?.concentration} />
          <ReviewItem label="Minor" value={profile?.minor} />
          <ReviewItem label="Catalog year" value={profile?.catalogYearLabel ?? application?.profile.catalogYear} />
          <ReviewItem label="Expected graduation term" value={profile?.expectedGraduationTerm ?? application?.term} />
          <ReviewItem label="Current GPA" value={String(profile?.currentGpa ?? application?.profile.currentGpa ?? '')} />
          <ReviewItem label="Mailing address" value={profile?.shippingAddress} wide />
          <ReviewItem
            label="Parent/guardian"
            value={[profile?.parentGuardian.name, profile?.parentGuardian.relationship, profile?.parentGuardian.phone]
              .filter(Boolean)
              .join(' | ')}
            wide
          />
        </ReviewSection>

        <ReviewSection title="Graduation Application">
          <ReviewItem label="Status" value={getApplicationStatusMeta(application?.status).label} />
          <ReviewItem label="Submitted at" value={formatDateTime(application?.submittedAt)} />
          <ReviewItem label="Name on certificate" value={application?.nameOnCertificate ?? application?.profile.name} />
          <ReviewItem label="Diploma and transcript shipping address" value={application?.certificateMailingAddress} wide />
          <ReviewItem label="Student remarks" value={application?.studentRemarks} wide />
          {openErpReviewFields.map((field) => (
            <ReviewItem
              key={field.name}
              label={field.label}
              value={valueLabel(openErpChecks[field.name], yesNoOptions)}
            />
          ))}
        </ReviewSection>

        <ReviewSection title="Uploaded Documents">
          {documents?.requiredDocuments.map((document) => (
            <ReviewItem
              key={document.type}
              label={document.label}
              value={
                document.uploaded
                  ? `${document.upload?.originalName ?? 'Uploaded file'} ${formatFileSize(document.upload?.sizeBytes ?? null)}`
                  : 'Missing'
              }
            />
          ))}
          {!documents ? <ReviewItem label="Document checklist" value="Not loaded" wide /> : null}
        </ReviewSection>

        <ReviewSection title="Senior Survey">
          <ReviewItem label="Survey submitted" value={survey?.submittedAt ? formatDateTime(survey.submittedAt) : 'No'} />
          {survey
            ? surveyReviewFields.map((field) => (
              <ReviewItem
                key={field.name}
                label={field.label}
                value={formatSurveyReviewValue(survey.answers[field.name], field.options)}
                wide={typeof survey.answers[field.name] === 'string' && String(survey.answers[field.name]).length > 80}
              />
            ))
            : null}
        </ReviewSection>

        <div className="rounded-md border border-line bg-mist p-4">
          {submitted ? (
            <p className="text-sm font-medium text-spruce">
              This application was submitted on {formatDateTime(application?.submittedAt)} and is now in the clearance workflow.
            </p>
          ) : (
            <>
              <p className="text-sm leading-6 text-slate-700">
                Final submission locks this draft for normal student edits and sends it to the Bursary clearance queue.
              </p>
              {missingSections.length > 0 ? (
                <p className="mt-2 text-sm font-medium text-red-700">
                  Complete before submitting: {missingSections.join(', ')}.
                </p>
              ) : null}
              <button
                className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-spruce px-4 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-slate-400"
                disabled={!ready || submitting}
                onClick={onSubmit}
                type="button"
              >
                {submitting ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <CheckCircle2 aria-hidden className="h-4 w-4" />}
                Submit Graduation Application
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function ReviewSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="rounded-md border border-line bg-white">
      <div className="border-b border-line px-4 py-3">
        <h3 className="text-sm font-semibold uppercase text-slate-500">{title}</h3>
      </div>
      <div className="grid gap-0 md:grid-cols-2">{children}</div>
    </section>
  );
}

function ReviewItem({ label, value, wide = false }: { label: string; value?: string | null; wide?: boolean }) {
  return (
    <div className={`border-b border-line px-4 py-3 last:border-b-0 md:[&:nth-last-child(-n+2)]:border-b-0 ${wide ? 'md:col-span-2' : ''}`}>
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm font-medium leading-6 text-ink">{value?.trim() || 'Not provided'}</p>
    </div>
  );
}

function SectionHeading({ title }: { title: string }) {
  return <h3 className="text-sm font-semibold uppercase text-slate-500">{title}</h3>;
}

function OpenErpCheckField({
  label,
  name,
  onChange,
  state,
}: {
  label: string;
  name: keyof ApplicationOpenErpChecks;
  onChange: (form: ApplicationFormState) => void;
  state: ApplicationFormState;
}) {
  return (
    <SelectField
      label={label}
      onChange={(value) =>
        onChange({
          ...state,
          openErpChecks: {
            ...state.openErpChecks,
            [name]: value,
          },
        })
      }
      options={yesNoOptions}
      placeholder="Select answer"
      required
      value={state.openErpChecks[name]}
    />
  );
}

function TextField({
  label,
  max,
  min,
  onChange,
  required = false,
  step,
  type = 'text',
  value,
}: {
  label: string;
  max?: string;
  min?: string;
  onChange: (value: string) => void;
  required?: boolean;
  step?: string;
  type?: string;
  value: string;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium text-ink">
      {label}
      <input
        className="h-11 rounded-md border border-line px-3 text-sm font-normal outline-none focus:border-spruce"
        max={max}
        min={min}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        step={step}
        type={type}
        value={value}
      />
    </label>
  );
}

function TextareaField({
  label,
  onChange,
  required = false,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  value: string;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium text-ink">
      {label}
      <textarea
        className="min-h-24 rounded-md border border-line px-3 py-2 text-sm font-normal outline-none focus:border-spruce"
        onChange={(event) => onChange(event.target.value)}
        required={required}
        value={value}
      />
    </label>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="grid gap-1 text-sm font-medium text-ink">
      {label}
      <input
        className="h-11 rounded-md border border-line bg-mist px-3 text-sm font-normal text-slate-600"
        readOnly
        value={value}
      />
    </label>
  );
}

function SelectField({
  label,
  onChange,
  options,
  placeholder,
  required = false,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  placeholder: string;
  required?: boolean;
  value: string;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium text-ink">
      {label}
      <select
        className="h-11 rounded-md border border-line bg-white px-3 text-sm font-normal outline-none focus:border-spruce"
        onChange={(event) => onChange(event.target.value)}
        required={required}
        value={value}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function CheckboxGroup({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string[]) => void;
  options: Array<{ label: string; value: string }>;
  value: string[];
}) {
  function toggleOption(optionValue: string) {
    onChange(value.includes(optionValue) ? value.filter((item) => item !== optionValue) : [...value, optionValue]);
  }

  return (
    <fieldset className="grid gap-2 text-sm font-medium text-ink">
      <legend>{label}</legend>
      <div className="grid gap-2 md:grid-cols-2">
        {options.map((option) => (
          <label className="flex items-center gap-2 rounded-md border border-line bg-mist px-3 py-2" key={option.value}>
            <input
              checked={value.includes(option.value)}
              className="h-4 w-4 accent-spruce"
              onChange={() => toggleOption(option.value)}
              type="checkbox"
            />
            <span className="font-normal">{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function profileToForm(profile: StudentProfile): ProfileFormState {
  return {
    firstName: profile.firstName,
    middleName: profile.middleName ?? '',
    lastName: profile.lastName,
    majorCode: profile.majorCode ?? '',
    catalogYearLabel: profile.catalogYearLabel ?? '',
    expectedGraduationTerm: profile.expectedGraduationTerm ?? '',
    concentration: profile.concentration ?? '',
    minor: profile.minor ?? '',
    currentGpa: profile.currentGpa === null ? '' : String(profile.currentGpa),
    phone: profile.phone ?? '',
    shippingAddress: profile.shippingAddress ?? '',
    parentGuardianName: profile.parentGuardian.name ?? '',
    parentGuardianRelationship: profile.parentGuardian.relationship ?? '',
    parentGuardianPhone: profile.parentGuardian.phone ?? '',
    parentGuardianEmail: profile.parentGuardian.email ?? '',
  };
}

function formToPayload(form: ProfileFormState) {
  return {
    firstName: form.firstName,
    middleName: form.middleName,
    lastName: form.lastName,
    majorCode: form.majorCode || null,
    catalogYearLabel: form.catalogYearLabel || null,
    expectedGraduationTerm: form.expectedGraduationTerm || null,
    concentration: form.concentration || null,
    minor: form.minor || null,
    currentGpa: form.currentGpa ? Number(form.currentGpa) : null,
    phone: form.phone || null,
    shippingAddress: form.shippingAddress || null,
    parentGuardian: {
      name: form.parentGuardianName || null,
      relationship: form.parentGuardianRelationship || null,
      phone: form.parentGuardianPhone || null,
      email: form.parentGuardianEmail || null,
    },
  };
}

function applicationToForm(application: GraduationApplication): ApplicationFormState {
  return {
    certificateMailingAddress: application.certificateMailingAddress ?? '',
    openErpChecks: normalizeOpenErpChecks(application.openErpChecks),
    studentRemarks: application.studentRemarks ?? '',
    attestationAccepted: Boolean(application.studentAttestationAcceptedAt),
  };
}

function normalizeOpenErpChecks(openErpChecks: ApplicationOpenErpCheckResponse | null): ApplicationOpenErpChecks {
  return {
    concentrationDeclared: openErpChecks?.concentrationDeclared ?? '',
    majorAccurate: openErpChecks?.majorAccurate ?? '',
    concentrationAccurate: openErpChecks?.concentrationAccurate ?? '',
    minorAccurate: openErpChecks?.minorAccurate ?? '',
    fullNameAccurate: openErpChecks?.fullNameAccurate ?? '',
    dateOfBirthAccurate: openErpChecks?.dateOfBirthAccurate ?? '',
    genderAccurate: openErpChecks?.genderAccurate ?? '',
    stateOfOriginAccurate: openErpChecks?.stateOfOriginAccurate ?? '',
    catalogYearAccurate: openErpChecks?.catalogYearAccurate ?? '',
  };
}

function applicationFormToPayload(form: ApplicationFormState) {
  return {
    certificateMailingAddress: form.certificateMailingAddress || null,
    openErpChecks: form.openErpChecks,
    studentRemarks: form.studentRemarks || null,
    attestationAccepted: form.attestationAccepted,
  };
}

function surveyToForm(survey: SurveyState): SurveyAnswers {
  return {
    ...emptySurveyAnswers,
    immediatePlan: survey.answers.immediatePlan ?? '',
    immediatePlanOther: survey.answers.immediatePlanOther ?? '',
    attendCommencement: survey.answers.attendCommencement ?? '',
    attendCommencementReason: survey.answers.attendCommencementReason ?? '',
    preferVirtualConferral: survey.answers.preferVirtualConferral ?? '',
    attendSeniorWeek: survey.answers.attendSeniorWeek ?? '',
    attendSeniorWeekReason: survey.answers.attendSeniorWeekReason ?? '',
    commencementTicketSuggestion: survey.answers.commencementTicketSuggestion ?? '',
    awardsDinnerTicketSuggestion: survey.answers.awardsDinnerTicketSuggestion ?? '',
    commencementInfoMethod: survey.answers.commencementInfoMethod ?? '',
    commencementInfoOther: survey.answers.commencementInfoOther ?? '',
    guestLodgingPreference: survey.answers.guestLodgingPreference ?? '',
    guestLodgingOther: survey.answers.guestLodgingOther ?? '',
    townTransportPlan: survey.answers.townTransportPlan ?? '',
    townTransportOther: survey.answers.townTransportOther ?? '',
    photoAlbumOpinion: survey.answers.photoAlbumOpinion ?? '',
    attendedCommencementBefore: survey.answers.attendedCommencementBefore ?? '',
    attendedCommencementYear: survey.answers.attendedCommencementYear ?? '',
    commencementOrganizationRating: survey.answers.commencementOrganizationRating ?? '',
    improvementSuggestions: survey.answers.improvementSuggestions ?? '',
    awardCategorySuggestions: survey.answers.awardCategorySuggestions ?? '',
    participatedPrograms: Array.isArray(survey.answers.participatedPrograms)
      ? survey.answers.participatedPrograms
      : [],
    participatedProgramsOther: survey.answers.participatedProgramsOther ?? '',
    commencementExpectations: survey.answers.commencementExpectations ?? '',
    myAunIs: survey.answers.myAunIs ?? '',
  };
}

function surveyFormToPayload(form: SurveyAnswers) {
  return {
    immediatePlan: form.immediatePlan || null,
    immediatePlanOther: form.immediatePlanOther || null,
    attendCommencement: form.attendCommencement || null,
    attendCommencementReason: form.attendCommencementReason || null,
    preferVirtualConferral: form.preferVirtualConferral || null,
    attendSeniorWeek: form.attendSeniorWeek || null,
    attendSeniorWeekReason: form.attendSeniorWeekReason || null,
    commencementTicketSuggestion: form.commencementTicketSuggestion || null,
    awardsDinnerTicketSuggestion: form.awardsDinnerTicketSuggestion || null,
    commencementInfoMethod: form.commencementInfoMethod || null,
    commencementInfoOther: form.commencementInfoOther || null,
    guestLodgingPreference: form.guestLodgingPreference || null,
    guestLodgingOther: form.guestLodgingOther || null,
    townTransportPlan: form.townTransportPlan || null,
    townTransportOther: form.townTransportOther || null,
    photoAlbumOpinion: form.photoAlbumOpinion || null,
    attendedCommencementBefore: form.attendedCommencementBefore || null,
    attendedCommencementYear: form.attendedCommencementYear || null,
    commencementOrganizationRating: form.commencementOrganizationRating || null,
    improvementSuggestions: form.improvementSuggestions || null,
    awardCategorySuggestions: form.awardCategorySuggestions || null,
    participatedPrograms: form.participatedPrograms,
    participatedProgramsOther: form.participatedProgramsOther || null,
    commencementExpectations: form.commencementExpectations || null,
    myAunIs: form.myAunIs || null,
  };
}

function valueLabel(value: unknown, options: Array<{ label: string; value: string }>) {
  if (typeof value !== 'string' || !value) {
    return '';
  }

  return options.find((option) => option.value === value)?.label ?? value;
}

function formatSurveyReviewValue(value: unknown, options?: Array<{ label: string; value: string }>) {
  if (Array.isArray(value)) {
    const labels = value.map((item) => (options ? valueLabel(item, options) : String(item))).filter(Boolean);

    return labels.join(', ');
  }

  if (typeof value === 'string') {
    return options ? valueLabel(value, options) : value;
  }

  return '';
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return '';
  }

  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatDateOnly(value: string | null | undefined) {
  if (!value) {
    return '';
  }

  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
  }).format(new Date(value));
}

function formatGpa(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(2) : 'Pending';
}

function getFinalRegistryReview(application: GraduationApplication) {
  const finalRegistryLog = [...(application.workflowLog ?? [])]
    .sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime())
    .find((log) => log.action === 'FINAL_REGISTRY_CLEARED');
  const metadata = toRecord(finalRegistryLog?.metadata);
  const review = toRecord(metadata.finalRegistryReview);

  return {
    completionTerm: getLogString(review, 'completionTerm'),
    degreeHonors: getLogString(review, 'degreeHonors'),
    finalGpa: getLogNumber(review, 'finalGpa'),
    graduationDate: getLogString(review, 'graduationDate'),
  };
}

function getApplicationStatusMeta(status: string | null | undefined) {
  if (!status) {
    return applicationStatusMeta.DRAFT;
  }

  return (
    applicationStatusMeta[status] ?? {
      currentOffice: 'Registry',
      label: status.replaceAll('_', ' ').toLowerCase(),
      nextAction: 'Check your AUN email for updates from Registry.',
      step: 'registry-final' as WorkflowStepKey,
      studentAction: 'No action needed unless contacted.',
      tone: 'neutral' as const,
    }
  );
}

function statusToneClass(tone: 'neutral' | 'success' | 'warning' | 'danger') {
  if (tone === 'success') {
    return 'border-emerald-100 bg-emerald-50 text-emerald-800';
  }

  if (tone === 'warning') {
    return 'border-amber-100 bg-amber-50 text-amber-800';
  }

  if (tone === 'danger') {
    return 'border-red-100 bg-red-50 text-red-700';
  }

  return 'border-line bg-mist text-ink';
}

type SystemLogTone = 'neutral' | 'success' | 'warning' | 'danger';

type SystemLogItem = {
  actor: string | null;
  createdAt: string;
  details: string[];
  id: string;
  title: string;
  tone: SystemLogTone;
};

function buildSystemLogEntries(application: GraduationApplication): SystemLogItem[] {
  const entries = [...(application.workflowLog ?? [])]
    .sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime())
    .map((log) => formatSystemLogEntry(log));

  if (entries.length > 0) {
    return entries;
  }

  const statusMeta = getApplicationStatusMeta(application.status);

  return [
    {
      actor: null,
      createdAt: application.submittedAt ?? application.updatedAt ?? application.createdAt,
      details: [],
      id: `${application.id}-status`,
      title: statusMeta.label,
      tone: statusMeta.tone,
    },
  ];
}

function formatSystemLogEntry(log: WorkflowLogEntry): SystemLogItem {
  const metadata = toRecord(log.metadata);
  const actor = formatWorkflowActor(log.actor);
  const base = {
    actor,
    createdAt: log.createdAt,
    id: log.id,
  };

  switch (log.action) {
    case 'SUBMITTED':
      return {
        ...base,
        details: [],
        title: 'Application submitted',
        tone: 'neutral',
      };
    case 'BURSARY_PAYMENT_REQUESTED': {
      const amount = getLogNumber(metadata, 'amount');
      const currency = getLogString(metadata, 'currency') ?? 'NGN';
      const note = getLogString(metadata, 'note');

      return {
        ...base,
        details: compactStrings([
          amount === null ? null : `Outstanding amount: ${formatCurrency(amount, currency)}`,
          note ? `Reason: ${note}` : null,
        ]),
        title: 'Payment requested',
        tone: 'warning',
      };
    }
    case 'BURSARY_RECEIPT_UPLOADED': {
      const amountPaid = getLogNumber(metadata, 'amountPaid');
      const paymentReference = getLogString(metadata, 'paymentReference');
      const originalName = getLogString(metadata, 'originalName');

      return {
        ...base,
        details: compactStrings([
          amountPaid === null ? null : `Amount paid: ${formatCurrency(amountPaid, 'NGN')}`,
          paymentReference ? `Payment reference: ${paymentReference}` : null,
          originalName ? `Receipt: ${originalName}` : null,
        ]),
        title: 'Payment receipt uploaded',
        tone: 'neutral',
      };
    }
    case 'BURSARY_CLEARED':
      return {
        ...base,
        details: [],
        title: 'Bursary signed off',
        tone: 'success',
      };
    case 'REGISTRY_INTAKE_CLEARED': {
      const checklist = toRecord(metadata.checklist);
      const remarks = getLogString(checklist, 'remarks');

      return {
        ...base,
        details: compactStrings([remarks ? `Remarks: ${remarks}` : null]),
        title: 'Registry intake signed off',
        tone: 'success',
      };
    }
    case 'REGISTRY_DOCUMENTS_REQUESTED': {
      const remarks = getLogString(metadata, 'remarks');
      const requiredDocumentTypes = getLogStringArray(metadata, 'requiredDocumentTypes');

      return {
        ...base,
        details: compactStrings([
          requiredDocumentTypes.length > 0 ? `Documents requested: ${requiredDocumentTypes.map(formatLogAction).join(', ')}` : null,
          remarks ? `Remarks: ${remarks}` : null,
        ]),
        title: 'Registry requested documents',
        tone: 'warning',
      };
    }
    case 'REGISTRY_DOCUMENTS_RESUBMITTED': {
      const requiredDocumentTypes = getLogStringArray(metadata, 'requiredDocumentTypes');

      return {
        ...base,
        details: compactStrings([
          requiredDocumentTypes.length > 0 ? `Documents uploaded: ${requiredDocumentTypes.map(formatLogAction).join(', ')}` : null,
        ]),
        title: 'Requested documents uploaded',
        tone: 'neutral',
      };
    }
    case 'PROGRAM_CHAIR_CLEARED':
      return {
        ...base,
        details: compactStrings([getLogString(metadata, 'comments') ? `Comment: ${getLogString(metadata, 'comments')}` : null]),
        title: 'Program Chair signed off',
        tone: 'success',
      };
    case 'PROGRAM_CHAIR_NOT_CLEARED':
      return {
        ...base,
        details: compactStrings([getLogString(metadata, 'comments') ? `Comment: ${getLogString(metadata, 'comments')}` : null]),
        title: 'Program Chair requested follow-up',
        tone: 'warning',
      };
    case 'DEAN_CLEARED':
      return {
        ...base,
        details: compactStrings([getLogString(metadata, 'comments') ? `Comment: ${getLogString(metadata, 'comments')}` : null]),
        title: 'Dean signed off',
        tone: 'success',
      };
    case 'DEAN_NOT_CLEARED':
      return {
        ...base,
        details: compactStrings([getLogString(metadata, 'comments') ? `Comment: ${getLogString(metadata, 'comments')}` : null]),
        title: 'Dean requested follow-up',
        tone: 'warning',
      };
    case 'FINAL_REGISTRY_CLEARED': {
      const review = toRecord(metadata.finalRegistryReview);
      const completionTerm = getLogString(review, 'completionTerm');
      const finalGpa = getLogNumber(review, 'finalGpa');
      const degreeHonors = getLogString(review, 'degreeHonors');
      const comments = getLogString(review, 'comments');

      return {
        ...base,
        details: compactStrings([
          completionTerm ? `Degree requirement completed in: ${completionTerm}` : null,
          finalGpa === null ? null : `Final GPA: ${finalGpa.toFixed(2)}`,
          degreeHonors ? `Degree honors: ${degreeHonors}` : null,
          comments ? `Comment: ${comments}` : null,
        ]),
        title: 'Final Registry signed off',
        tone: 'success',
      };
    }
    case 'PROVOST_SIGNED_OFF':
      return {
        ...base,
        details: [],
        title: 'Application completed',
        tone: 'success',
      };
    default:
      return {
        ...base,
        details: [],
        title: formatLogAction(log.action),
        tone: 'neutral',
      };
  }
}

function formatWorkflowActor(actor: WorkflowLogEntry['actor']) {
  if (!actor) {
    return null;
  }

  const role = roleLabel(actor.role);
  const name = actor.name?.trim() || actor.email;

  return `${role}: ${name}`;
}

function roleLabel(role: string) {
  const labels: Record<string, string> = {
    ADMIN: 'Admin',
    BURSARY_OFFICER: 'Bursary',
    DEAN: 'Dean',
    PROGRAM_CHAIR: 'Program Chair',
    PROVOST: 'Provost',
    REGISTRY_OFFICER: 'Registry',
    STUDENT: 'Student',
  };

  return labels[role] ?? formatLogAction(role);
}

function systemLogToneClass(tone: SystemLogTone) {
  if (tone === 'success') {
    return 'border-emerald-100 bg-emerald-50 text-spruce';
  }

  if (tone === 'warning') {
    return 'border-amber-100 bg-amber-50 text-amber-700';
  }

  if (tone === 'danger') {
    return 'border-red-100 bg-red-50 text-red-700';
  }

  return 'border-line bg-white text-slate-500';
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function getLogString(record: Record<string, unknown>, key: string) {
  const value = record[key];

  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function getLogNumber(record: Record<string, unknown>, key: string) {
  const value = record[key];

  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getLogStringArray(record: Record<string, unknown>, key: string) {
  const value = record[key];

  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function compactStrings(values: Array<string | null>) {
  return values.filter((value): value is string => Boolean(value));
}

function formatLogAction(action: string) {
  return action
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatCurrency(amount: number | null, currency: string) {
  if (amount === null) {
    return currency;
  }

  return `${currency} ${amount.toLocaleString('en-US')}`;
}

function formatFileSize(sizeBytes: number | null) {
  if (!sizeBytes) {
    return '';
  }

  if (sizeBytes < 1024 * 1024) {
    return `(${Math.ceil(sizeBytes / 1024)} KB)`;
  }

  return `(${(sizeBytes / (1024 * 1024)).toFixed(1)} MB)`;
}

function getCompletionItems(form: ProfileFormState): ProgressItem[] {
  return [
    { label: 'Legal names', complete: Boolean(form.firstName.trim() && form.lastName.trim()) },
    { label: 'Phone number', complete: Boolean(form.phone.trim()) },
    { label: 'Major', complete: Boolean(form.majorCode) },
    { label: 'Catalog year', complete: Boolean(form.catalogYearLabel) },
    { label: 'Graduation term', complete: Boolean(form.expectedGraduationTerm) },
    { label: 'Current GPA', complete: Boolean(form.currentGpa) },
    { label: 'Mailing address', complete: Boolean(form.shippingAddress.trim()) },
    { label: 'Guardian contact', complete: Boolean(form.parentGuardianName.trim() && form.parentGuardianPhone.trim()) },
  ];
}

function getApplicationProgressItems({
  applicationComplete,
  documents,
  profileItems,
  surveyComplete,
}: {
  applicationComplete: boolean;
  documents: DocumentState | null;
  profileItems: ProgressItem[];
  surveyComplete: boolean;
}): ProgressItem[] {
  const documentItems =
    documents?.requiredDocuments.length
      ? documents.requiredDocuments
        .filter((document) => document.required)
        .map((document) => ({
          complete: document.uploaded,
          label: document.label,
        }))
      : [{ complete: Boolean(documents?.requiredComplete), label: 'Required documents' }];

  return [
    ...profileItems,
    { complete: applicationComplete, label: 'Graduation application' },
    ...documentItems,
    { complete: surveyComplete, label: 'Senior survey' },
  ];
}

async function studentApiRequest<T>(path: string, accessToken: string, init: RequestInit = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      ...init.headers,
    },
  });

  const body = (await response.json().catch(() => null)) as T | null;

  if (!response.ok) {
    throw new Error(readApiError(body));
  }

  return body as T;
}

async function uploadFileToS3(uploadUrl: string, file: File, contentType: string) {
  try {
    return await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'content-type': contentType,
      },
      body: file,
    });
  } catch (caught) {
    throw new Error(
      [
        'S3 upload failed before the server could respond.',
        `Your browser origin is ${window.location.origin}.`,
        'Add this origin to the S3 bucket CORS settings, or open the app using an origin that is already allowed.',
      ].join(' '),
      { cause: caught },
    );
  }
}

type ApiErrorBody = {
  message?: unknown;
  error?: string;
};

function readApiError(body: unknown) {
  if (!body || typeof body !== 'object') {
    return 'The server could not process the request.';
  }

  const apiError = body as ApiErrorBody;

  if (typeof apiError.message === 'string') {
    return apiError.message;
  }

  if (apiError.message && typeof apiError.message === 'object') {
    return Object.values(apiError.message)
      .flatMap((value) => (Array.isArray(value) ? value : []))
      .map(String)
      .join(' ');
  }

  return apiError.error ?? 'The server could not process the request.';
}

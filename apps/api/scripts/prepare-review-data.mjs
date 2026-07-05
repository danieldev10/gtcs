import {
  ApplicationStatus,
  ClearanceDecision,
  ClearanceStage,
  DocumentType,
  PrismaClient,
  RoleName,
} from '@prisma/client';
import { randomBytes, scrypt as scryptCallback } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const scrypt = promisify(scryptCallback);
const keyLength = 64;
const scriptDir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(scriptDir, '../.env');

loadEnvFile(envPath);

const shouldReset = process.argv.includes('--reset');

if (!shouldReset || process.env.ALLOW_DATA_RESET !== 'true') {
  console.error('Refusing to change records without reset confirmation.');
  console.error('Run: ALLOW_DATA_RESET=true node scripts/prepare-review-data.mjs --reset');
  process.exit(1);
}

const prisma = new PrismaClient();
const staffPassword = process.env.STAFF_SEED_PASSWORD ?? 'GtcsStaff@2026';
const studentPassword = process.env.STUDENT_SEED_PASSWORD ?? 'GtcsStudent@2026';
const storageBucket =
  process.env.AWS_S3_BUCKET ?? process.env.S3_BUCKET ?? process.env.AWS_BUCKET_NAME ?? 'gtcs-clearance';

const requiredDocumentTypes = [
  DocumentType.JAMB_ADMISSION_LETTER,
  DocumentType.JAMB_RESULT_SLIP,
  DocumentType.NIN_SLIP,
  DocumentType.CREDIT_AUDIT_SHEET,
  DocumentType.UNOFFICIAL_TRANSCRIPT,
];

const documentLabels = {
  [DocumentType.JAMB_ADMISSION_LETTER]: 'JAMB admission letter',
  [DocumentType.JAMB_RESULT_SLIP]: 'JAMB result slip',
  [DocumentType.NIN_SLIP]: 'NIN slip',
  [DocumentType.CREDIT_AUDIT_SHEET]: 'Credit audit sheet',
  [DocumentType.UNOFFICIAL_TRANSCRIPT]: 'Unofficial transcript',
  [DocumentType.SUPPORTING_DOCUMENT]: 'Supporting document',
};

const staffAccounts = [
  {
    email: 'bursary.officer@aun.edu.ng',
    name: 'Bursary Officer',
    role: RoleName.BURSARY_OFFICER,
  },
  {
    email: 'program.chair@aun.edu.ng',
    name: 'Program Chair',
    role: RoleName.PROGRAM_CHAIR,
  },
  {
    email: 'dean@aun.edu.ng',
    name: 'SITC Dean',
    role: RoleName.DEAN,
  },
  {
    email: 'registry.officer@aun.edu.ng',
    name: 'Registry Officer',
    role: RoleName.REGISTRY_OFFICER,
  },
  {
    email: 'provost@aun.edu.ng',
    name: 'Provost',
    role: RoleName.PROVOST,
  },
  {
    email: 'admin@aun.edu.ng',
    name: 'System Admin',
    role: RoleName.ADMIN,
  },
];

const programDefinitions = [
  {
    code: 'SE',
    degreeName: 'B.Sc. Software Engineering',
    minimumCredits: 120,
    name: 'Software Engineering',
  },
  {
    code: 'CS_CSA',
    degreeName: 'B.Sc. Computer Science',
    minimumCredits: 120,
    name: 'Computer Science - Computer Systems Architecture',
  },
  {
    code: 'CS_AI',
    degreeName: 'B.Sc. Computer Science',
    minimumCredits: 120,
    name: 'Computer Science - Artificial Intelligence',
  },
  {
    code: 'IS_SAD',
    degreeName: 'B.Sc. Information Systems',
    minimumCredits: 120,
    name: 'Information Systems - Systems Analysis and Design',
  },
  {
    code: 'DSC',
    degreeName: 'B.Sc. Data Science and Analytics',
    minimumCredits: 120,
    name: 'Data Science and Analytics',
  },
];

const catalogYearLabels = ['2022-2026', '2023-2027', '2024-2028'];
const termNames = ['Fall 2026', 'Spring 2027', 'Fall 2027'];

const completeOpenErpChecks = {
  catalogYearAccurate: 'YES',
  concentrationAccurate: 'YES',
  concentrationDeclared: 'YES',
  dateOfBirthAccurate: 'YES',
  fullNameAccurate: 'YES',
  genderAccurate: 'YES',
  majorAccurate: 'YES',
  minorAccurate: 'YES',
  stateOfOriginAccurate: 'YES',
};

const partialOpenErpChecks = {
  catalogYearAccurate: 'YES',
  concentrationAccurate: 'YES',
  concentrationDeclared: 'YES',
  dateOfBirthAccurate: null,
  fullNameAccurate: 'YES',
  genderAccurate: null,
  majorAccurate: 'YES',
  minorAccurate: null,
  stateOfOriginAccurate: null,
};

const students = [
  {
    email: 'aisha.yusuf@aun.edu.ng',
    firstName: 'Aisha',
    lastName: 'Yusuf',
    majorCode: 'SE',
    stage: 'profile-only',
    studentId: 'A00031001',
  },
  {
    email: 'chinedu.nwosu@aun.edu.ng',
    firstName: 'Chinedu',
    lastName: 'Nwosu',
    majorCode: 'IS_SAD',
    stage: 'application-started',
    studentId: 'A00031002',
  },
  {
    email: 'fatima.musa@aun.edu.ng',
    firstName: 'Fatima',
    lastName: 'Musa',
    majorCode: 'CS_AI',
    stage: 'application-ready',
    studentId: 'A00031003',
  },
  {
    email: 'tobi.adeyemi@aun.edu.ng',
    firstName: 'Tobi',
    lastName: 'Adeyemi',
    majorCode: 'DSC',
    stage: 'documents-started',
    studentId: 'A00031004',
  },
  {
    email: 'leila.garba@aun.edu.ng',
    firstName: 'Leila',
    lastName: 'Garba',
    majorCode: 'SE',
    stage: 'survey-pending',
    studentId: 'A00031005',
  },
  {
    email: 'victor.eze@aun.edu.ng',
    firstName: 'Victor',
    lastName: 'Eze',
    majorCode: 'CS_CSA',
    stage: 'ready-to-submit',
    studentId: 'A00031006',
  },
  {
    email: 'miriam.danjuma@aun.edu.ng',
    firstName: 'Miriam',
    lastName: 'Danjuma',
    majorCode: 'IS_SAD',
    stage: 'bursary-pending',
    studentId: 'A00031007',
  },
  {
    email: 'sadiq.usman@aun.edu.ng',
    firstName: 'Sadiq',
    lastName: 'Usman',
    majorCode: 'SE',
    stage: 'payment-required',
    studentId: 'A00031008',
  },
  {
    email: 'grace.idowu@aun.edu.ng',
    firstName: 'Grace',
    lastName: 'Idowu',
    majorCode: 'DSC',
    stage: 'receipt-uploaded',
    studentId: 'A00031009',
  },
  {
    email: 'allen.welsh@aun.edu.ng',
    firstName: 'Allen',
    lastName: 'Welsh',
    majorCode: 'CS_CSA',
    stage: 'registry-intake',
    studentId: 'A00022123',
  },
  {
    email: 'zainab.lawal@aun.edu.ng',
    firstName: 'Zainab',
    lastName: 'Lawal',
    majorCode: 'CS_AI',
    stage: 'documents-requested',
    studentId: 'A00031010',
  },
  {
    email: 'samuel.akpan@aun.edu.ng',
    firstName: 'Samuel',
    lastName: 'Akpan',
    majorCode: 'SE',
    stage: 'chair-review',
    studentId: 'A00031011',
  },
  {
    email: 'ifeoma.okoro@aun.edu.ng',
    firstName: 'Ifeoma',
    lastName: 'Okoro',
    majorCode: 'IS_SAD',
    stage: 'dean-review',
    studentId: 'A00031012',
  },
  {
    email: 'khalil.ibrahim@aun.edu.ng',
    firstName: 'Khalil',
    lastName: 'Ibrahim',
    majorCode: 'CS_AI',
    stage: 'final-registry',
    studentId: 'A00031013',
  },
  {
    email: 'nnenna.eke@aun.edu.ng',
    firstName: 'Nnenna',
    lastName: 'Eke',
    majorCode: 'DSC',
    stage: 'provost-review',
    studentId: 'A00031014',
  },
  {
    email: 'naya.mohammed@aun.edu.ng',
    firstName: 'Naya',
    lastName: 'Mohammed',
    majorCode: 'SE',
    stage: 'completed',
    studentId: 'A00031015',
  },
];

try {
  console.log('Preparing a fresh set of clearance records...');
  await clearDatabase();

  const passwordHash = await hashPassword(staffPassword);
  const studentPasswordHash = await hashPassword(studentPassword);
  const staffByRole = await createStaffAccounts(passwordHash);
  const { catalogYears, programs, terms } = await createAcademicSetup();

  for (const [index, student] of students.entries()) {
    await createStudentRecord({
      catalogYears,
      index,
      programs,
      staffByRole,
      student,
      studentPasswordHash,
      terms,
    });
  }

  console.log('');
  console.log('Staff accounts');
  for (const account of staffAccounts) {
    console.log(`- ${account.email} (${account.role})`);
  }
  console.log(`Staff password: ${staffPassword}`);
  console.log('');
  console.log('Student accounts');
  for (const student of students) {
    console.log(`- ${student.email} (${student.studentId})`);
  }
  console.log(`Student password: ${studentPassword}`);
} finally {
  await prisma.$disconnect();
}

async function clearDatabase() {
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.comment.deleteMany(),
    prisma.clearanceTask.deleteMany(),
    prisma.documentUpload.deleteMany(),
    prisma.surveyResponse.deleteMany(),
    prisma.graduationApplication.deleteMany(),
    prisma.transcriptCourse.deleteMany(),
    prisma.studentProfile.deleteMany(),
    prisma.emailVerificationToken.deleteMany(),
    prisma.requirementCourseOption.deleteMany(),
    prisma.programRequirement.deleteMany(),
    prisma.course.deleteMany(),
    prisma.program.deleteMany(),
    prisma.catalogYear.deleteMany(),
    prisma.academicTerm.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

async function createStaffAccounts(passwordHash) {
  const staffByRole = new Map();

  for (const account of staffAccounts) {
    const user = await prisma.user.create({
      data: {
        email: account.email,
        emailVerifiedAt: dateAt('2026-05-20T09:00:00Z'),
        name: account.name,
        passwordHash,
        role: account.role,
      },
    });

    staffByRole.set(account.role, user);
  }

  return staffByRole;
}

async function createAcademicSetup() {
  const catalogYears = new Map();
  const programs = new Map();
  const terms = new Map();

  for (const label of catalogYearLabels) {
    const catalogYear = await prisma.catalogYear.create({
      data: { label },
    });

    catalogYears.set(label, catalogYear);

    for (const program of programDefinitions) {
      const createdProgram = await prisma.program.create({
        data: {
          catalogYearId: catalogYear.id,
          code: program.code,
          degreeName: program.degreeName,
          minimumCredits: program.minimumCredits,
          minimumGpa: 2.0,
          name: program.name,
        },
      });

      programs.set(`${program.code}:${label}`, createdProgram);
    }
  }

  for (const name of termNames) {
    const term = await prisma.academicTerm.create({
      data: { name },
    });

    terms.set(name, term);
  }

  return { catalogYears, programs, terms };
}

async function createStudentRecord({
  catalogYears,
  index,
  programs,
  staffByRole,
  student,
  studentPasswordHash,
  terms,
}) {
  const catalogYearLabel = index % 3 === 0 ? '2022-2026' : index % 3 === 1 ? '2023-2027' : '2024-2028';
  const termName = index % 2 === 0 ? 'Fall 2027' : 'Spring 2027';
  const program = programs.get(`${student.majorCode}:${catalogYearLabel}`);
  const currentGpa = Number((2.74 + (index % 8) * 0.14).toFixed(2));
  const fullName = [student.firstName, student.middleName, student.lastName].filter(Boolean).join(' ');
  const address = `${18 + index} Lamido Zubairu Way, Yola`;

  const user = await prisma.user.create({
    data: {
      email: student.email,
      emailVerifiedAt: dateAt('2026-05-22T10:00:00Z'),
      name: fullName,
      passwordHash: studentPasswordHash,
      role: RoleName.STUDENT,
    },
  });

  const profile = await prisma.studentProfile.create({
    data: {
      catalogYearId: catalogYears.get(catalogYearLabel).id,
      catalogYearLabel,
      concentration: index % 2 === 0 ? 'Software Systems' : null,
      currentGpa,
      expectedGraduationTerm: termName,
      firstName: student.firstName,
      lastName: student.lastName,
      major: program.name,
      middleName: student.middleName ?? null,
      minor: index % 4 === 0 ? 'Economics' : null,
      parentGuardianDetails: {
        email: `${student.lastName.toLowerCase()}.family@example.com`,
        name: `${student.lastName} Family Contact`,
        phone: `0803${String(1100000 + index).slice(-7)}`,
        relationship: index % 2 === 0 ? 'Father' : 'Mother',
      },
      phone: `0903${String(2200000 + index).slice(-7)}`,
      programId: program.id,
      programTrack: student.majorCode,
      shippingAddress: address,
      studentId: student.studentId,
      userId: user.id,
    },
  });

  if (student.stage === 'profile-only') {
    return;
  }

  const startedAt = dateAt(`2026-06-${String(10 + index).padStart(2, '0')}T08:20:00Z`);
  const applicationReady = student.stage !== 'application-started';
  const application = await prisma.graduationApplication.create({
    data: {
      certificateMailingAddress: applicationReady ? address : null,
      completionTerm: termName,
      createdAt: startedAt,
      eligibility: createEligibility({
        applicationFormComplete: applicationReady,
        documentCount: 0,
        documentsComplete: false,
        finalSubmissionReady: false,
        profileComplete: true,
        surveySubmitted: false,
      }),
      finalGpa: currentGpa,
      nameOnCertificate: fullName,
      openErpChecks: applicationReady ? completeOpenErpChecks : partialOpenErpChecks,
      status: ApplicationStatus.DRAFT,
      studentAttestationAcceptedAt: applicationReady ? minutesAfter(startedAt, 18) : null,
      studentProfileId: profile.id,
      studentRemarks: applicationReady
        ? 'I confirm that my graduation application details are correct.'
        : null,
      termId: terms.get(termName).id,
      updatedAt: startedAt,
    },
  });

  if (student.stage === 'application-started' || student.stage === 'application-ready') {
    return;
  }

  const documentTypes =
    student.stage === 'documents-started'
      ? [DocumentType.JAMB_ADMISSION_LETTER, DocumentType.JAMB_RESULT_SLIP]
      : student.stage === 'documents-requested'
        ? [
            DocumentType.JAMB_ADMISSION_LETTER,
            DocumentType.JAMB_RESULT_SLIP,
            DocumentType.UNOFFICIAL_TRANSCRIPT,
          ]
        : requiredDocumentTypes;

  await createDocuments(application.id, student.studentId, documentTypes, minutesAfter(startedAt, 35));

  if (student.stage === 'documents-started') {
    await updateApplicationEligibility(application.id, {
      applicationFormComplete: true,
      documentCount: documentTypes.length,
      documentsComplete: false,
      finalSubmissionReady: false,
      profileComplete: true,
      surveySubmitted: false,
    });
    return;
  }

  if (student.stage === 'survey-pending') {
    await updateApplicationEligibility(application.id, {
      applicationFormComplete: true,
      documentCount: documentTypes.length,
      documentsComplete: true,
      finalSubmissionReady: false,
      profileComplete: true,
      surveySubmitted: false,
    });
    return;
  }

  const surveySubmittedAt = minutesAfter(startedAt, 68);
  await createSurvey(application.id, surveySubmittedAt);

  if (student.stage === 'ready-to-submit') {
    await updateApplicationEligibility(application.id, {
      applicationFormComplete: true,
      documentCount: documentTypes.length,
      documentsComplete: true,
      finalSubmissionReady: true,
      profileComplete: true,
      surveySubmitted: true,
    });
    return;
  }

  const submittedAt = minutesAfter(startedAt, 95);
  await prisma.graduationApplication.update({
    where: { id: application.id },
    data: {
      eligibility: createEligibility({
        applicationFormComplete: true,
        documentCount: documentTypes.length,
        documentsComplete: documentTypes.length >= requiredDocumentTypes.length,
        finalSubmissionReady: true,
        profileComplete: true,
        status: 'SUBMITTED_FOR_REVIEW',
        surveySubmitted: true,
      }),
      status: ApplicationStatus.BURSARY_PENDING,
      submittedAt,
    },
  });
  await createTask(application.id, ClearanceStage.BURSARY, ClearanceDecision.PENDING);
  await createAuditLog({
    action: 'SUBMITTED',
    actorId: user.id,
    applicationId: application.id,
    createdAt: submittedAt,
    metadata: {
      nextStage: ClearanceStage.BURSARY,
      status: ApplicationStatus.BURSARY_PENDING,
    },
  });

  if (student.stage === 'bursary-pending') {
    return;
  }

  const bursaryUser = staffByRole.get(RoleName.BURSARY_OFFICER);

  if (student.stage === 'payment-required' || student.stage === 'receipt-uploaded') {
    const requestedAt = minutesAfter(submittedAt, 62);
    const paymentRequest = {
      amount: 12000,
      currency: 'NGN',
      note: 'Outstanding printing and records processing fee.',
      receiptUploaded: student.stage === 'receipt-uploaded',
      requestedAt: requestedAt.toISOString(),
      requestedById: bursaryUser.id,
    };

    await prisma.graduationApplication.update({
      where: { id: application.id },
      data: {
        eligibility: createEligibility({
          applicationFormComplete: true,
          bursaryPaymentRequest: paymentRequest,
          documentCount: documentTypes.length,
          documentsComplete: true,
          finalSubmissionReady: true,
          profileComplete: true,
          status: 'SUBMITTED_FOR_REVIEW',
          surveySubmitted: true,
        }),
        status: ApplicationStatus.BURSARY_NOT_CLEARED,
      },
    });
    await createTask(
      application.id,
      ClearanceStage.BURSARY,
      ClearanceDecision.RETURNED,
      bursaryUser.id,
      'Outstanding balance: NGN 12,000\n\nOutstanding printing and records processing fee.',
    );
    await createAuditLog({
      action: 'BURSARY_PAYMENT_REQUESTED',
      actorId: bursaryUser.id,
      applicationId: application.id,
      createdAt: requestedAt,
      metadata: paymentRequest,
    });

    if (student.stage === 'receipt-uploaded') {
      const receiptUploadedAt = minutesAfter(requestedAt, 95);
      await createBursaryReceipt(application.id, student.studentId, receiptUploadedAt);
      await prisma.graduationApplication.update({
        where: { id: application.id },
        data: {
          eligibility: createEligibility({
            applicationFormComplete: true,
            bursaryPaymentRequest: {
              ...paymentRequest,
              receiptUploaded: true,
              receiptUploadedAt: receiptUploadedAt.toISOString(),
            },
            documentCount: documentTypes.length + 1,
            documentsComplete: true,
            finalSubmissionReady: true,
            profileComplete: true,
            status: 'SUBMITTED_FOR_REVIEW',
            surveySubmitted: true,
          }),
        },
      });
      await createAuditLog({
        action: 'BURSARY_RECEIPT_UPLOADED',
        actorId: user.id,
        applicationId: application.id,
        createdAt: receiptUploadedAt,
        metadata: {
          amountPaid: 12000,
          originalName: `Bursary Payment Receipt - ${student.studentId}.pdf`,
          paymentReference: `AUN-${student.studentId.slice(1)}-BR`,
          uploadedAt: receiptUploadedAt.toISOString(),
        },
      });
    }

    return;
  }

  await advancePastBursary({
    applicationId: application.id,
    bursaryUser,
    decidedAt: minutesAfter(submittedAt, 124),
  });

  if (student.stage === 'registry-intake') {
    return;
  }

  if (student.stage === 'documents-requested') {
    const registryUser = staffByRole.get(RoleName.REGISTRY_OFFICER);
    const requestedAt = minutesAfter(submittedAt, 160);
    const registryDocumentRequest = {
      checklist: {
        creditAuditAttached: false,
        graduationRequirementsSatisfied: true,
        graduationSurveyCompleted: true,
        jambAdmissionLetterAttached: true,
        jambResultSlipAttached: true,
        ninSlipAttached: false,
        remarks: 'Please upload the NIN slip and updated credit audit sheet for Registry review.',
        unofficialTranscriptAttached: true,
      },
      completed: false,
      completedAt: null,
      missingChecks: ['NIN slip is attached', 'Credit audit is attached'],
      remarks: 'Please upload the NIN slip and updated credit audit sheet for Registry review.',
      requestedAt: requestedAt.toISOString(),
      requestedById: registryUser.id,
      requiredDocumentTypes: [DocumentType.NIN_SLIP, DocumentType.CREDIT_AUDIT_SHEET],
    };

    await prisma.graduationApplication.update({
      where: { id: application.id },
      data: {
        eligibility: createEligibility({
          applicationFormComplete: true,
          bursaryFinanciallyCleared: true,
          documentCount: documentTypes.length,
          documentsComplete: false,
          finalSubmissionReady: true,
          profileComplete: true,
          registryDocumentRequest,
          status: 'SUBMITTED_FOR_REVIEW',
          surveySubmitted: true,
        }),
        status: ApplicationStatus.RETURNED_TO_STUDENT,
      },
    });
    await createTask(
      application.id,
      ClearanceStage.REGISTRY_INTAKE,
      ClearanceDecision.RETURNED,
      registryUser.id,
      'Please upload the NIN slip and updated credit audit sheet for Registry review.',
    );
    await createAuditLog({
      action: 'REGISTRY_DOCUMENTS_REQUESTED',
      actorId: registryUser.id,
      applicationId: application.id,
      createdAt: requestedAt,
      metadata: registryDocumentRequest,
    });

    return;
  }

  await advancePastRegistryIntake({
    applicationId: application.id,
    decidedAt: minutesAfter(submittedAt, 180),
    registryUser: staffByRole.get(RoleName.REGISTRY_OFFICER),
  });

  if (student.stage === 'chair-review') {
    return;
  }

  await advancePastProgramChair({
    applicationId: application.id,
    chairUser: staffByRole.get(RoleName.PROGRAM_CHAIR),
    decidedAt: minutesAfter(submittedAt, 214),
  });

  if (student.stage === 'dean-review') {
    return;
  }

  await advancePastDean({
    applicationId: application.id,
    deanUser: staffByRole.get(RoleName.DEAN),
    decidedAt: minutesAfter(submittedAt, 245),
  });

  if (student.stage === 'final-registry') {
    return;
  }

  await advancePastFinalRegistry({
    applicationId: application.id,
    decidedAt: minutesAfter(submittedAt, 288),
    finalGpa: currentGpa,
    registryUser: staffByRole.get(RoleName.REGISTRY_OFFICER),
  });

  if (student.stage === 'provost-review') {
    return;
  }

  await advancePastProvost({
    applicationId: application.id,
    decidedAt: minutesAfter(submittedAt, 330),
    provostUser: staffByRole.get(RoleName.PROVOST),
  });
}

async function updateApplicationEligibility(applicationId, snapshot) {
  await prisma.graduationApplication.update({
    where: { id: applicationId },
    data: {
      eligibility: createEligibility(snapshot),
    },
  });
}

async function updateApplicationReviewState(applicationId, { eligibilityPatch, ...applicationData }) {
  const current = await prisma.graduationApplication.findUnique({
    where: { id: applicationId },
    select: { eligibility: true },
  });
  const eligibility = {
    ...plainObject(current?.eligibility),
    ...plainObject(eligibilityPatch),
  };

  await prisma.graduationApplication.update({
    where: { id: applicationId },
    data: {
      ...applicationData,
      eligibility,
    },
  });
}

async function advancePastBursary({ applicationId, bursaryUser, decidedAt }) {
  await createTask(
    applicationId,
    ClearanceStage.BURSARY,
    ClearanceDecision.CLEARED,
    bursaryUser.id,
    'Student is financially cleared to graduate.',
    decidedAt,
  );
  await createTask(applicationId, ClearanceStage.REGISTRY_INTAKE, ClearanceDecision.PENDING);
  await updateApplicationReviewState(applicationId, {
    eligibilityPatch: {
      bursaryClearedAt: decidedAt.toISOString(),
      bursaryClearedById: bursaryUser.id,
      bursaryFinanciallyCleared: true,
      status: 'SUBMITTED_FOR_REVIEW',
    },
    status: ApplicationStatus.REGISTRY_INTAKE_REVIEW,
  });
  await createAuditLog({
    action: 'BURSARY_CLEARED',
    actorId: bursaryUser.id,
    applicationId,
    createdAt: decidedAt,
    metadata: {
      nextStage: ClearanceStage.REGISTRY_INTAKE,
      status: ApplicationStatus.REGISTRY_INTAKE_REVIEW,
    },
  });
}

async function advancePastRegistryIntake({ applicationId, decidedAt, registryUser }) {
  const registryChecklist = {
    clearedAt: decidedAt.toISOString(),
    clearedById: registryUser.id,
    creditAuditAttached: true,
    graduationRequirementsSatisfied: true,
    graduationSurveyCompleted: true,
    jambAdmissionLetterAttached: true,
    jambResultSlipAttached: true,
    ninSlipAttached: true,
    remarks: 'Documents reviewed and accepted for SITC clearance.',
    unofficialTranscriptAttached: true,
  };

  await createTask(
    applicationId,
    ClearanceStage.REGISTRY_INTAKE,
    ClearanceDecision.CLEARED,
    registryUser.id,
    'Documents reviewed and accepted for SITC clearance.',
    decidedAt,
  );
  await createTask(applicationId, ClearanceStage.PROGRAM_CHAIR, ClearanceDecision.PENDING);
  await updateApplicationReviewState(applicationId, {
    eligibilityPatch: {
      registryIntakeChecklist: registryChecklist,
      registryIntakeClearedAt: decidedAt.toISOString(),
      registryIntakeClearedById: registryUser.id,
    },
    status: ApplicationStatus.CHAIR_REVIEW,
  });
  await createAuditLog({
    action: 'REGISTRY_INTAKE_CLEARED',
    actorId: registryUser.id,
    applicationId,
    createdAt: decidedAt,
    metadata: {
      checklist: registryChecklist,
      nextStage: ClearanceStage.PROGRAM_CHAIR,
      status: ApplicationStatus.CHAIR_REVIEW,
    },
  });
}

async function advancePastProgramChair({ applicationId, chairUser, decidedAt }) {
  await createTask(
    applicationId,
    ClearanceStage.PROGRAM_CHAIR,
    ClearanceDecision.CLEARED,
    chairUser.id,
    'Academic records reviewed and cleared.',
    decidedAt,
  );
  await createTask(applicationId, ClearanceStage.DEAN, ClearanceDecision.PENDING);
  await updateApplicationReviewState(applicationId, {
    eligibilityPatch: {
      programChairComments: 'Academic records reviewed and cleared.',
      programChairDecision: 'CLEARED',
      programChairDecidedAt: decidedAt.toISOString(),
      programChairDecidedById: chairUser.id,
    },
    status: ApplicationStatus.DEAN_REVIEW,
  });
  await createAuditLog({
    action: 'PROGRAM_CHAIR_CLEARED',
    actorId: chairUser.id,
    applicationId,
    createdAt: decidedAt,
    metadata: {
      comments: 'Academic records reviewed and cleared.',
      decision: 'CLEARED',
      nextStage: ClearanceStage.DEAN,
      status: ApplicationStatus.DEAN_REVIEW,
    },
  });
}

async function advancePastDean({ applicationId, deanUser, decidedAt }) {
  await createTask(
    applicationId,
    ClearanceStage.DEAN,
    ClearanceDecision.CLEARED,
    deanUser.id,
    'Cleared for school-level approval.',
    decidedAt,
  );
  await createTask(applicationId, ClearanceStage.FINAL_REGISTRY, ClearanceDecision.PENDING);
  await updateApplicationReviewState(applicationId, {
    eligibilityPatch: {
      deanComments: 'Cleared for school-level approval.',
      deanDecision: 'CLEARED',
      deanDecidedAt: decidedAt.toISOString(),
      deanDecidedById: deanUser.id,
    },
    status: ApplicationStatus.FINAL_REGISTRY_REVIEW,
  });
  await createAuditLog({
    action: 'DEAN_CLEARED',
    actorId: deanUser.id,
    applicationId,
    createdAt: decidedAt,
    metadata: {
      comments: 'Cleared for school-level approval.',
      decision: 'CLEARED',
      nextStage: ClearanceStage.FINAL_REGISTRY,
      status: ApplicationStatus.FINAL_REGISTRY_REVIEW,
    },
  });
}

async function advancePastFinalRegistry({ applicationId, decidedAt, finalGpa, registryUser }) {
  const degreeHonors = finalGpa >= 3.5 ? 'First Class' : finalGpa >= 3.0 ? 'Second Class Upper' : 'Second Class Lower';
  const finalRegistryReview = {
    clearedAt: decidedAt.toISOString(),
    clearedById: registryUser.id,
    comments: 'Final records review completed.',
    completionTerm: 'Fall',
    degreeHonors,
    finalGpa,
  };

  await createTask(
    applicationId,
    ClearanceStage.FINAL_REGISTRY,
    ClearanceDecision.CLEARED,
    registryUser.id,
    'Final records review completed.',
    decidedAt,
  );
  await createTask(applicationId, ClearanceStage.PROVOST, ClearanceDecision.PENDING);
  await updateApplicationReviewState(applicationId, {
    completionTerm: 'Fall',
    degreeHonors,
    eligibilityPatch: {
      finalRegistryClearedAt: decidedAt.toISOString(),
      finalRegistryClearedById: registryUser.id,
      finalRegistryReview,
    },
    finalGpa,
    status: ApplicationStatus.PROVOST_REVIEW,
  });
  await createAuditLog({
    action: 'FINAL_REGISTRY_CLEARED',
    actorId: registryUser.id,
    applicationId,
    createdAt: decidedAt,
    metadata: {
      finalRegistryReview,
      nextStage: ClearanceStage.PROVOST,
      status: ApplicationStatus.PROVOST_REVIEW,
    },
  });
}

async function advancePastProvost({ applicationId, decidedAt, provostUser }) {
  await createTask(
    applicationId,
    ClearanceStage.PROVOST,
    ClearanceDecision.CLEARED,
    provostUser.id,
    'Provost final signoff completed.',
    decidedAt,
  );
  await updateApplicationReviewState(applicationId, {
    eligibilityPatch: {
      provostDecision: 'SIGNED_OFF',
      provostSignedOffAt: decidedAt.toISOString(),
      provostSignedOffById: provostUser.id,
    },
    status: ApplicationStatus.COMPLETED,
  });
  await createAuditLog({
    action: 'PROVOST_SIGNED_OFF',
    actorId: provostUser.id,
    applicationId,
    createdAt: decidedAt,
    metadata: {
      status: ApplicationStatus.COMPLETED,
    },
  });
}

async function createDocuments(applicationId, studentId, documentTypes, createdAt) {
  for (const [index, documentType] of documentTypes.entries()) {
    const label = documentLabels[documentType];
    const fileName = `${label.replaceAll(' ', '-').toLowerCase()}-${studentId}.pdf`;

    await prisma.documentUpload.create({
      data: {
        applicationId,
        bucket: storageBucket,
        createdAt: minutesAfter(createdAt, index * 3),
        mimeType: 'application/pdf',
        originalName: `${label} - ${studentId}.pdf`,
        sizeBytes: 180000 + index * 14000,
        storageKey: `graduation-applications/${applicationId}/${documentType.toLowerCase()}/${fileName}`,
        type: documentType,
      },
    });
  }
}

async function createBursaryReceipt(applicationId, studentId, createdAt) {
  await prisma.documentUpload.create({
    data: {
      applicationId,
      bucket: storageBucket,
      createdAt,
      mimeType: 'application/pdf',
      originalName: `Bursary Payment Receipt - ${studentId}.pdf`,
      sizeBytes: 104000,
      storageKey: `graduation-applications/${applicationId}/bursary_payment_receipt/bursary-payment-receipt-${studentId}.pdf`,
      type: DocumentType.SUPPORTING_DOCUMENT,
      verification: {
        amountPaid: 12000,
        paymentReference: `AUN-${studentId.slice(1)}-BR`,
        purpose: 'BURSARY_PAYMENT_RECEIPT',
        status: 'PENDING_REVIEW',
        uploadedAt: createdAt.toISOString(),
      },
    },
  });
}

async function createSurvey(applicationId, submittedAt) {
  await prisma.surveyResponse.create({
    data: {
      answers: {
        attendCommencement: 'YES',
        attendSeniorWeek: 'YES',
        attendedCommencementBefore: 'NO',
        awardCategorySuggestions: 'Leadership, entrepreneurship, and community service awards should be included.',
        awardsDinnerTicketSuggestion: '4',
        commencementExpectations: 'A well-organized ceremony that gives families enough time to celebrate with graduating students.',
        commencementInfoMethod: 'EMAIL',
        commencementInfoOther: null,
        commencementOrganizationRating: null,
        commencementTicketSuggestion: '6',
        guestLodgingOther: null,
        guestLodgingPreference: 'SURROUNDING_HOTELS',
        immediatePlan: 'NYSC',
        immediatePlanOther: null,
        improvementSuggestions: 'Send final schedules early and make guest directions clearer.',
        myAunIs: 'Home, growth, opportunity',
        participatedPrograms: ['MODEL_UN', 'HULT_PRIZE'],
        participatedProgramsOther: null,
        photoAlbumOpinion: 'I_LOVE_IT',
        preferVirtualConferral: null,
        townTransportOther: null,
        townTransportPlan: 'PERSONAL_CAR',
      },
      applicationId,
      submittedAt,
    },
  });
}

async function createTask(applicationId, stage, decision, assignedToId = null, remarks = null, decidedAt = null) {
  await prisma.clearanceTask.upsert({
    where: {
      applicationId_stage: {
        applicationId,
        stage,
      },
    },
    update: {
      assignedToId,
      decidedAt,
      decision,
      remarks,
    },
    create: {
      applicationId,
      assignedToId,
      decidedAt,
      decision,
      remarks,
      stage,
    },
  });
}

async function createAuditLog({ action, actorId, applicationId, createdAt, metadata }) {
  await prisma.auditLog.create({
    data: {
      action,
      actorId,
      applicationId,
      createdAt,
      entityId: applicationId,
      entityType: 'GraduationApplication',
      metadata,
    },
  });
}

function createEligibility({
  applicationFormComplete,
  bursaryPaymentRequest,
  bursaryFinanciallyCleared,
  documentCount,
  documentsComplete,
  finalSubmissionReady,
  profileComplete,
  registryDocumentRequest,
  status = null,
  surveySubmitted,
}) {
  const eligibility = {
    ...(bursaryFinanciallyCleared === undefined ? {} : { bursaryFinanciallyCleared }),
    ...(bursaryPaymentRequest ? { bursaryPaymentRequest } : {}),
    ...(registryDocumentRequest ? { registryDocumentRequest } : {}),
    applicationFormComplete,
    documentCount,
    documentsComplete,
    finalSubmissionReady,
    profileComplete,
    status:
      status ??
      (finalSubmissionReady ? 'SUBMITTED_FOR_REVIEW' : applicationFormComplete ? 'DRAFT_READY' : 'DRAFT_IN_PROGRESS'),
    surveySubmitted,
  };

  return Object.fromEntries(Object.entries(eligibility).filter(([, value]) => value !== undefined));
}

function plainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function loadEnvFile(path) {
  if (!existsSync(path)) {
    return;
  }

  const content = readFileSync(path, 'utf8');

  for (const line of content.split('\n')) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue;
    }

    const [key, ...valueParts] = trimmed.split('=');

    if (process.env[key]) {
      continue;
    }

    process.env[key] = valueParts.join('=').replace(/^["']|["']$/g, '');
  }
}

async function hashPassword(value) {
  const salt = randomBytes(16).toString('base64url');
  const derivedKey = await scrypt(value, salt, keyLength);

  return `scrypt$${salt}$${derivedKey.toString('base64url')}`;
}

function dateAt(value) {
  return new Date(value);
}

function minutesAfter(value, minutes) {
  return new Date(value.getTime() + minutes * 60 * 1000);
}

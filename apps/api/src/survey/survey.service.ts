import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ApplicationStatus, DocumentType, Prisma, RoleName } from '@prisma/client';
import { z } from 'zod';
import { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';

const requiredDocumentTypes = [
  DocumentType.JAMB_ADMISSION_LETTER,
  DocumentType.JAMB_RESULT_SLIP,
  DocumentType.NIN_SLIP,
  DocumentType.CREDIT_AUDIT_SHEET,
  DocumentType.UNOFFICIAL_TRANSCRIPT,
] as const;

const surveyAnswerSchema = z.object({
  immediatePlan: z.enum(['NYSC', 'WORK', 'GRADUATE_DEGREE', 'LAW_SCHOOL', 'OTHER']).nullable().optional(),
  immediatePlanOther: z.string().trim().max(160).nullable().optional(),
  attendCommencement: z.enum(['YES', 'MAYBE', 'NO']).nullable().optional(),
  attendCommencementReason: z.string().trim().max(500).nullable().optional(),
  preferVirtualConferral: z.enum(['YES', 'MAYBE', 'NO']).nullable().optional(),
  attendSeniorWeek: z.enum(['YES', 'MAYBE', 'NO']).nullable().optional(),
  attendSeniorWeekReason: z.string().trim().max(500).nullable().optional(),
  commencementTicketSuggestion: z.enum(['5', '6', '7', '8']).nullable().optional(),
  awardsDinnerTicketSuggestion: z.enum(['2', '3', '4', '5', '6']).nullable().optional(),
  commencementInfoMethod: z.enum(['TEXT', 'MAIL', 'EMAIL', 'OTHER']).nullable().optional(),
  commencementInfoOther: z.string().trim().max(160).nullable().optional(),
  guestLodgingPreference: z
    .enum(['AUN_HOTEL', 'AUN_RESIDENCE_HALLS', 'SURROUNDING_HOTELS', 'OTHER'])
    .nullable()
    .optional(),
  guestLodgingOther: z.string().trim().max(160).nullable().optional(),
  townTransportPlan: z.enum(['USE_ME', 'PERSONAL_CAR', 'AUN_TRANSPORTATION', 'OTHER']).nullable().optional(),
  townTransportOther: z.string().trim().max(160).nullable().optional(),
  photoAlbumOpinion: z
    .enum(['I_LOVE_IT', 'INTERESTING', 'DONT_LIKE_IDEA', 'PLEASE_LETS_DO_IT'])
    .nullable()
    .optional(),
  attendedCommencementBefore: z.enum(['YES', 'NO', 'WANTED_BUT_OFF_CAMPUS']).nullable().optional(),
  attendedCommencementYear: z.string().trim().max(20).nullable().optional(),
  commencementOrganizationRating: z
    .enum(['VERY_SATISFIED', 'SATISFIED', 'NEUTRAL', 'UNSATISFIED', 'VERY_UNSATISFIED'])
    .nullable()
    .optional(),
  improvementSuggestions: z.string().trim().max(1200).nullable().optional(),
  awardCategorySuggestions: z.string().trim().max(800).nullable().optional(),
  participatedPrograms: z.array(z.enum(['MODEL_UN', 'STUDY_ABROAD', 'EMERGING_LEADERS_ACADEMY', 'HULT_PRIZE', 'OTHER'])).optional(),
  participatedProgramsOther: z.string().trim().max(160).nullable().optional(),
  commencementExpectations: z.string().trim().max(1200).nullable().optional(),
  myAunIs: z.string().trim().max(300).nullable().optional(),
});

const saveSurveySchema = z.object({
  answers: surveyAnswerSchema,
  submit: z.boolean().optional(),
});

const surveyQuestions = [
  {
    key: 'immediatePlan',
    label: '1. What is your immediate plan after graduation?',
    required: true,
    type: 'select',
    options: ['NYSC', 'Work', 'Graduate Degree', 'Law School', 'Other'],
  },
  {
    key: 'attendCommencement',
    label: '2. Are you planning to attend the 16th Commencement Ceremony in May 2025?',
    required: true,
    type: 'choice',
    options: ['Yes', 'Maybe', 'No'],
  },
  {
    key: 'preferVirtualConferral',
    label: '3. If you do not plan to attend, would you prefer a virtual graduation where you are conferred your degree?',
    required: false,
    type: 'choice',
    options: ['Yes', 'Maybe', 'No'],
  },
  {
    key: 'attendSeniorWeek',
    label: '4. Are you planning to attend the 2025 Senior Week?',
    required: true,
    type: 'choice',
    options: ['Yes', 'Maybe', 'No'],
  },
  {
    key: 'commencementTicketSuggestion',
    label: '5. Suggested number of tickets for commencement',
    required: true,
    type: 'select',
    options: ['5 tickets', '6 tickets', '7 tickets', '8 tickets'],
  },
  {
    key: 'awardsDinnerTicketSuggestion',
    label: '6. Suggested number of tickets for the Graduation Awards Dinner',
    required: true,
    type: 'select',
    options: ['2 tickets', '3 tickets', '4 tickets', '5 tickets', '6 tickets'],
  },
  {
    key: 'commencementInfoMethod',
    label: '7. Best way to inform parents, friends and family about commencement',
    required: true,
    type: 'select',
    options: ['Text', 'Mail (FedEx or NiPost EMS)', 'E-mail', 'Other'],
  },
  {
    key: 'guestLodgingPreference',
    label: '8. Preferred lodging for invitees/guests',
    required: true,
    type: 'select',
    options: ['AUN Hotel', 'AUN Residence Halls', 'Surrounding Hotels', 'Other'],
  },
  {
    key: 'townTransportPlan',
    label: '9. How will you, your family, friends and guests get around town?',
    required: true,
    type: 'select',
    options: ['Use me', 'Personal car', 'AUN transportation', 'Other'],
  },
  {
    key: 'photoAlbumOpinion',
    label: '10. How do you feel about having a “Class of 2025” Photo Album?',
    required: true,
    type: 'select',
    options: ['I love it', 'Interesting', 'I don’t like the idea', 'Please let do it'],
  },
  {
    key: 'attendedCommencementBefore',
    label: '11. Have you ever attended any of AUN’s Commencement Ceremonies?',
    required: true,
    type: 'select',
    options: ['Yes', 'No', 'I have always wanted to, but I am never on campus'],
  },
  {
    key: 'commencementOrganizationRating',
    label: '12. If yes, how would you rate the Commencement Ceremony organization?',
    required: false,
    type: 'select',
    options: ['Very Satisfied', 'Satisfied', 'Neutral', 'Unsatisfied', 'Very Unsatisfied'],
  },
  {
    key: 'improvementSuggestions',
    label: '12b. Suggestions for improvement',
    required: false,
    type: 'textarea',
  },
  {
    key: 'awardCategorySuggestions',
    label: '13. Award category suggestions for the Graduation Awards Ceremony',
    required: false,
    type: 'textarea',
  },
  {
    key: 'participatedPrograms',
    label: '14. Programs participated in during your studies at AUN',
    required: false,
    type: 'checkboxes',
    options: ['Model UN', 'Study Abroad', 'Emerging Leaders Academy', 'Hult Prize', 'Other'],
  },
  {
    key: 'commencementExpectations',
    label: '15. Expectations for the 2025 Commencement Ceremony',
    required: true,
    type: 'textarea',
  },
  {
    key: 'myAunIs',
    label: '16. In one or two or three words, what would you say “My AUN is” to you after four/five-years?',
    required: true,
    type: 'textarea',
  },
] as const;

type SurveyAnswers = z.infer<typeof surveyAnswerSchema>;

type CurrentApplication = Prisma.GraduationApplicationGetPayload<{
  include: {
    documents: true;
    surveyResponse: true;
  };
}>;

@Injectable()
export class SurveyService {
  constructor(private readonly prisma: PrismaService) {}

  async getMySurvey(user: AuthenticatedUser) {
    const application = await this.getCurrentApplication(user);
    this.assertDocumentsComplete(application);

    return this.serializeSurvey(application);
  }

  async saveMySurvey(user: AuthenticatedUser, input: unknown) {
    const parsed = saveSurveySchema.safeParse(input);

    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const application = await this.getCurrentApplication(user);
    this.assertDocumentsComplete(application);

    if (!this.canStudentEditApplication(application.status)) {
      throw new BadRequestException('This application has already been submitted for review.');
    }

    const answers = this.normalizeAnswers(parsed.data.answers);

    if (parsed.data.submit) {
      this.assertSurveyReady(answers);
    }

    const surveyResponse = await this.prisma.surveyResponse.upsert({
      where: { applicationId: application.id },
      update: {
        answers,
        submittedAt: parsed.data.submit ? new Date() : application.surveyResponse?.submittedAt,
      },
      create: {
        applicationId: application.id,
        answers,
        submittedAt: parsed.data.submit ? new Date() : null,
      },
    });

    await this.updateEligibilitySnapshot(application, Boolean(surveyResponse.submittedAt));

    return {
      applicationId: application.id,
      questions: surveyQuestions,
      answers: this.normalizeAnswers(surveyResponse.answers as SurveyAnswers),
      submittedAt: surveyResponse.submittedAt,
    };
  }

  private async getCurrentApplication(user: AuthenticatedUser) {
    if (user.role !== RoleName.STUDENT) {
      throw new BadRequestException('Only student accounts can manage the graduation survey.');
    }

    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!profile) {
      throw new NotFoundException('Student profile was not found for this account.');
    }

    const application = await this.prisma.graduationApplication.findFirst({
      where: {
        studentProfileId: profile.id,
        status: {
          notIn: [ApplicationStatus.COMPLETED, ApplicationStatus.WITHDRAWN],
        },
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        documents: true,
        surveyResponse: true,
      },
    });

    if (!application) {
      throw new NotFoundException('Start a graduation application before completing the survey.');
    }

    return application;
  }

  private assertDocumentsComplete(application: CurrentApplication) {
    const uploadedTypes = new Set(application.documents.map((document) => document.type));
    const missingDocuments = requiredDocumentTypes.filter((documentType) => !uploadedTypes.has(documentType));

    if (missingDocuments.length > 0) {
      throw new BadRequestException('Upload all required documents before completing the senior survey.');
    }
  }

  private canStudentEditApplication(status: ApplicationStatus) {
    return status === ApplicationStatus.DRAFT || status === ApplicationStatus.RETURNED_TO_STUDENT;
  }

  private assertSurveyReady(answers: SurveyAnswers) {
    const missingFields = [
      [answers.immediatePlan, 'immediate plan after graduation'],
      [answers.attendCommencement, 'commencement attendance plan'],
      [answers.attendSeniorWeek, 'Senior Week attendance plan'],
      [answers.commencementTicketSuggestion, 'commencement ticket suggestion'],
      [answers.awardsDinnerTicketSuggestion, 'awards dinner ticket suggestion'],
      [answers.commencementInfoMethod, 'commencement information method'],
      [answers.guestLodgingPreference, 'guest lodging preference'],
      [answers.townTransportPlan, 'town transport plan'],
      [answers.photoAlbumOpinion, 'photo album opinion'],
      [answers.attendedCommencementBefore, 'previous commencement attendance'],
      [answers.commencementExpectations, 'commencement expectations'],
      [answers.myAunIs, 'My AUN is response'],
    ].flatMap(([value, label]) => (value ? [] : [label]));

    if (answers.attendCommencement === 'NO') {
      if (!answers.attendCommencementReason) {
        missingFields.push('reason for not attending commencement');
      }

      if (!answers.preferVirtualConferral) {
        missingFields.push('virtual conferral preference');
      }
    }

    if (answers.attendSeniorWeek === 'NO' && !answers.attendSeniorWeekReason) {
      missingFields.push('reason for not attending Senior Week');
    }

    if (answers.attendedCommencementBefore === 'YES') {
      if (!answers.attendedCommencementYear) {
        missingFields.push('commencement attendance year');
      }

      if (!answers.commencementOrganizationRating) {
        missingFields.push('commencement organization rating');
      }
    }

    if (missingFields.length > 0) {
      throw new BadRequestException(`Complete the survey before submitting: ${missingFields.join(', ')}.`);
    }
  }

  private serializeSurvey(application: CurrentApplication) {
    return {
      applicationId: application.id,
      questions: surveyQuestions,
      answers: this.normalizeAnswers(application.surveyResponse?.answers as SurveyAnswers | null),
      submittedAt: application.surveyResponse?.submittedAt ?? null,
    };
  }

  private normalizeAnswers(answers: SurveyAnswers | Prisma.JsonValue | null | undefined) {
    const value = answers && typeof answers === 'object' && !Array.isArray(answers) ? answers : {};
    const record = value as Record<string, unknown>;

    return {
      immediatePlan: this.readEnum(record.immediatePlan, ['NYSC', 'WORK', 'GRADUATE_DEGREE', 'LAW_SCHOOL', 'OTHER']),
      immediatePlanOther: this.readString(record.immediatePlanOther),
      attendCommencement: this.readYesMaybeNo(record.attendCommencement),
      attendCommencementReason: this.readString(record.attendCommencementReason),
      preferVirtualConferral: this.readYesMaybeNo(record.preferVirtualConferral),
      attendSeniorWeek: this.readYesMaybeNo(record.attendSeniorWeek),
      attendSeniorWeekReason: this.readString(record.attendSeniorWeekReason),
      commencementTicketSuggestion: this.readEnum(record.commencementTicketSuggestion, ['5', '6', '7', '8']),
      awardsDinnerTicketSuggestion: this.readEnum(record.awardsDinnerTicketSuggestion, ['2', '3', '4', '5', '6']),
      commencementInfoMethod: this.readEnum(record.commencementInfoMethod, ['TEXT', 'MAIL', 'EMAIL', 'OTHER']),
      commencementInfoOther: this.readString(record.commencementInfoOther),
      guestLodgingPreference: this.readEnum(record.guestLodgingPreference, [
        'AUN_HOTEL',
        'AUN_RESIDENCE_HALLS',
        'SURROUNDING_HOTELS',
        'OTHER',
      ]),
      guestLodgingOther: this.readString(record.guestLodgingOther),
      townTransportPlan: this.readEnum(record.townTransportPlan, [
        'USE_ME',
        'PERSONAL_CAR',
        'AUN_TRANSPORTATION',
        'OTHER',
      ]),
      townTransportOther: this.readString(record.townTransportOther),
      photoAlbumOpinion: this.readEnum(record.photoAlbumOpinion, [
        'I_LOVE_IT',
        'INTERESTING',
        'DONT_LIKE_IDEA',
        'PLEASE_LETS_DO_IT',
      ]),
      attendedCommencementBefore: this.readEnum(record.attendedCommencementBefore, [
        'YES',
        'NO',
        'WANTED_BUT_OFF_CAMPUS',
      ]),
      attendedCommencementYear: this.readString(record.attendedCommencementYear),
      commencementOrganizationRating: this.readEnum(record.commencementOrganizationRating, [
        'VERY_SATISFIED',
        'SATISFIED',
        'NEUTRAL',
        'UNSATISFIED',
        'VERY_UNSATISFIED',
      ]),
      improvementSuggestions: this.readString(record.improvementSuggestions),
      awardCategorySuggestions: this.readString(record.awardCategorySuggestions),
      participatedPrograms: this.readProgramList(record.participatedPrograms),
      participatedProgramsOther: this.readString(record.participatedProgramsOther),
      commencementExpectations: this.readString(record.commencementExpectations),
      myAunIs: this.readString(record.myAunIs),
    } satisfies SurveyAnswers;
  }

  private async updateEligibilitySnapshot(application: CurrentApplication, surveySubmitted: boolean) {
    await this.prisma.graduationApplication.update({
      where: { id: application.id },
      data: {
        eligibility: {
          status: surveySubmitted ? 'READY_FOR_REVIEW' : 'SURVEY_IN_PROGRESS',
          profileComplete: true,
          applicationFormComplete: true,
          documentCount: application.documents.length,
          documentsComplete: true,
          surveySubmitted,
          finalSubmissionReady: surveySubmitted,
        },
      },
    });
  }

  private readString(value: unknown) {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private readYesMaybeNo(value: unknown) {
    return this.readEnum(value, ['YES', 'MAYBE', 'NO']);
  }

  private readEnum<const T extends string>(value: unknown, allowedValues: readonly T[]) {
    return typeof value === 'string' && allowedValues.includes(value as T) ? (value as T) : null;
  }

  private readProgramList(value: unknown) {
    const allowedValues = ['MODEL_UN', 'STUDY_ABROAD', 'EMERGING_LEADERS_ACADEMY', 'HULT_PRIZE', 'OTHER'] as const;

    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((item): item is (typeof allowedValues)[number] =>
      typeof item === 'string' && allowedValues.includes(item as (typeof allowedValues)[number]),
    );
  }
}

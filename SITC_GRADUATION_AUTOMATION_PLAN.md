# SITC Graduation Automation Plan

## 1. Purpose

Build a web-based system for the American University of Nigeria that automates the graduation application and clearance process for students under SITC, the School of Information Technology and Communication.

The system should replace the current paper-heavy flow where students print forms, fill them in blue ink, attach external documents, manually complete credit audit sheets, collect Bursar clearance, and submit a physical packet to Academic Registry.

The system should not remove academic judgment. Program Chairs, Dean, Bursary, Academic Registry, and Provost should still review and approve the right parts. The system should remove duplicate entry, missing attachments, unclear status, manual checklist tracking, and most of the credit-audit arithmetic.

## 2. Source Documents Reviewed

The plan is based on these provided files:

- `Fall 2024 Graduation Announcement.pdf`
- `REVIEWED Graduation Application Form.pdf`
- `FALL 2024 GRADUATING SENIOR SURVEY.pdf`
- `SITC Audit Sheets 2022-2025 Worked ON.xlsx`

Important note: these are Fall 2024 documents and 2022-2025 audit sheets. Before production use, AUN should confirm the latest deadline, catalog rules, school/program names, fee rules, and signatory requirements.

## 3. Current Manual Process

From the announcement and forms, the current workflow is:

1. Student checks whether they are eligible to apply.
   - Announcement says students who have completed 105 credit hours and will finish academic requirements by the end of the semester are eligible to apply.
   - It also says expected graduates need at least CGPA 2.00 and all tuition/fees paid to attend commencement, receive diploma/certificate, or be mobilized for NYSC.

2. Student reviews unofficial transcript in OpenERP Self-Service.

3. Student fills an SITC credit audit sheet.
   - Student reviews it with the Program Chair.
   - Audit sheets differ by major/concentration.

4. Student prints and completes:
   - Graduation Application Form
   - Graduating Senior Survey
   - Credit Audit Sheet
   - Unofficial Transcript
   - JAMB Result Slip
   - JAMB Admission Letter
   - NIN slip

5. Student obtains Bursar clearance.

6. Student submits the packet to Academic Registry before the deadline.

7. Academic Registry checks attachments and academic completion.

8. Program Chair and Dean clear or reject the student academically.

9. After final grades are entered, Academic Registry performs final clearance.

10. Final GPA, class of degree/honors, completion term, OpenERP recording, and Provost signature are completed.

## 4. Main Problems To Solve

- Students repeat the same personal data across forms.
- Students can submit incomplete applications.
- Manual credit audits are slow and error-prone.
- Students do not have a clear live status of their application.
- Offices depend on physical movement of forms.
- Signatures/stamps create bottlenecks and make tracking difficult.
- Registry must manually verify attachments and checklist items.
- Program Chairs need to interpret different audit sheets.
- Deadlines, catalog years, and requirements are not system-enforced.
- The process creates sensitive physical copies of NIN/JAMB documents.

## 5. SITC Scope

The workbook contains these SITC pathways:

- Computer Science - Artificial Intelligence: `CS - AI`
- Computer Science - Cybersecurity/Blockchain: `CS - CB`
- Computer Science - Network/Data Communications: `CS - NDC`
- Computer Science - Web/Mobile Application Development: `CS - WMAD`
- Computer Science - Computer Systems/Applications: `CS - CSA`
- Data Science: `DSC`
- Information Systems - Generic: `IS Generic`
- Information Systems - Data Analytics: `IS DA`
- Information Systems - Information Security Assurance: `IS ISA`
- Information Systems - Management Information Systems: `IS MIS`
- Information Systems - Systems Analysis and Design: `IS SAD`
- Software Engineering: `SE`

Observed requirement pattern:

- GenEd: 51 credit hours across all sheets.
- Computer Science and Data Science: minimum 129 total credits, core 63 credits, major/concentration electives usually 6 credits, free electives usually 9 credits.
- Information Systems and Software Engineering: minimum 132 total credits, core 66 credits, major/concentration electives 6 credits, free electives usually 9 credits except Software Engineering where free electives appear as 6 credits.
- Some requirements are exact courses.
- Some requirements are course pools, such as CDV, natural sciences, social/behavioral sciences, and elective buckets.
- Some requirements need human policy confirmation, such as "consult Program Chair" electives and substitution rules.

Data quality notes from the workbook:

- The `DSC` sheet title appears to say "Bachelor of Science in Computer Science (CSA)", which may be a template typo.
- One note says `MAT 110` and `MAT 112` do not satisfy GenEd requirements and SITC free electives except for Information Systems. This should become an explicit rule after confirmation.
- The Fall 2024 announcement mentions a minimum of 123 required credit hours, while the SITC audit sheets show 129 or 132. The system should use program-specific catalog requirements and flag this discrepancy for policy confirmation.

## 6. Proposed Digital Workflow

### Student Flow

1. Student logs in with AUN email.
2. System loads or asks for student profile:
   - Full name as it should appear on diploma
   - Student ID
   - School
   - Major
   - Concentration
   - Minor
   - Catalog year
   - Current GPA
   - Date of birth, gender, state of origin confirmation
   - Shipping address
   - Phone number
   - Parent/guardian contact details

3. Student confirms OpenERP accuracy:
   - Major
   - Concentration
   - Minor
   - Full name
   - Date of birth
   - Gender
   - State of origin
   - Catalog year

4. Student completes graduation survey digitally.

5. Student uploads required documents:
   - JAMB Admission Letter
   - JAMB Result Slip
   - NIN slip
   - Unofficial Transcript, unless imported from OpenERP

6. Student imports or enters transcript courses.
   - MVP can accept CSV/manual entry.
   - Later versions should connect to OpenERP or parse uploaded transcript PDFs.

7. System runs a preliminary degree audit.
   - Completed courses
   - In-progress courses
   - Pending/missing courses
   - Total credits
   - GenEd completion
   - Core completion
   - Major/concentration elective completion
   - Free elective completion
   - Minimum GPA warning

8. Student fixes missing data and submits.

9. Student sees live status, comments, and returned items.

### Bursary Flow

1. Bursary officer sees submitted applications awaiting finance clearance.
2. Officer marks financially cleared: yes/no.
3. Officer adds remarks and optional attachment.
4. If not cleared, application returns to student with visible reason.
5. If cleared, application proceeds to academic review.

### Program Chair Flow

1. Program Chair sees students in their major/concentration.
2. Chair reviews the automated audit.
3. Chair can approve substitutions, waive requirements where policy allows, or mark courses as satisfying a bucket.
4. Chair marks cleared/not cleared and adds comments.

### Dean Flow

1. Dean reviews Program Chair decision and audit summary.
2. Dean marks cleared/not cleared and comments.

### Academic Registry Flow

1. Registry verifies required attachments.
2. Registry verifies:
   - Graduation requirements
   - JAMB admission letter
   - JAMB result slip
   - Survey completion
   - NIN slip
   - Credit audit
   - Unofficial transcript
   - In-progress courses
   - Pending courses

3. Registry can return application for corrections.
4. After final grade entry, Registry performs final audit.
5. Registry records:
   - Completion term
   - Final GPA
   - Degree honors/class
   - OpenERP recording confirmation

### Provost Flow

1. Provost reviews final clearance summary.
2. Provost signs/approves digitally.
3. Application becomes completed.

## 7. What Should Be Automated

### Must Automate In MVP

- Digital graduation application form.
- Digital senior survey.
- Required document upload checklist.
- Deadline enforcement.
- Student eligibility pre-check.
- Bursar clearance workflow.
- Program Chair review workflow.
- Dean review workflow.
- Registry checklist workflow.
- Final Registry clearance workflow.
- Degree audit for the 12 SITC sheets.
- In-progress and pending course listing.
- Role-based dashboards.
- Email notifications to AUN email.
- PDF generation for official archive/printing.
- Audit log of all changes, comments, approvals, and returns.

### Should Automate After MVP

- OpenERP transcript import.
- OpenERP profile sync.
- OpenERP fee clearance sync.
- Transcript PDF parsing.
- Automatic class of degree/honors calculation after final GPA.
- Payment/fee posting integration.
- Digital signature certificates or institution-approved e-signatures.
- Analytics for Registry and SITC leadership.

### Keep Human-Reviewed

- Bursar financial clearance.
- Course substitutions.
- Transfer credit decisions.
- Catalog exceptions.
- Program Chair academic judgment.
- Dean approval.
- Registry final interpretation.
- Provost final approval.
- Verification of JAMB/NIN uploaded documents, unless AUN later integrates an official verification API.

## 8. Core Product Modules

1. Authentication and Roles
   - Student
   - Program Chair
   - Dean
   - Bursary Officer
   - Registry Officer
   - Provost
   - System Admin

2. Student Profile
   - Student ID
   - Names
   - AUN email
   - Major/concentration/minor
   - Catalog year
   - GPA
   - Contact details
   - Parent/guardian details
   - Diploma/transcript shipping address

3. Graduation Application
   - Term
   - Status
   - Eligibility flags
   - OpenERP confirmation answers
   - Signature confirmation
   - Submission timestamp

4. Senior Survey
   - Commencement attendance
   - Senior Week attendance
   - Ticket preferences
   - Lodging/transport preferences
   - Class album preference
   - Ceremony feedback
   - Suggested awards
   - Program participation
   - Expectations
   - "My AUN is" response

5. Document Uploads
   - JAMB admission letter
   - JAMB result slip
   - NIN slip
   - Unofficial transcript
   - Optional supporting documents

6. Degree Audit Engine
   - Course catalog
   - Program requirements
   - Catalog-year rules
   - Transcript courses
   - In-progress courses
   - Pending courses
   - Substitutions/waivers
   - Requirement satisfaction results

7. Clearance Workflow
   - Bursary clearance
   - Program Chair clearance
   - Dean clearance
   - Registry intake clearance
   - Final Registry clearance
   - Provost approval

8. Notifications
   - Submission confirmation
   - Returned for correction
   - Bursary decision
   - Chair/Dean/Registry/Provost decisions
   - Deadline reminders
   - Final clearance result

9. Admin Console
   - Manage terms
   - Manage deadlines
   - Manage catalog years
   - Manage requirements
   - Manage roles
   - Export reports

## 9. Recommended Tech Stack

### Best Fit For This Project

- Frontend: Next.js with TypeScript
- Backend: Next.js API routes or NestJS if the backend grows large
- Database: PostgreSQL
- ORM: Prisma
- UI: Tailwind CSS plus a component library such as shadcn/ui
- Authentication: Auth.js/NextAuth with AUN email domain restriction, or Microsoft/Google SSO if AUN supports it
- File storage: S3-compatible storage, such as AWS S3, MinIO, Supabase Storage, or institution-hosted object storage
- PDF generation: `pdf-lib` for form-like PDFs, or Playwright/Puppeteer for rendered official PDF packets
- Email: AUN SMTP, Microsoft 365 SMTP, or a transactional email provider approved by AUN
- Background jobs: Postgres-backed task records for the MVP; Redis/BullMQ can be added later only if the system needs heavier queues
- Deployment: institution server, Azure, AWS, Render/Railway for prototype, or Vercel plus managed PostgreSQL for a small pilot
- Testing: Vitest/Jest for unit tests, Playwright for end-to-end tests

Why this stack fits:

- TypeScript keeps form-heavy and rule-heavy data safer.
- Next.js allows a fast full-stack MVP with one codebase.
- PostgreSQL fits structured academic records, audit logs, and JSONB rule metadata.
- Prisma makes schema evolution clear.
- Playwright can test the full clearance workflow realistically.

### Strong Alternative

- Frontend: React
- Backend: Django + Django REST Framework
- Database: PostgreSQL

This is also excellent if the team is more comfortable with Python or expects heavy document parsing/data processing.

## 10. Suggested Data Model

Main tables/entities:

- `users`
- `roles`
- `student_profiles`
- `academic_terms`
- `programs`
- `catalog_years`
- `courses`
- `program_requirements`
- `requirement_groups`
- `requirement_rules`
- `transcript_courses`
- `degree_audit_runs`
- `degree_audit_results`
- `graduation_applications`
- `survey_responses`
- `document_uploads`
- `clearance_tasks`
- `approvals`
- `comments`
- `notifications`
- `audit_logs`
- `fee_clearances`
- `substitutions`
- `waivers`

Important design choice: store degree requirements as versioned database rules, not as hard-coded logic. That lets SITC update catalog years, course pools, substitutions, elective options, and minimum credits without redeploying code.

## 11. Degree Audit Rule Types

The audit engine should support:

- Exact course required, for example `CIE 105`.
- Course alternative, for example `PHY 131` or `PHY 205`.
- Credit bucket, for example any approved CDV course worth 3 credits.
- Category bucket, for example Social and Behavioral Sciences.
- Choose N credits from list, for example 6 credits from concentration electives.
- Free elective bucket.
- Exclusion rules, for example `MAT 110`/`MAT 112` not counting for certain buckets after policy confirmation.
- Program-specific minimum credits.
- GPA minimum check.
- In-progress course handling.
- Repeated course handling.
- Transfer course mapping.
- Substitution/waiver with approver and reason.

## 12. Application Statuses

Suggested status flow:

1. `draft`
2. `submitted`
3. `returned_to_student`
4. `bursary_pending`
5. `bursary_not_cleared`
6. `bursary_cleared`
7. `chair_review`
8. `chair_not_cleared`
9. `chair_cleared`
10. `dean_review`
11. `dean_not_cleared`
12. `dean_cleared`
13. `registry_intake_review`
14. `waiting_for_final_grades`
15. `final_registry_review`
16. `provost_review`
17. `completed`
18. `not_cleared`
19. `withdrawn`

Each status transition should record actor, timestamp, comments, and previous value.

## 13. Roadmap

### Phase 0: Validation and Policy Cleanup, 1 week

- Confirm current SITC programs and concentrations.
- Confirm catalog years to support.
- Resolve 123 vs 129/132 credit discrepancy.
- Confirm if the process may legally use digital signatures.
- Confirm document retention policy for NIN/JAMB.
- Confirm OpenERP integration options.
- Collect anonymized transcript samples for testing.

### Phase 1: MVP Foundation, 2 weeks

- Build authentication and role management.
- Build student profile and application form.
- Build senior survey.
- Build document upload checklist.
- Build term/deadline admin setup.
- Build student dashboard and submission flow.

### Phase 2: SITC Degree Audit, 2-3 weeks

- Convert the 12 Excel sheets into structured requirement data.
- Build the rule engine.
- Build transcript entry/import screen.
- Generate audit summary with completed, in-progress, and pending courses.
- Add chair override/substitution workflow.
- Test against known manual audits.

### Phase 3: Clearance Workflow, 2 weeks

- Add Bursary dashboard.
- Add Program Chair dashboard.
- Add Dean dashboard.
- Add Academic Registry checklist.
- Add final Registry clearance.
- Add Provost approval.
- Add return-for-correction loops.

### Phase 4: Official Outputs and Notifications, 1 week

- Generate official PDF packets.
- Email status updates.
- Add CSV/Excel exports for Registry.
- Add audit logs and admin reporting.

### Phase 5: Pilot, 2 weeks

- Pilot with one or two SITC programs.
- Compare automated audits with manual Chair/Registry audits.
- Fix rule gaps.
- Train users.
- Run the next graduation cycle in parallel with paper before full replacement.

### Phase 6: Production Expansion

- Add OpenERP integration.
- Add fee clearance sync.
- Add transcript parsing.
- Add advanced analytics.
- Add secure long-term archive.
- Expand beyond SITC only after SITC is stable.

## 14. MVP Acceptance Criteria

The MVP is successful when:

- A student can submit a complete application without printing forms.
- The system prevents submission when required fields/documents are missing.
- The student can complete the graduation survey online.
- The system produces an SITC degree audit matching manual review for test cases.
- Program Chair can approve, reject, comment, substitute, or return.
- Bursary can mark financially cleared/not cleared.
- Registry can verify all checklist items digitally.
- Dean and Provost can approve digitally or through institution-approved signature workflow.
- Student can track status from submission to final decision.
- Registry can export a list of applicants, pending items, and cleared students.
- Every action is audit-logged.

## 15. Security and Privacy Requirements

- Require AUN email login or institution SSO.
- Enforce role-based access control.
- Encrypt files at rest.
- Use HTTPS only.
- Store NIN/JAMB documents with restricted access.
- Add audit logs for every sensitive document view/download.
- Use least-privilege access for Bursary, Chairs, Dean, Registry, and Provost.
- Define retention/deletion policy for documents.
- Back up the database and files.
- Avoid exposing student financial status beyond required clearance result.

## 16. Reporting and Analytics

Useful reports:

- Applicants by major/concentration.
- Submitted vs draft applications.
- Missing document counts.
- Bursary cleared vs not cleared.
- Academic cleared vs not cleared.
- Common pending courses by program.
- Students awaiting final grades.
- Students eligible for commencement.
- Students eligible for NYSC mobilization, if approved by Registry policy.
- Survey results for commencement planning.

## 17. Key Open Questions

- Is SITC officially the School of Information Technology and Communication in the current academic structure?
- Which catalog years must be supported besides 2022-2025?
- Should the system enforce 105 earned credits for application submission or only warn?
- Which program-specific minimum should control: announcement's 123 credits or audit sheet's 129/132 credits?
- Can OpenERP expose transcript/profile/finance data by API or export?
- Are electronic signatures acceptable for Bursar, Chair, Dean, Registry, and Provost?
- Who can approve course substitutions?
- How should repeated courses and failed courses be handled?
- How should transfer credits be represented?
- Should students be allowed to edit profile data, or only request corrections from Registry?
- What is the official retention period for NIN/JAMB uploads?

## 18. Recommended Build Order

Build the system in this order:

1. Student application + survey + uploads.
2. Admin setup for terms, deadlines, programs, and users.
3. Transcript entry/import.
4. Degree-audit engine for SITC.
5. Bursary/Chair/Dean/Registry/Provost workflow.
6. PDF packet generation and exports.
7. Notifications and reminders.
8. OpenERP integration.

This order gives AUN a useful paper-reduction MVP quickly, while leaving the hardest integration work until the internal workflow has been validated.

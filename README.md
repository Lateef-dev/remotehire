# RemoteHire: a full stack remote job board

RemoteHire connects remote-first companies with developers. Employers post jobs and move applicants through a hiring pipeline. Candidates search and filter roles, save jobs, apply in one click and track every application.

**Stack:** TypeScript (strict, end to end) · Next.js 16 (App Router) · React 19 · Redux Toolkit + RTK Query · Tailwind CSS 4 · Node.js · Express 5 · MongoDB + Mongoose · Zod · JWT (httpOnly cookies) · Vitest + Supertest

![Job search](docs/screenshots/jobs.png)

## Features

**Accounts**
- Sign up as a candidate or an employer, then sign in and out
- Forgot password: request a reset link by email, then choose a new password. Links are single-use and expire after 30 minutes
- Change password from the profile page
- Changing or resetting a password signs you out on every other device

**Candidates**
- Search jobs by title, company or skill, with filters for job type, level, region, minimum salary and skills
- Filters live in the URL, so every search can be shared and bookmarked
- Worldwide roles appear under every region filter, so candidates never miss a job they can take
- Upload a resume (PDF or Word, up to 4 MB, drag and drop or file picker) or share a link, then apply with an optional cover letter
- Dashboard that tracks each application's status (submitted, in review, shortlisted, hired), with withdraw
- Save jobs for later

**Employers**
- Post, edit, close, reopen and delete jobs
- Dashboard with open roles, applicant totals and a per-job pipeline bar
- Review applicants by status, read cover letters and open uploaded or linked resumes
- Move applicants through the pipeline; candidates see the change on their dashboard
- Company profile (name, logo, website, about) shown on every job

**Engineering**
- Written in strict TypeScript on both sides. API request and response shapes are typed from the Zod schemas and Mongoose models, and every RTK Query endpoint is typed
- The API runs `.ts` files directly with Node's built-in type stripping, so there is no build step to deploy
- Role-based access control enforced on the API (employers cannot see other employers' applicants, candidates cannot post jobs)
- Zod validation on every request body and query, with field-level error messages shown in the UI
- Uploaded resumes are stored in MongoDB GridFS (no extra storage service). The file type is checked from the file's own bytes, not the name, and a resume can only be opened by its owner and by employers who received it in an application. Files still used by an application are kept when the candidate replaces their profile resume
- Password reset tokens are 256-bit random values. Only their SHA-256 hash is stored, and the forgot-password endpoint gives the same answer whether or not the email exists, so it can't reveal who has an account
- Each JWT carries a session version that goes up on every password change, so older sessions stop working at once
- Demo accounts are protected: their public password can't be reset or changed
- JWT stored in an httpOnly cookie. Next.js proxies `/api/*` to Express, so the cookie is first-party in every environment
- Helmet, CORS allow-list, rate-limited auth routes, bcrypt password hashing, safe `?next=` redirects
- One application per candidate per job, enforced by a unique MongoDB index
- 14 API integration tests covering auth, search and filters, permissions and the full hiring flow
- GitHub Actions CI runs the API tests and the production build on every push

| Candidate dashboard | Employer dashboard |
| --- | --- |
| ![Candidate dashboard](docs/screenshots/candidate-dashboard.png) | ![Employer dashboard](docs/screenshots/employer-dashboard.png) |

| Applicant review | Mobile job page |
| --- | --- |
| ![Applicants](docs/screenshots/applicants.png) | ![Mobile](docs/screenshots/job-mobile.png) |

## Architecture

```
remotehire/
├── client/                 Next.js app (deploys to Vercel)
│   └── src/
│       ├── app/            Routes: /, /jobs, /jobs/[id], /dashboard, /dashboard/jobs/..., /profile, /login, /register
│       ├── components/     JobCard, JobForm, AuthForm, RequireAuth, dashboards, UI primitives
│       ├── store/          Redux store, typed hooks, RTK Query API slice (cache tags + invalidation), toast slice
│       └── lib/            Shared types, formatting helpers and constants
└── server/                 Express API (deploys to Render, Railway or Fly.io)
    ├── src/
    │   ├── models/         User, Job, Application (Mongoose)
    │   ├── controllers/    auth, jobs, applications, users
    │   ├── routes/         Route definitions with auth, role and validation middleware
    │   ├── middleware/     requireAuth, requireRole, validate (zod), error handler
    │   ├── utils/          Zod schemas (+ inferred input types), constants, ApiError
    │   ├── types/          Express Request augmentation (req.user)
    │   └── scripts/seed.ts Demo data
    └── tests/              Vitest + Supertest + in-memory MongoDB
```

Browser → Next.js (`/api/*` rewrite) → Express → MongoDB. RTK Query caches every response and uses tags to refetch only what a mutation changed. For example, changing an applicant's status refreshes the applicant list and the employer's pipeline stats, and nothing else.

## Data model

- **User**: name, email, password (bcrypt), role (`candidate` or `employer`), candidate profile (headline, skills, resumeUrl, resumeFile, savedJobs), employer company (name, logo, website, about)
- **Job**: employer, title, description, requirements, type, level, region, timezone, salary range, tags, status (`open` or `closed`), applicationsCount
- **Application**: job, candidate, employer, resumeUrl and/or resumeFile, coverLetter, status. Unique on `(job, candidate)`

## API

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | Public | Create a candidate or employer account |
| POST | `/api/auth/login` | Public | Sign in (sets cookie) |
| POST | `/api/auth/logout` | Public | Clear the session |
| GET | `/api/auth/me` | Signed in | Current user |
| POST | `/api/auth/forgot-password` | Public | Email a password reset link |
| POST | `/api/auth/reset-password` | Public | Set a new password with the emailed token (signs in) |
| PATCH | `/api/auth/password` | Signed in | Change password (needs the current one) |
| PATCH | `/api/users/me` | Signed in | Update profile (fields depend on role) |
| PUT | `/api/users/me/resume` | Candidate | Upload a resume (raw file body, name in `X-File-Name`) |
| DELETE | `/api/users/me/resume` | Candidate | Remove the profile resume |
| GET | `/api/resumes/:fileId` | Owner or receiving employer | Open an uploaded resume |
| GET | `/api/jobs` | Public | Search: `q, type, level, region, tags, minSalary, sort, page, limit` |
| GET | `/api/jobs/meta` | Public | Filter options, popular tags, counts |
| GET | `/api/jobs/:id` | Public | Job detail, plus viewer state (applied, saved, owner) |
| POST | `/api/jobs` | Employer | Post a job |
| PATCH / DELETE | `/api/jobs/:id` | Job owner | Edit, close or delete a job |
| GET | `/api/jobs/mine` | Employer | My jobs with pipeline counts |
| POST | `/api/jobs/:id/apply` | Candidate | Apply |
| GET | `/api/jobs/:id/applications` | Job owner | Applicants, optional `?status=` |
| PATCH | `/api/applications/:id/status` | Job owner | Move an applicant through the pipeline |
| GET | `/api/applications/me` | Candidate | My applications |
| DELETE | `/api/applications/:id` | Candidate | Withdraw (before a decision) |
| GET / PUT / DELETE | `/api/users/me/saved[/:jobId]` | Candidate | Saved jobs |

Errors always look like `{ "error": { "message": "...", "details": [{ "path": "...", "message": "..." }] } }`.

## Run it locally

You need Node.js 22.18 or newer (for native TypeScript support) and MongoDB (local, Docker, or a free MongoDB Atlas cluster).

```bash
# 1. Start MongoDB (or use an Atlas connection string in server/.env)
docker compose up -d

# 2. API
cd server
cp .env.example .env
npm install
npm run seed        # demo employers, candidates, jobs and applications
npm run dev         # http://localhost:4000

# 3. Web app (new terminal)
cd client
cp .env.example .env.local
npm install
npm run dev         # http://localhost:3000
```

Demo accounts (password `password123`), also available as one-click buttons on the sign-in page:
- Candidate: `candidate@remotehire.dev`
- Employer: `hiring@lumenpay.dev`

Type-check and test:

```bash
cd server && npm run typecheck && npm test   # tests start an in-memory MongoDB
cd client && npm run typecheck
```

To run the tests against a MongoDB you already have running, set `MONGO_URI_TEST=mongodb://127.0.0.1:27017`.

## Deploy

1. **Database**: create a free MongoDB Atlas cluster and copy its connection string.
2. **API**: deploy `server/` to Render (or Railway). Build command `npm install`, start command `npm start`. Set `MONGODB_URI`, `JWT_SECRET`, `NODE_ENV=production` and `CLIENT_ORIGIN=https://your-app.vercel.app`. To send password reset emails, also set `RESEND_API_KEY` (free at [resend.com](https://resend.com)) and optionally `EMAIL_FROM`. Run `npm run seed` once if you want demo data.
3. **Web**: import the repo on Vercel with `client` as the root directory, and set `API_URL` to the API's URL. Because Vercel proxies `/api/*`, cookies work without any cross-site setup.

## What I would add next

- Email notifications when an application's status changes
- Full-text search with MongoDB Atlas Search
- Company pages listing all of a company's open roles

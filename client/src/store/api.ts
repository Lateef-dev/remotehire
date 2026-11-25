import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  Applicant,
  ApplicationStatus,
  CandidateApplication,
  Job,
  JobFilters,
  JobInput,
  JobMeta,
  JobSummary,
  JobViewer,
  MyJob,
  Paginated,
  Pipeline,
  ProfileInput,
  User,
} from '@/lib/types';

type QueryValue = string | number | string[] | undefined | null;

const toQuery = (params: Record<string, QueryValue> = {}) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value) && value.length === 0) continue;
    search.set(key, Array.isArray(value) ? value.join(',') : String(value));
  }
  const s = search.toString();
  return s ? `?${s}` : '';
};

type Session = { user: User; token: string };

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api', credentials: 'include' }),
  tagTypes: ['Me', 'Job', 'Jobs', 'MyJobs', 'MyApplications', 'Applicants', 'Saved'],
  endpoints: (build) => ({
    // Auth
    getMe: build.query<User, void>({
      query: () => '/auth/me',
      transformResponse: (r: { user: User }) => r.user,
      providesTags: ['Me'],
    }),
    login: build.mutation<Session, { email: string; password: string }>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
      invalidatesTags: ['Me', 'Job', 'MyApplications', 'MyJobs', 'Saved'],
    }),
    register: build.mutation<Session, { name: string; email: string; password: string; role: string; companyName?: string }>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
      invalidatesTags: ['Me', 'Job'],
    }),
    logout: build.mutation<void, void>({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        await queryFulfilled;
        dispatch(api.util.resetApiState());
      },
    }),
    forgotPassword: build.mutation<{ message: string }, { email: string }>({
      query: (body) => ({ url: '/auth/forgot-password', method: 'POST', body }),
    }),
    resetPassword: build.mutation<Session, { token: string; password: string }>({
      query: (body) => ({ url: '/auth/reset-password', method: 'POST', body }),
      // The reset signs the user in, so refresh everything tied to the session.
      invalidatesTags: ['Me', 'Job', 'MyApplications', 'MyJobs', 'Saved'],
    }),
    changePassword: build.mutation<Session, { currentPassword: string; newPassword: string }>({
      query: (body) => ({ url: '/auth/password', method: 'PATCH', body }),
    }),
    updateProfile: build.mutation<{ user: User }, ProfileInput>({
      query: (body) => ({ url: '/users/me', method: 'PATCH', body }),
      invalidatesTags: ['Me', 'Jobs', 'MyJobs'],
    }),

    // Jobs
    getJobs: build.query<Paginated<JobSummary>, JobFilters>({
      query: (params) => `/jobs${toQuery({ ...params })}`,
      providesTags: ['Jobs'],
    }),
    getJobMeta: build.query<JobMeta, void>({ query: () => '/jobs/meta', providesTags: ['Jobs'] }),
    getJob: build.query<{ job: Job; viewer: JobViewer | null }, string>({
      query: (id) => `/jobs/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Job', id }],
    }),
    getMyJobs: build.query<
      { jobs: MyJob[]; stats: { openJobs: number; totalJobs: number; applications: Pipeline } },
      void
    >({ query: () => '/jobs/mine', providesTags: ['MyJobs'] }),
    createJob: build.mutation<{ job: Job }, JobInput>({
      query: (body) => ({ url: '/jobs', method: 'POST', body }),
      invalidatesTags: ['Jobs', 'MyJobs'],
    }),
    updateJob: build.mutation<{ job: Job }, Partial<JobInput> & { id: string }>({
      query: ({ id, ...body }) => ({ url: `/jobs/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, { id }) => ['Jobs', 'MyJobs', { type: 'Job', id }],
    }),
    deleteJob: build.mutation<void, string>({
      query: (id) => ({ url: `/jobs/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Jobs', 'MyJobs'],
    }),

    // Applications
    applyToJob: build.mutation<unknown, { id: string; coverLetter?: string; resumeUrl?: string }>({
      query: ({ id, ...body }) => ({ url: `/jobs/${id}/apply`, method: 'POST', body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Job', id }, 'MyApplications'],
    }),
    getMyApplications: build.query<CandidateApplication[], void>({
      query: () => '/applications/me',
      transformResponse: (r: { applications: CandidateApplication[] }) => r.applications,
      providesTags: ['MyApplications'],
    }),
    withdrawApplication: build.mutation<void, string>({
      query: (id) => ({ url: `/applications/${id}`, method: 'DELETE' }),
      invalidatesTags: ['MyApplications', 'Job'],
    }),
    getApplicants: build.query<
      { job: { _id: string; title: string }; applications: Applicant[] },
      { jobId: string; status?: ApplicationStatus }
    >({
      query: ({ jobId, status }) => `/jobs/${jobId}/applications${toQuery({ status })}`,
      providesTags: ['Applicants'],
    }),
    updateApplicationStatus: build.mutation<unknown, { id: string; status: ApplicationStatus }>({
      query: ({ id, status }) => ({ url: `/applications/${id}/status`, method: 'PATCH', body: { status } }),
      invalidatesTags: ['Applicants', 'MyJobs'],
    }),

    // Saved jobs
    getSavedJobs: build.query<JobSummary[], void>({
      query: () => '/users/me/saved',
      transformResponse: (r: { jobs: JobSummary[] }) => r.jobs,
      providesTags: ['Saved'],
    }),
    toggleSavedJob: build.mutation<void, { id: string; saved?: boolean }>({
      query: ({ id, saved }) => ({ url: `/users/me/saved/${id}`, method: saved ? 'DELETE' : 'PUT' }),
      invalidatesTags: (_r, _e, { id }) => ['Saved', 'Me', { type: 'Job', id }],
    }),
  }),
});

export const {
  useGetMeQuery,
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useUpdateProfileMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useChangePasswordMutation,
  useGetJobsQuery,
  useGetJobMetaQuery,
  useGetJobQuery,
  useGetMyJobsQuery,
  useCreateJobMutation,
  useUpdateJobMutation,
  useDeleteJobMutation,
  useApplyToJobMutation,
  useGetMyApplicationsQuery,
  useWithdrawApplicationMutation,
  useGetApplicantsQuery,
  useUpdateApplicationStatusMutation,
  useGetSavedJobsQuery,
  useToggleSavedJobMutation,
} = api;

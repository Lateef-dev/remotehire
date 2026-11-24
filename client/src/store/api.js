import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const toQuery = (params = {}) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, Array.isArray(value) ? value.join(',') : String(value));
  }
  const s = search.toString();
  return s ? `?${s}` : '';
};

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api', credentials: 'include' }),
  tagTypes: ['Me', 'Job', 'Jobs', 'MyJobs', 'MyApplications', 'Applicants', 'Saved'],
  endpoints: (build) => ({
    // Auth
    getMe: build.query({
      query: () => '/auth/me',
      transformResponse: (r) => r.user,
      providesTags: ['Me'],
    }),
    login: build.mutation({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
      invalidatesTags: ['Me', 'Job', 'MyApplications', 'MyJobs', 'Saved'],
    }),
    register: build.mutation({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
      invalidatesTags: ['Me', 'Job'],
    }),
    logout: build.mutation({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        await queryFulfilled;
        dispatch(api.util.resetApiState());
      },
    }),
    updateProfile: build.mutation({
      query: (body) => ({ url: '/users/me', method: 'PATCH', body }),
      invalidatesTags: ['Me', 'Jobs', 'MyJobs'],
    }),

    // Jobs
    getJobs: build.query({
      query: (params) => `/jobs${toQuery(params)}`,
      providesTags: ['Jobs'],
    }),
    getJobMeta: build.query({ query: () => '/jobs/meta', providesTags: ['Jobs'] }),
    getJob: build.query({
      query: (id) => `/jobs/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Job', id }],
    }),
    getMyJobs: build.query({ query: () => '/jobs/mine', providesTags: ['MyJobs'] }),
    createJob: build.mutation({
      query: (body) => ({ url: '/jobs', method: 'POST', body }),
      invalidatesTags: ['Jobs', 'MyJobs'],
    }),
    updateJob: build.mutation({
      query: ({ id, ...body }) => ({ url: `/jobs/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, { id }) => ['Jobs', 'MyJobs', { type: 'Job', id }],
    }),
    deleteJob: build.mutation({
      query: (id) => ({ url: `/jobs/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Jobs', 'MyJobs'],
    }),

    // Applications
    applyToJob: build.mutation({
      query: ({ id, ...body }) => ({ url: `/jobs/${id}/apply`, method: 'POST', body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Job', id }, 'MyApplications'],
    }),
    getMyApplications: build.query({
      query: () => '/applications/me',
      transformResponse: (r) => r.applications,
      providesTags: ['MyApplications'],
    }),
    withdrawApplication: build.mutation({
      query: (id) => ({ url: `/applications/${id}`, method: 'DELETE' }),
      invalidatesTags: ['MyApplications', 'Job'],
    }),
    getApplicants: build.query({
      query: ({ jobId, status }) => `/jobs/${jobId}/applications${toQuery({ status })}`,
      providesTags: ['Applicants'],
    }),
    updateApplicationStatus: build.mutation({
      query: ({ id, status }) => ({ url: `/applications/${id}/status`, method: 'PATCH', body: { status } }),
      invalidatesTags: ['Applicants', 'MyJobs'],
    }),

    // Saved jobs
    getSavedJobs: build.query({
      query: () => '/users/me/saved',
      transformResponse: (r) => r.jobs,
      providesTags: ['Saved'],
    }),
    toggleSavedJob: build.mutation({
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

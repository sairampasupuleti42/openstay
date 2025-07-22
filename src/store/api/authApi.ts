import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';

// Auth API slice using RTK Query
export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['Auth', 'User'],
  endpoints: () => ({}),
});

// Export empty object for now - will be populated in next phase
export default authApi;

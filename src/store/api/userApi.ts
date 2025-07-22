import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';

// User API slice using RTK Query
export const userApi = createApi({
  reducerPath: 'userApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['User', 'Profile'],
  endpoints: () => ({}),
});

export default userApi;

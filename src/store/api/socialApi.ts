import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';

// Social API slice using RTK Query
export const socialApi = createApi({
  reducerPath: 'socialApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['Social', 'Following', 'Followers'],
  endpoints: () => ({}),
});

export default socialApi;

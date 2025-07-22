import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';

// Messaging API slice using RTK Query
export const messagingApi = createApi({
  reducerPath: 'messagingApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['Conversation', 'Message'],
  endpoints: () => ({}),
});

export default messagingApi;

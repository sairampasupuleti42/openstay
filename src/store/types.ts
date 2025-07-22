// Store types - separate file to avoid circular dependencies
export interface StoreTypes {
  // This will be populated by the store configuration
}

// These will be overridden by the actual store types
export type RootState = any;
export type AppDispatch = any;

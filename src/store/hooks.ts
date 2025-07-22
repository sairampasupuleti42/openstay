import { useDispatch, useSelector } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RootState = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AppDispatch = any;

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

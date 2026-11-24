import { configureStore } from '@reduxjs/toolkit';
import { api } from './api';
import toastReducer from './toastSlice';

export const makeStore = () =>
  configureStore({
    reducer: {
      [api.reducerPath]: api.reducer,
      toast: toastReducer,
    },
    middleware: (getDefault) => getDefault().concat(api.middleware),
  });

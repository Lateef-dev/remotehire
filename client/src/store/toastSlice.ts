import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';

export type ToastTone = 'success' | 'error';
export interface Toast {
  id: string;
  message: string;
  tone: ToastTone;
}

const toastSlice = createSlice({
  name: 'toast',
  initialState: [] as Toast[],
  reducers: {
    pushToast: {
      reducer: (state, action: PayloadAction<Toast>) => {
        state.push(action.payload);
      },
      prepare: (message: string, tone: ToastTone = 'success') => ({ payload: { id: nanoid(), message, tone } }),
    },
    dismissToast: (state, action: PayloadAction<string>) => state.filter((t) => t.id !== action.payload),
  },
});

export const { pushToast, dismissToast } = toastSlice.actions;
export default toastSlice.reducer;

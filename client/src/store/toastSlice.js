import { createSlice, nanoid } from '@reduxjs/toolkit';

const toastSlice = createSlice({
  name: 'toast',
  initialState: [],
  reducers: {
    pushToast: {
      reducer: (state, action) => {
        state.push(action.payload);
      },
      prepare: (message, tone = 'success') => ({ payload: { id: nanoid(), message, tone } }),
    },
    dismissToast: (state, action) => state.filter((t) => t.id !== action.payload),
  },
});

export const { pushToast, dismissToast } = toastSlice.actions;
export default toastSlice.reducer;

'use client';

import { useState, type ReactNode } from 'react';
import { Provider } from 'react-redux';
import { makeStore } from './index';

export default function Providers({ children }: { children: ReactNode }) {
  // One store per browser session (and per request on the server).
  const [store] = useState(makeStore);
  return <Provider store={store}>{children}</Provider>;
}

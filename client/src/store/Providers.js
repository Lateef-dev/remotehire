'use client';

import { useState } from 'react';
import { Provider } from 'react-redux';
import { makeStore } from './index';

export default function Providers({ children }) {
  // One store per browser session (and per request on the server).
  const [store] = useState(makeStore);
  return <Provider store={store}>{children}</Provider>;
}

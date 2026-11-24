import { createApp } from './app.ts';
import { connectDB } from './config/db.ts';
import { env } from './config/env.ts';

await connectDB(env.mongoUri);
const app = createApp();
app.listen(env.port, () => {
  console.log(`RemoteHire API listening on http://localhost:${env.port}`);
});

/**
 * Accounts created by the seed script. Their passwords are published on the sign-in page,
 * so nobody may change or reset them; otherwise one visitor could lock everyone else out of the demo.
 */
export const DEMO_EMAILS = new Set([
  'hiring@lumenpay.dev',
  'talent@northstack.dev',
  'jobs@brightlearn.dev',
  'candidate@remotehire.dev',
  'tolu@remotehire.dev',
]);

export const DEMO_PASSWORD_MESSAGE =
  "Demo accounts share a public password, so it can't be changed. Create your own account to try this.";

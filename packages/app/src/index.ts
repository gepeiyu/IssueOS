import { run } from 'probot';
import app from '@issueos/github-app';

if (process.env.NODE_ENV !== 'test') {
  const { requireEnv } = await import('@issueos/github-app');
  requireEnv();
}

run(app);

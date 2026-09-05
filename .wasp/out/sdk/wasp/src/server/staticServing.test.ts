import express from 'express';
import { expect, test } from 'vitest';
import { serveStaticClient } from './staticServing';

test('denies public signup before an already mounted Wasp router', async () => {
  const app = express();
  const waspRouter = express.Router();
  waspRouter.post('/auth/email/signup', (_req, res) => res.status(201).end());
  app.use(waspRouter);
  const server = app.listen(0);
  await serveStaticClient({ app, server });
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${(address as any).port}/auth/email/signup`, { method: 'POST' });
  await new Promise<void>((resolve) => server.close(() => resolve()));
  expect(response.status).toBe(404);
});

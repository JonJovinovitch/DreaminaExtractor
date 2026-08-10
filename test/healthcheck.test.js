import assert from 'node:assert/strict';
import test from 'node:test';
import { once } from 'node:events';
import { server } from '../server.js';

test('health endpoint returns HTTP 200', async (context) => {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  context.after(() => server.close());

  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/health`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok' });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { extractCandidates } from '../server.js';

test('finds an Open Graph video regardless of attribute order', () => {
  const html = '<meta content="https://cdn.example.com/video" property="og:video">';
  assert.deepEqual(extractCandidates(html, 'https://dreamina.capcut.com/share'), ['https://cdn.example.com/video']);
});

test('finds direct normal and JSON-escaped file URLs', () => {
  const html = 'https://cdn.example.com/a.mp4?x=1 {"url":"https:\\/\\/cdn.example.com\\/b.m3u8"}';
  assert.deepEqual(extractCandidates(html, 'https://dreamina.capcut.com/share'), [
    'https://cdn.example.com/a.mp4?x=1',
    'https://cdn.example.com/b.m3u8'
  ]);
});

test('does not treat arbitrary URLs as video files', () => {
  assert.deepEqual(extractCandidates('https://example.com/anything', 'https://dreamina.capcut.com/share'), []);
});

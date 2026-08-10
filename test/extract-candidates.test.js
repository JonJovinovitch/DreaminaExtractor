import assert from 'node:assert/strict';
import test from 'node:test';
import { extractCandidates } from '../server.js';

test('extractCandidates finds and de-duplicates public media URLs', () => {
  const mediaUrl = 'https://media.example.test/video.mp4?token=abc';
  const html = `
    <meta property="og:video" content="${mediaUrl}">
    <video src="${mediaUrl}"></video>
    <source src="/clip.webm">
  `;

  assert.deepEqual(extractCandidates(html, 'https://dreamina.capcut.com/share/123'), [
    mediaUrl,
    'https://dreamina.capcut.com/clip.webm'
  ]);
});

test('extractCandidates ignores non-media and malformed values', () => {
  const html = '<video src="javascript:alert(1)"></video><a href="https://example.test/file.txt">x</a>';

  assert.deepEqual(extractCandidates(html, 'https://dreamina.capcut.com/share/123'), []);
});

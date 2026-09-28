import test from 'node:test';
import assert from 'node:assert/strict';
import { extractDreaminaCreation } from '../server.js';

const page = (pageInfo) => `<script type="application/json" id="__MODERN_ROUTER_DATA__">${JSON.stringify({
  loaderData: { 'dreamina-share-mproject_page': { pageData: { shareLandingPage: { data: { page_info: pageInfo } } } } }
})}</script>`;

test('picks the shared creation\'s clean video, not the watermarked copy or the "more videos" list', () => {
  const html = page({
    creation: { metadata: {
      video_id: 'v123',
      video_url: 'https://cdn.example.com/clean/',
      download_info: { url: 'https://cdn.example.com/clean/', watermark_ending_url: 'https://cdn.example.com/wm/' }
    } },
    creation_list: [{ metadata: { video_url: 'https://cdn.example.com/other/' } }]
  });
  assert.deepEqual(extractDreaminaCreation(html), {
    cleanUrl: 'https://cdn.example.com/clean/',
    watermarkedUrl: 'https://cdn.example.com/wm/',
    videoId: 'v123'
  });
});

test('falls back to download_info.url and rejects non-https values', () => {
  const html = page({ creation: { metadata: { video_url: 'javascript:alert(1)', download_info: { url: 'https://cdn.example.com/dl/' } } } });
  assert.equal(extractDreaminaCreation(html).cleanUrl, 'https://cdn.example.com/dl/');
});

test('returns null when the page has no router data', () => {
  assert.equal(extractDreaminaCreation('<html></html>'), null);
});

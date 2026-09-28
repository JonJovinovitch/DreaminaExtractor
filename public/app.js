const form = document.querySelector('#extract-form');
const input = document.querySelector('#share-url');
const result = document.querySelector('#result');
const relayForm = document.querySelector('#relay-form');
const relayInput = document.querySelector('#relay-url');
const relayResult = document.querySelector('#relay-result');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = form.querySelector('button');
  button.disabled = true; button.textContent = 'Checking…';
  result.hidden = false; result.className = ''; result.textContent = 'Looking for a publicly exposed video URL…';
  try {
    const response = await fetch('/api/extract', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: input.value.trim() }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not inspect that link.');
    result.className = 'success';
    result.replaceChildren(...data.files.map((file, index) => {
      const card = document.createElement('div'); card.className = 'file';
      const label = document.createElement('span'); label.textContent = `${file.type} ${data.files.length > 1 ? `#${index + 1}` : ''}`;
      const download = document.createElement('a'); download.href = file.downloadUrl; download.textContent = 'Download';
      const direct = document.createElement('a'); direct.href = file.url; direct.target = '_blank'; direct.rel = 'noreferrer'; direct.textContent = 'Open source';
      card.append(label, download, direct); return card;
    }));
  } catch (error) { result.className = 'error'; result.textContent = error.message; }
  finally { button.disabled = false; button.textContent = 'Find video'; }
});

relayForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = relayForm.querySelector('button');
  button.disabled = true; button.textContent = 'Creating…';
  relayResult.hidden = false; relayResult.className = ''; relayResult.textContent = 'Looking for a video declared by your page…';
  try {
    const response = await fetch('/api/relay/extract', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: relayInput.value.trim() }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not create a relay URL.');
    relayResult.className = 'success';
    const link = document.createElement('a'); link.href = data.relayUrl; link.target = '_blank'; link.rel = 'noreferrer'; link.textContent = `Open temporary relay (expires in ${data.expiresInSeconds / 60} minutes)`;
    relayResult.replaceChildren(link);
  } catch (error) { relayResult.className = 'error'; relayResult.textContent = error.message; }
  finally { button.disabled = false; button.textContent = 'Create relay'; }
});

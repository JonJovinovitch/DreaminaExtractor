const form = document.querySelector('#extract-form');
const input = document.querySelector('#share-url');
const result = document.querySelector('#result');

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

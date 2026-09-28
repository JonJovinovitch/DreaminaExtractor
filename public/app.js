const form = document.querySelector('#extract-form');
const input = document.querySelector('#share-url');
const result = document.querySelector('#result');
const button = form.querySelector('button');

function startDownload(href) {
  const a = document.createElement('a');
  a.href = href; a.download = ''; a.hidden = true;
  document.body.append(a); a.click(); a.remove();
}

async function extract() {
  button.disabled = true; button.textContent = 'Finding…';
  result.hidden = false; result.className = ''; result.textContent = 'Looking for the watermark-free video…';
  try {
    const response = await fetch('/api/extract', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: input.value.trim() }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not inspect that link.');
    startDownload(data.file.downloadUrl);
    result.className = 'success';
    // Download tokens are single-use, so "again" re-runs the lookup for a fresh one.
    const again = document.createElement('a'); again.href = '#'; again.textContent = 'Download again';
    again.addEventListener('click', (event) => { event.preventDefault(); extract(); });
    const label = document.createElement('span'); label.textContent = `Downloading ${data.file.filename}`;
    const card = document.createElement('div'); card.className = 'file';
    card.append(label, again);
    result.replaceChildren(card);
  } catch (error) { result.className = 'error'; result.textContent = error.message; }
  finally { button.disabled = false; button.textContent = 'Download'; }
}

form.addEventListener('submit', (event) => { event.preventDefault(); extract(); });

// Open the app as /?url=<share link> and it downloads immediately.
const preset = new URLSearchParams(location.search).get('url');
if (preset) { input.value = preset; extract(); }

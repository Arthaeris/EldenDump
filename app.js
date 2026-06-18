const search = document.querySelector('#search');
const results = document.querySelector('#results');
const count = document.querySelector('#count');

let entries = [];

function parseEntries(text) {
  const cleanedText = (text || '')
    .replace(/^\s*AccessoryInfo\.fmg\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  const matches = [...cleanedText.matchAll(/([^[]+?)\s*\[(\d+)\]/g)];

  return matches.map((match, index) => {
    const nextMatch = matches[index + 1];

    const rawName = match[1].trim();
    const name = rawName.split('.').pop().trim();

    const id = match[2];

    const descriptionStart = match.index + match[0].length;
    const descriptionEnd = nextMatch ? nextMatch.index : cleanedText.length;

    const description = cleanedText
      .slice(descriptionStart, descriptionEnd)
      .trim();

    return {
      id,
      name,
      text: description
    };
  }).filter(entry => entry.id && entry.name);
}

function render() {
  const q = search.value.trim().toLowerCase();

  const visible = entries.filter(e =>
    !q ||
    e.id.includes(q) ||
    e.name.toLowerCase().includes(q) ||
    e.text.toLowerCase().includes(q)
  );

  count.textContent = `${visible.length} ${visible.length === 1 ? 'entry' : 'entries'}`;

  if (!visible.length) {
    results.innerHTML = '<div class="empty">No entries found.</div>';
    return;
  }

  results.innerHTML = visible.map(e => `
    <article class="entry" id="entry-${escapeHtml(e.id)}">
      <div class="entry-header">
        <div class="entry-name">${escapeHtml(e.name)}</div>
        <div class="entry-id">[${escapeHtml(e.id)}]</div>
      </div>

      <div class="entry-text">${escapeHtml(e.text)}</div>
    </article>
  `).join('');
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[char]));
}

async function loadDump() {
  results.innerHTML = '<div class="empty">Loading EldenDump.html…</div>';

  try {
    const response = await fetch('./EldenDump.html');

    if (!response.ok) {
      throw new Error('Could not load EldenDump.html');
    }

    const html = await response.text();

    const doc = new DOMParser().parseFromString(html, 'text/html');
    const text = doc.body?.innerText || html;

    entries = parseEntries(text);
    render();
  } catch (error) {
    count.textContent = '0 entries';
    results.innerHTML = `
      <div class="empty">
        Could not load <code>EldenDump.html</code>.<br>
        Make sure it is in the same folder as <code>index.html</code>.
      </div>
    `;
  }
}

search.addEventListener('input', render);

loadDump();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

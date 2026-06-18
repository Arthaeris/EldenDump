const rawText = document.querySelector('#rawText');
const search = document.querySelector('#search');
const results = document.querySelector('#results');
const count = document.querySelector('#count');
const formatBtn = document.querySelector('#formatBtn');
const sampleBtn = document.querySelector('#sampleBtn');
const clearBtn = document.querySelector('#clearBtn');

let entries = [];

function parseEntries(text) {
  return (text || '')
    .replace(/^\s*AccessoryInfo\.fmg\s*/i, '')
    .match(/\[\d+\][^\[]+/g)?.map(item => {
      const match = item.match(/\[(\d+)\]\s*(.*)/s);
      return match ? { id: match[1], text: match[2].trim().replace(/\s+/g, ' ') } : null;
    }).filter(Boolean) || [];
}

function render() {
  const q = search.value.trim().toLowerCase();
  const visible = entries.filter(e => !q || e.id.includes(q) || e.text.toLowerCase().includes(q));
  count.textContent = `${visible.length} ${visible.length === 1 ? 'entry' : 'entries'}`;

  if (!visible.length) {
    results.innerHTML = '<div class="empty">No entries yet.</div>';
    return;
  }

  results.innerHTML = visible.map(e => `
    <article class="entry">
      <div class="entry-id">[${escapeHtml(e.id)}]</div>
      <div class="entry-text">${escapeHtml(e.text)}</div>
    </article>
  `).join('');
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}

function saveState() {
  localStorage.setItem('accessory-info-raw', rawText.value);
}

function format() {
  entries = parseEntries(rawText.value);
  saveState();
  render();
}

formatBtn.addEventListener('click', format);
search.addEventListener('input', render);
rawText.addEventListener('input', saveState);
clearBtn.addEventListener('click', () => {
  rawText.value = '';
  search.value = '';
  entries = [];
  saveState();
  render();
});
sampleBtn.addEventListener('click', () => {
  rawText.value = 'AccessoryInfo.fmg [1000] Raises maximum HP [1001] Greatly raises maximum HP [1010] Raises maximum FP [1020] Raises maximum stamina [1030] Raises maximum equipment load';
  format();
});

rawText.value = localStorage.getItem('accessory-info-raw') || '';
format();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

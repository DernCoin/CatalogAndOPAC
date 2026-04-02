const STORAGE_KEY = 'library-system-state-v1';
const byId = (id) => document.getElementById(id);

const getCatalog = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const parsed = JSON.parse(saved);
    return parsed.catalog || [];
  }
  return window.catalogSeed;
};

let catalog = getCatalog();

const toRow = (item) => {
  const tr = document.createElement('tr');
  const cover = item.coverImageUrl ? `<img src="${item.coverImageUrl}" alt="Cover for ${item.title}" style="width:32px;height:46px;object-fit:cover;border-radius:4px;vertical-align:middle;margin-right:0.4rem;" />` : '';
  tr.innerHTML = `
    <td><button class="ghost" data-id="${item.id}">${cover}${item.title}</button></td>
    <td>${item.author || '—'}</td>
    <td>${item.materialType || 'Book'}</td>
    <td>${item.status}</td>
    <td>${item.callNumber || '—'}</td>
  `;
  return tr;
};

const renderRecent = () => {
  const recent = [...catalog]
    .sort((a, b) => new Date(b.addedOn || '1970-01-01') - new Date(a.addedOn || '1970-01-01'))
    .slice(0, 10);

  byId('recentlyAdded').innerHTML = recent
    .map((x) => `<div class="book-card">${x.coverImageUrl ? `<img src="${x.coverImageUrl}" alt="Cover for ${x.title}" style="width:64px;height:90px;object-fit:cover;border-radius:6px;" />` : ''}<h4>${x.title}</h4><p>${x.author || 'Unknown'}</p><small class="muted">Added ${x.addedOn || 'N/A'}</small></div>`)
    .join('');

  if (catalog.length > 0) {
    const pick = catalog[Math.floor(Math.random() * catalog.length)];
    byId('randomShelfText').textContent = `Try "${pick.title}" for a random shelf discovery.`;
  }
};

const renderCatalog = (query = '') => {
  const q = query.toLowerCase().trim();
  const filtered = catalog.filter((x) =>
    [x.title, x.author, x.isbn, x.callNumber, x.publisher, x.publicationYear, x.language, x.series, ...(x.subjects || [])]
      .filter(Boolean)
      .some((field) => String(field).toLowerCase().includes(q))
  );

  const tbody = byId('catalogResults').querySelector('tbody');
  tbody.innerHTML = '';
  filtered.forEach((item) => tbody.appendChild(toRow(item)));

  tbody.querySelectorAll('button[data-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = catalog.find((x) => x.id === btn.dataset.id);
      if (!item) return;
      byId('modalTitle').textContent = item.title;
      byId('modalAuthor').textContent = item.author || 'Unknown';
      byId('modalIsbn').textContent = item.isbn || 'N/A';
      byId('modalCall').textContent = item.callNumber || 'N/A';
      byId('modalPubPlace').textContent = item.placeOfPublication || 'N/A';
      byId('modalPageCount').textContent = item.pageCount || 'N/A';
      byId('modalStatus').textContent = item.status || 'Unknown';
      byId('modalDescription').textContent = item.description || 'No additional description available.';
      const cover = byId('modalCover');
      if (item.coverImageUrl) {
        cover.src = item.coverImageUrl;
        cover.style.display = 'block';
      } else {
        cover.removeAttribute('src');
        cover.style.display = 'none';
      }
      byId('itemModal').showModal();
    });
  });
};

byId('searchInput').addEventListener('input', (e) => renderCatalog(e.target.value));
byId('closeModalBtn').addEventListener('click', () => byId('itemModal').close());

window.addEventListener('storage', () => {
  catalog = getCatalog();
  renderRecent();
  renderCatalog(byId('searchInput').value);
});

renderRecent();
renderCatalog();

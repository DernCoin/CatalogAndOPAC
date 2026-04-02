const STORAGE_KEY = 'library-system-state-v1';

const baseState = {
  visitors: 87,
  referenceQuestions: 16,
  circulationLog: [],
  catalog: [],
  acquisitions: [],
  patrons: [],
  illRequests: [],
  register: [],
  admin: {
    circulationRule: 'Standard 21-day',
    receiptMode: 'Email + Print',
    authorityHeading: ''
  }
};

const loadState = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return JSON.parse(saved);
  const seeded = { ...baseState, catalog: [...window.catalogSeed] };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
};

let state = loadState();

const saveState = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
const byId = (id) => document.getElementById(id);
let editingCatalogId = null;

const ensureAcquisitionShape = (acquisition) => {
  if (!acquisition.id) acquisition.id = crypto.randomUUID();
  if (!Array.isArray(acquisition.items)) acquisition.items = [];
  acquisition.items.forEach((item) => {
    if (!item.id) item.id = crypto.randomUUID();
    if (!item.itemStatus) item.itemStatus = 'Pending';
  });
  return acquisition;
};

const ensureStateShape = () => {
  state.acquisitions = state.acquisitions.map(ensureAcquisitionShape);
};

const renderKPIs = () => {
  byId('visitorCount').textContent = state.visitors;
  byId('referenceCount').textContent = state.referenceQuestions;
  byId('circulationToday').textContent = state.circulationLog.length;
  byId('newItemsToday').textContent = state.catalog.filter((x) => x.addedOn === new Date().toISOString().slice(0, 10)).length;
  byId('pendingOrders').textContent = state.acquisitions.filter((x) => x.status !== 'Received').length;
};

const renderAttention = () => {
  const list = byId('attentionList');
  const pendingIll = state.illRequests.filter((x) => x.status !== 'Returned').length;
  const blockedPatrons = state.patrons.filter((x) => x.status === 'Blocked').length;
  list.innerHTML = `
    <li class="warn">${state.acquisitions.filter((x) => x.status === 'Requested').length} acquisitions still in Requested status.</li>
    <li class="urgent">${blockedPatrons} patrons are blocked and need review.</li>
    <li>${pendingIll} interlibrary loan requests are open.</li>
    <li>${state.catalog.filter((x) => x.status === 'Checked Out').length} items currently checked out.</li>
  `;
};

const row = (arr) => `<tr>${arr.map((c) => `<td>${c}</td>`).join('')}</tr>`;

const renderTables = () => {
  byId('circulationTable').querySelector('tbody').innerHTML = state.circulationLog.slice().reverse().map((x) => row([x.time, x.patronCard, x.itemBarcode, `<span class="badge">${x.action}</span>`])).join('');
  byId('catalogTable').querySelector('tbody').innerHTML = state.catalog.slice().reverse().map((x) => row([
    x.title,
    x.author || '—',
    x.isbn || '—',
    x.materialType || 'Book',
    x.status,
    x.addedOn,
    `<button class="ghost" data-edit-catalog-id="${x.id}">Edit</button>`
  ])).join('');
  byId('acqTable').querySelector('tbody').innerHTML = state.acquisitions.slice().reverse().map((x) => row([
    x.type,
    x.vendor,
    x.title,
    x.status,
    x.items.filter((item) => item.itemStatus === 'Pending').length
  ])).join('');
  byId('patronTable').querySelector('tbody').innerHTML = state.patrons.slice().reverse().map((x) => row([x.cardId, x.name, x.email, x.status])).join('');
  byId('illTable').querySelector('tbody').innerHTML = state.illRequests.slice().reverse().map((x) => row([x.requester, x.title, x.lender, x.status])).join('');
  byId('registerTable').querySelector('tbody').innerHTML = state.register.slice().reverse().map((x) => row([x.date, x.note])).join('');

  const acqItemRows = state.acquisitions.flatMap((acq) => acq.items.map((item) => ({
    orderLabel: `${acq.title} (${acq.vendor})`,
    ...item
  })));
  byId('acqItemsTable').querySelector('tbody').innerHTML = acqItemRows.slice().reverse().map((item) => row([
    item.orderLabel,
    item.title,
    item.author || '—',
    item.isbn || '—',
    item.itemStatus,
    item.itemStatus === 'Pending' ? `<button class="ghost" data-add-item-id="${item.id}">Add to Catalog</button>` : 'Added'
  ])).join('');

  byId('catalogTable').querySelectorAll('button[data-edit-catalog-id]').forEach((btn) => {
    btn.addEventListener('click', () => beginCatalogEdit(btn.dataset.editCatalogId));
  });
  byId('acqItemsTable').querySelectorAll('button[data-add-item-id]').forEach((btn) => {
    btn.addEventListener('click', () => addPendingItemToCatalog(btn.dataset.addItemId));
  });
};

const renderReports = () => {
  byId('reportItems').textContent = state.catalog.length;
  byId('reportAvailableItems').textContent = state.catalog.filter((x) => x.status === 'Available').length;
  byId('reportCheckedOutItems').textContent = state.catalog.filter((x) => x.status === 'Checked Out').length;
  byId('reportNewItems').textContent = state.catalog.filter((x) => x.addedOn === new Date().toISOString().slice(0, 10)).length;
  byId('reportPatrons').textContent = state.patrons.filter((x) => x.status === 'Active').length;
  byId('reportTotalPatrons').textContent = state.patrons.length;
  byId('reportTransactions').textContent = state.circulationLog.length;
  byId('reportCheckouts').textContent = state.circulationLog.filter((x) => x.action === 'Check Out').length;
  byId('reportCheckins').textContent = state.circulationLog.filter((x) => x.action === 'Check In').length;
  byId('reportVisitors').textContent = state.visitors;
  byId('reportReferenceQuestions').textContent = state.referenceQuestions;
  byId('reportAcq').textContent = state.acquisitions.filter((x) => x.status !== 'Received').length;
  byId('reportIllOpen').textContent = state.illRequests.filter((x) => x.status !== 'Returned').length;
};

const rerender = () => {
  ensureStateShape();
  renderKPIs();
  renderAttention();
  renderTables();
  renderReports();
  renderAcqOrderOptions();
  saveState();
};

const renderAcqOrderOptions = () => {
  const select = byId('acqItemOrder');
  select.innerHTML = '';
  if (!state.acquisitions.length) {
    select.innerHTML = '<option value="">Add an order/batch first</option>';
    return;
  }
  select.innerHTML = state.acquisitions.map((acq) => `<option value="${acq.id}">${acq.title} (${acq.vendor})</option>`).join('');
};

const addPendingItemToCatalog = (itemId) => {
  const parentAcquisition = state.acquisitions.find((acq) => acq.items.some((item) => item.id === itemId));
  if (!parentAcquisition) return;
  const item = parentAcquisition.items.find((x) => x.id === itemId);
  if (!item || item.itemStatus !== 'Pending') return;

  state.catalog.push({
    id: crypto.randomUUID(),
    title: item.title,
    author: item.author || '',
    isbn: item.isbn || '',
    callNumber: '',
    materialType: item.materialType || 'Book',
    edition: '',
    publisher: parentAcquisition.vendor || '',
    publicationYear: '',
    language: '',
    subjects: [],
    series: '',
    copyCount: 1,
    location: '',
    description: `${item.title} by ${item.author || 'Unknown author'}.`,
    localNotes: `Added from ${parentAcquisition.type.toLowerCase()} workflow "${parentAcquisition.title}".`,
    status: 'Available',
    addedOn: new Date().toISOString().slice(0, 10)
  });
  item.itemStatus = 'Cataloged';
  rerender();
};

document.querySelectorAll('#moduleMenu button').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#moduleMenu button').forEach((x) => x.classList.remove('active'));
    document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    byId(btn.dataset.panel).classList.add('active');
  });
});

document.querySelectorAll('.report-category-card').forEach((card) => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.report-category-card').forEach((x) => x.classList.remove('active'));
    document.querySelectorAll('.report-category-panel').forEach((panel) => panel.classList.remove('active'));
    card.classList.add('active');
    const panel = document.querySelector(`[data-report-category-panel="${card.dataset.reportCategory}"]`);
    if (panel) panel.classList.add('active');
  });
});

byId('addVisitorBtn').addEventListener('click', () => {
  state.visitors += 1;
  rerender();
});

byId('addReferenceBtn').addEventListener('click', () => {
  state.referenceQuestions += 1;
  rerender();
});

byId('circulateBtn').addEventListener('click', () => {
  const patronCard = byId('scanPatron').value.trim();
  const itemBarcode = byId('scanItem').value.trim();
  const action = byId('circulationAction').value;
  if (!patronCard || !itemBarcode) return;

  state.circulationLog.push({
    time: new Date().toLocaleTimeString(),
    patronCard,
    itemBarcode,
    action: action === 'checkout' ? 'Check Out' : 'Check In'
  });

  const item = state.catalog.find((x) => x.isbn === itemBarcode);
  if (item) item.status = action === 'checkout' ? 'Checked Out' : 'Available';
  byId('scanItem').value = '';
  rerender();
});

const catalogFieldIds = [
  'catTitle', 'catAuthor', 'catIsbn', 'catCall', 'catEdition', 'catPublisher', 'catPubYear',
  'catLanguage', 'catSubjects', 'catSeries', 'catCopyCount', 'catLocation', 'catDescription', 'catNotes'
];

const resetCatalogForm = (clearMessage = true) => {
  editingCatalogId = null;
  catalogFieldIds.forEach((id) => (byId(id).value = id === 'catCopyCount' ? '1' : ''));
  byId('catType').value = 'Book';
  byId('addCatalogBtn').textContent = 'Save Record';
  if (clearMessage) byId('catalogMessage').textContent = '';
};

const beginCatalogEdit = (id) => {
  const item = state.catalog.find((x) => x.id === id);
  if (!item) return;
  editingCatalogId = id;
  byId('catTitle').value = item.title || '';
  byId('catAuthor').value = item.author || '';
  byId('catIsbn').value = item.isbn || '';
  byId('catCall').value = item.callNumber || '';
  byId('catEdition').value = item.edition || '';
  byId('catPublisher').value = item.publisher || '';
  byId('catPubYear').value = item.publicationYear || '';
  byId('catLanguage').value = item.language || '';
  byId('catSubjects').value = Array.isArray(item.subjects) ? item.subjects.join(', ') : '';
  byId('catSeries').value = item.series || '';
  byId('catCopyCount').value = item.copyCount || 1;
  byId('catLocation').value = item.location || '';
  byId('catDescription').value = item.description || '';
  byId('catNotes').value = item.localNotes || '';
  byId('catType').value = item.materialType || 'Book';
  byId('addCatalogBtn').textContent = 'Update Record';
  byId('catalogMessage').textContent = `Editing ${item.title}`;
};

const parseSubjects = (raw) => raw.split(',').map((x) => x.trim()).filter(Boolean);

byId('cancelEditCatalogBtn').addEventListener('click', resetCatalogForm);

byId('importIsbnBtn').addEventListener('click', async () => {
  const rawIsbn = byId('catIsbn').value.trim();
  const isbn = rawIsbn.replace(/[^0-9Xx]/g, '');
  if (!isbn) {
    byId('catalogMessage').textContent = 'Enter an ISBN first.';
    return;
  }

  byId('catalogMessage').textContent = `Importing metadata for ISBN ${isbn}...`;
  try {
    const response = await fetch(`https://openlibrary.org/isbn/${encodeURIComponent(isbn)}.json`);
    if (!response.ok) throw new Error('ISBN not found');
    const data = await response.json();

    let authorName = byId('catAuthor').value.trim();
    if (Array.isArray(data.authors) && data.authors[0]?.key) {
      const authorResp = await fetch(`https://openlibrary.org${data.authors[0].key}.json`);
      if (authorResp.ok) {
        const authorData = await authorResp.json();
        authorName = authorData.name || authorName;
      }
    }

    byId('catTitle').value = data.title || byId('catTitle').value;
    byId('catAuthor').value = authorName;
    byId('catPublisher').value = data.publishers?.[0] || byId('catPublisher').value;
    byId('catPubYear').value = data.publish_date ? String(data.publish_date).match(/\d{4}/)?.[0] || '' : byId('catPubYear').value;
    byId('catLanguage').value = data.languages?.[0]?.key?.split('/').pop() || byId('catLanguage').value;
    byId('catSubjects').value = Array.isArray(data.subjects) ? data.subjects.slice(0, 8).join(', ') : byId('catSubjects').value;
    byId('catDescription').value = typeof data.description === 'string' ? data.description : (data.description?.value || byId('catDescription').value);
    byId('catalogMessage').textContent = `Imported metadata for ISBN ${isbn}. Review and save the record.`;
  } catch (_error) {
    byId('catalogMessage').textContent = `Could not import ISBN ${isbn}. You can still enter fields manually.`;
  }
});

byId('addCatalogBtn').addEventListener('click', () => {
  const title = byId('catTitle').value.trim();
  const author = byId('catAuthor').value.trim();
  const isbn = byId('catIsbn').value.trim();
  const callNumber = byId('catCall').value.trim();
  const edition = byId('catEdition').value.trim();
  const publisher = byId('catPublisher').value.trim();
  const publicationYear = byId('catPubYear').value.trim();
  const language = byId('catLanguage').value.trim();
  const subjects = parseSubjects(byId('catSubjects').value.trim());
  const series = byId('catSeries').value.trim();
  const copyCount = Number.parseInt(byId('catCopyCount').value, 10) || 1;
  const location = byId('catLocation').value.trim();
  const description = byId('catDescription').value.trim();
  const localNotes = byId('catNotes').value.trim();
  const materialType = byId('catType').value;
  if (!title || !isbn) return;

  const payload = {
    title, author, isbn, callNumber, materialType, edition, publisher, publicationYear, language, subjects, series,
    copyCount, location, description: description || `${title} by ${author}.`, localNotes
  };

  if (editingCatalogId) {
    const existing = state.catalog.find((x) => x.id === editingCatalogId);
    if (existing) Object.assign(existing, payload);
    byId('catalogMessage').textContent = `Updated record "${title}".`;
  } else {
    state.catalog.push({
      id: crypto.randomUUID(),
      ...payload,
      status: 'Available',
      addedOn: new Date().toISOString().slice(0, 10)
    });
    byId('catalogMessage').textContent = `Added record "${title}".`;
  }
  resetCatalogForm(false);
  rerender();
});

byId('addAcqBtn').addEventListener('click', () => {
  const type = byId('acqType').value;
  const vendor = byId('acqVendor').value.trim();
  const title = byId('acqTitle').value.trim();
  const status = byId('acqStatus').value;
  if (!vendor || !title) return;
  state.acquisitions.push({
    id: crypto.randomUUID(),
    type,
    vendor,
    title,
    status,
    items: []
  });
  ['acqVendor', 'acqTitle'].forEach((id) => (byId(id).value = ''));
  rerender();
});

byId('addAcqItemBtn').addEventListener('click', () => {
  const acquisitionId = byId('acqItemOrder').value;
  const title = byId('acqItemTitle').value.trim();
  const author = byId('acqItemAuthor').value.trim();
  const isbn = byId('acqItemIsbn').value.trim();
  const materialType = byId('acqItemType').value;
  if (!acquisitionId || !title) return;
  const acquisition = state.acquisitions.find((x) => x.id === acquisitionId);
  if (!acquisition) return;

  acquisition.items.push({
    id: crypto.randomUUID(),
    title,
    author,
    isbn,
    materialType,
    itemStatus: 'Pending'
  });

  ['acqItemTitle', 'acqItemAuthor', 'acqItemIsbn'].forEach((id) => (byId(id).value = ''));
  byId('acqItemType').value = 'Book';
  rerender();
});

byId('savePatronBtn').addEventListener('click', () => {
  const cardId = byId('patronCard').value.trim();
  const name = byId('patronName').value.trim();
  const email = byId('patronEmail').value.trim();
  const status = byId('patronStatus').value;
  if (!cardId || !name) return;

  const existing = state.patrons.find((x) => x.cardId === cardId);
  if (existing) {
    existing.name = name;
    existing.email = email;
    existing.status = status;
  } else {
    state.patrons.push({ cardId, name, email, status });
  }
  ['patronCard', 'patronName', 'patronEmail'].forEach((id) => (byId(id).value = ''));
  rerender();
});

byId('addIllBtn').addEventListener('click', () => {
  const requester = byId('illRequester').value.trim();
  const title = byId('illTitle').value.trim();
  const lender = byId('illLibrary').value.trim();
  const status = byId('illStatus').value;
  if (!requester || !title || !lender) return;
  state.illRequests.push({ requester, title, lender, status });
  ['illRequester', 'illTitle', 'illLibrary'].forEach((id) => (byId(id).value = ''));
  rerender();
});

byId('saveRegisterBtn').addEventListener('click', () => {
  const note = byId('registerNotes').value.trim();
  if (!note) return;
  state.register.push({ date: new Date().toISOString().slice(0, 10), note });
  byId('registerNotes').value = '';
  rerender();
});

byId('saveAdminBtn').addEventListener('click', () => {
  state.admin.circulationRule = byId('ruleProfile').value;
  state.admin.receiptMode = byId('receiptMode').value;
  state.admin.authorityHeading = byId('authorityHeading').value.trim();
  byId('adminMessage').textContent = `Saved ${new Date().toLocaleString()} · Rule ${state.admin.circulationRule} · ${state.admin.receiptMode}`;
  rerender();
});

rerender();

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
  byId('catalogTable').querySelector('tbody').innerHTML = state.catalog.slice().reverse().map((x) => row([x.title, x.author, x.status, x.addedOn])).join('');
  byId('acqTable').querySelector('tbody').innerHTML = state.acquisitions.slice().reverse().map((x) => row([x.type, x.vendor, x.title, x.status])).join('');
  byId('patronTable').querySelector('tbody').innerHTML = state.patrons.slice().reverse().map((x) => row([x.cardId, x.name, x.email, x.status])).join('');
  byId('illTable').querySelector('tbody').innerHTML = state.illRequests.slice().reverse().map((x) => row([x.requester, x.title, x.lender, x.status])).join('');
  byId('registerTable').querySelector('tbody').innerHTML = state.register.slice().reverse().map((x) => row([x.date, x.note])).join('');
};

const renderReports = () => {
  byId('reportItems').textContent = state.catalog.length;
  byId('reportPatrons').textContent = state.patrons.filter((x) => x.status === 'Active').length;
  byId('reportTransactions').textContent = state.circulationLog.length;
  byId('reportAcq').textContent = state.acquisitions.filter((x) => x.status !== 'Received').length;
};

const rerender = () => {
  renderKPIs();
  renderAttention();
  renderTables();
  renderReports();
  saveState();
};

document.querySelectorAll('#moduleMenu button').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#moduleMenu button').forEach((x) => x.classList.remove('active'));
    document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    byId(btn.dataset.panel).classList.add('active');
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

byId('addCatalogBtn').addEventListener('click', () => {
  const title = byId('catTitle').value.trim();
  const author = byId('catAuthor').value.trim();
  const isbn = byId('catIsbn').value.trim();
  const callNumber = byId('catCall').value.trim();
  const materialType = byId('catType').value;
  if (!title || !isbn) return;

  state.catalog.push({
    id: crypto.randomUUID(), title, author, isbn, callNumber, materialType,
    status: 'Available', addedOn: new Date().toISOString().slice(0, 10), description: `${title} by ${author}.`
  });
  ['catTitle', 'catAuthor', 'catIsbn', 'catCall'].forEach((id) => (byId(id).value = ''));
  rerender();
});

byId('addAcqBtn').addEventListener('click', () => {
  const type = byId('acqType').value;
  const vendor = byId('acqVendor').value.trim();
  const title = byId('acqTitle').value.trim();
  const status = byId('acqStatus').value;
  if (!vendor || !title) return;
  state.acquisitions.push({ type, vendor, title, status });
  ['acqVendor', 'acqTitle'].forEach((id) => (byId(id).value = ''));
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

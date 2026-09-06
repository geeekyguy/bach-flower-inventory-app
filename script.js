document.addEventListener('DOMContentLoaded', () => {
  const STORAGE_KEY = 'bachInventory.remedies';
  const THEME_KEY = 'bachInventory.theme';
  const LOW_STOCK_THRESHOLD = 2;

  let remedyData = loadRemedyData();
  let selectedRemedyName = null;

  const dialogModalEl = document.getElementById('messageDialog');
  const dialogModal = new bootstrap.Modal(dialogModalEl);
  const dialogTitleEl = document.getElementById('messageDialogLabel');
  const dialogBodyEl = document.getElementById('messageDialogBody');
  const dialogCopySectionEl = document.getElementById('messageDialogCopySection');
  const dialogTextareaEl = document.getElementById('messageDialogText');
  const dialogCopyBtnEl = document.getElementById('messageDialogCopyBtn');

  const searchInput = document.getElementById('searchInput');
  const filterSelect = document.getElementById('filterSelect');
  const sortSelect = document.getElementById('sortSelect');
  const resultsCountEl = document.getElementById('resultsCount');
  const emptyStateEl = document.getElementById('emptyState');
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeToggleIcon = themeToggleBtn.querySelector('span');
  const a11yStatusEl = document.getElementById('a11yStatus');

  function loadRemedyData() {
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch (e) {
      saved = null;
    }
    const savedByName = new Map((Array.isArray(saved) ? saved : []).map(r => [r.name, r]));

    return remediesData.map(base => {
      const override = savedByName.get(base.name);
      return {
        name: base.name,
        qty30: override ? (parseInt(override.qty30) || 0) : base.qty30,
        qty100: override ? (parseInt(override.qty100) || 0) : base.qty100,
      };
    });
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(remedyData));
  }

  function getTotal(item) {
    return (item.qty30 || 0) + (item.qty100 || 0);
  }

  function getStatus(item) {
    const total = getTotal(item);
    if (total === 0) return 'out';
    if (total <= LOW_STOCK_THRESHOLD) return 'low';
    return 'in';
  }

  function statusBadge(status) {
    if (status === 'out') return '<span class="badge status-badge status-out">Out of stock</span>';
    if (status === 'low') return '<span class="badge status-badge status-low">Low</span>';
    return '<span class="badge status-badge status-in">In stock</span>';
  }

  function updateStats() {
    const totalRemedies = remedyData.length;
    const totalBottles = remedyData.reduce((sum, item) => sum + getTotal(item), 0);
    const lowStock = remedyData.filter(item => getStatus(item) === 'low').length;
    const outStock = remedyData.filter(item => getStatus(item) === 'out').length;

    document.getElementById('statTotalRemedies').textContent = totalRemedies;
    document.getElementById('statTotalBottles').textContent = totalBottles;
    document.getElementById('statLowStock').textContent = lowStock;
    document.getElementById('statOutStock').textContent = outStock;
  }

  function getVisibleRemedies() {
    const query = searchInput.value.trim().toLowerCase();
    const filter = filterSelect.value;
    const sort = sortSelect.value;

    let list = remedyData.filter(item => item.name.toLowerCase().includes(query));

    if (filter !== 'all') {
      list = list.filter(item => getStatus(item) === filter);
    }

    list = list.slice().sort((a, b) => {
      switch (sort) {
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'total-asc':
          return getTotal(a) - getTotal(b);
        case 'total-desc':
          return getTotal(b) - getTotal(a);
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return list;
  }

  function renderTable() {
    const tableBody = document.getElementById('remedyTable');
    const visible = getVisibleRemedies();

    const focused = document.activeElement;
    const focusedAction = focused && focused.matches('button[data-action]')
      ? { action: focused.getAttribute('data-action'), name: focused.getAttribute('data-name') }
      : null;

    tableBody.innerHTML = '';

    resultsCountEl.textContent = `Showing ${visible.length} of ${remedyData.length} remedies`;
    emptyStateEl.classList.toggle('d-none', visible.length !== 0);

    visible.forEach(item => {
      const total = getTotal(item);
      const status = getStatus(item);
      const name = item.name;
      const safeName = escapeHtml(name);

      const row = document.createElement('tr');
      row.innerHTML = `
        <th scope="row" class="text-start fw-medium">${safeName}</th>
        <td>
          <div class="qty-stepper">
            <button type="button" class="btn btn-sm btn-outline-secondary" data-action="dec30" data-name="${safeName}" aria-label="Decrease ${safeName} 30ml quantity">−</button>
            <span class="qty-value">${item.qty30}</span>
            <button type="button" class="btn btn-sm btn-outline-secondary" data-action="inc30" data-name="${safeName}" aria-label="Increase ${safeName} 30ml quantity">+</button>
          </div>
        </td>
        <td>
          <div class="qty-stepper">
            <button type="button" class="btn btn-sm btn-outline-secondary" data-action="dec100" data-name="${safeName}" aria-label="Decrease ${safeName} 100ml quantity">−</button>
            <span class="qty-value">${item.qty100}</span>
            <button type="button" class="btn btn-sm btn-outline-secondary" data-action="inc100" data-name="${safeName}" aria-label="Increase ${safeName} 100ml quantity">+</button>
          </div>
        </td>
        <td class="fw-semibold">${total}</td>
        <td>${statusBadge(status)}</td>
        <td><button class="btn btn-outline-primary btn-sm" data-action="edit" data-name="${safeName}" aria-label="Edit ${safeName} quantities">Edit</button></td>
      `;
      tableBody.appendChild(row);
    });

    if (focusedAction) {
      const toRefocus = tableBody.querySelector(
        `button[data-action="${cssEscape(focusedAction.action)}"][data-name="${cssEscape(focusedAction.name)}"]`
      );
      if (toRefocus) toRefocus.focus();
    }

    updateStats();
  }

  function cssEscape(value) {
    return window.CSS && CSS.escape ? CSS.escape(value) : value.replace(/["\\]/g, '\\$&');
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[ch]));
  }

  function adjustQty(name, field, delta) {
    const item = remedyData.find(r => r.name === name);
    if (!item) return;
    item[field] = Math.max(0, (item[field] || 0) + delta);
    persist();
    renderTable();
    const sizeLabel = field === 'qty30' ? '30ml' : '100ml';
    a11yStatusEl.textContent = `${name} ${sizeLabel} quantity is now ${item[field]}`;
  }

  document.getElementById('remedyTable').addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-action]');
    if (!btn) return;
    const name = btn.getAttribute('data-name');
    const action = btn.getAttribute('data-action');

    if (action === 'inc30') adjustQty(name, 'qty30', 1);
    else if (action === 'dec30') adjustQty(name, 'qty30', -1);
    else if (action === 'inc100') adjustQty(name, 'qty100', 1);
    else if (action === 'dec100') adjustQty(name, 'qty100', -1);
    else if (action === 'edit') openUpdateForm(name);
  });

  searchInput.addEventListener('input', renderTable);
  filterSelect.addEventListener('change', renderTable);
  sortSelect.addEventListener('change', renderTable);

  document.getElementById('buyListBtn').addEventListener('click', () => {
    const lowStockItems = remedyData.filter(item => getTotal(item) <= LOW_STOCK_THRESHOLD);
    const list = lowStockItems.map(item => item.name);

    if (list.length === 0) {
      showMessageDialog({
        title: 'Buy List',
        message: `No remedies found with total quantity less than or equal to ${LOW_STOCK_THRESHOLD}.`,
      });
      return;
    }

    const copyText = list.join('\n');
    showMessageDialog({
      title: 'Buy List Ready',
      message: `${list.length} remedies need restocking. You can copy and paste this list:`,
      copyText,
    });

    fetch('https://script.google.com/macros/s/AKfycbwKYt5uhGhp6dQx1YmbqKACPlgDNUNCZXgqYvwUYpQ4AVw4xzeeyR7MKbmrsz6p34BG4Q/exec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ list }),
    })
      .then(response => {
        if (response.ok) {
          console.log('Buy list sent to email via Apps Script.');
        } else {
          console.error('Failed to send buy list to email.');
        }
      })
      .catch(error => {
        console.error('Error:', error);
      });
  });

  document.getElementById('exportCsvBtn').addEventListener('click', () => {
    const rows = [['Name', '30ml Quantity', '100ml Quantity', 'Total Quantity']];
    remedyData.forEach(item => {
      rows.push([item.name, item.qty30, item.qty100, getTotal(item)]);
    });
    const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bach-flower-inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });

  const updateModalEl = document.getElementById('updateModal');
  updateModalEl.addEventListener('hidden.bs.modal', () => {
    if (!selectedRemedyName) return;
    const editBtn = document.querySelector(
      `#remedyTable button[data-action="edit"][data-name="${cssEscape(selectedRemedyName)}"]`
    );
    if (editBtn) editBtn.focus();
  });

  window.openUpdateForm = function(name) {
    selectedRemedyName = name;
    const item = remedyData.find(r => r.name === name);
    if (!item) return;

    document.getElementById('remedyName').value = item.name;
    document.getElementById('qty30ml').value = item.qty30;
    document.getElementById('qty100ml').value = item.qty100;

    const modal = new bootstrap.Modal(updateModalEl);
    modal.show();
  };

  document.getElementById('updateForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const qty30 = Math.max(0, parseInt(document.getElementById('qty30ml').value) || 0);
    const qty100 = Math.max(0, parseInt(document.getElementById('qty100ml').value) || 0);

    document.getElementById('qty30ml').value = qty30;
    document.getElementById('qty100ml').value = qty100;

    const item = remedyData.find(r => r.name === selectedRemedyName);
    if (item) {
      item.qty30 = qty30;
      item.qty100 = qty100;
      persist();
      renderTable();
    }

    bootstrap.Modal.getInstance(updateModalEl).hide();
  });

  const resetBtn = document.getElementById('resetCountsBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      showConfirmDialog({
        title: 'Reset all counts?',
        message: 'This will set all 30ml and 100ml quantities to 0.',
        confirmText: 'Yes, reset everything',
        onConfirm: () => {
          remedyData.forEach(item => {
            item.qty30 = 0;
            item.qty100 = 0;
          });
          persist();
          renderTable();
          showMessageDialog({
            title: 'Reset complete',
            message: 'All counts have been reset to zero.',
          });
        },
      });
    });
  }

  function showMessageDialog({ title, message, copyText = '' }) {
    dialogTitleEl.textContent = title;
    dialogBodyEl.textContent = message;

    if (copyText) {
      dialogCopySectionEl.classList.remove('d-none');
      dialogCopyBtnEl.classList.remove('d-none');
      dialogTextareaEl.value = copyText;
    } else {
      dialogCopySectionEl.classList.add('d-none');
      dialogCopyBtnEl.classList.add('d-none');
      dialogTextareaEl.value = '';
    }

    dialogModal.show();
  }

  dialogCopyBtnEl.addEventListener('click', async () => {
    const text = dialogTextareaEl.value;
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      dialogCopyBtnEl.textContent = 'Copied!';
      setTimeout(() => {
        dialogCopyBtnEl.textContent = 'Copy list';
      }, 1200);
    } catch (error) {
      dialogTextareaEl.select();
      document.execCommand('copy');
    }
  });

  function showConfirmDialog({ title, message, confirmText, onConfirm }) {
    dialogTitleEl.textContent = title;
    dialogBodyEl.textContent = message;
    dialogCopySectionEl.classList.add('d-none');
    dialogCopyBtnEl.classList.add('d-none');

    const footer = dialogModalEl.querySelector('.modal-footer');
    const existingConfirm = footer.querySelector('[data-confirm-btn="true"]');
    if (existingConfirm) existingConfirm.remove();

    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = 'btn btn-danger';
    confirmBtn.textContent = confirmText;
    confirmBtn.setAttribute('data-confirm-btn', 'true');

    confirmBtn.addEventListener('click', () => {
      dialogModal.hide();
      onConfirm();
      confirmBtn.remove();
    });

    footer.prepend(confirmBtn);
    dialogModal.show();

    dialogModalEl.addEventListener(
      'hidden.bs.modal',
      () => {
        confirmBtn.remove();
      },
      { once: true }
    );
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    themeToggleIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    themeToggleBtn.setAttribute('aria-pressed', String(theme === 'dark'));
    themeToggleBtn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    localStorage.setItem(THEME_KEY, theme);
  }

  themeToggleBtn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });

  const savedTheme = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(savedTheme || (prefersDark ? 'dark' : 'light'));

  renderTable();
});

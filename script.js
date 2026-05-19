document.addEventListener('DOMContentLoaded', () => {
  let remedyData = remediesData;
  let selectedRemedyIndex = null;

  const dialogModalEl = document.getElementById('messageDialog');
  const dialogModal = new bootstrap.Modal(dialogModalEl);
  const dialogTitleEl = document.getElementById('messageDialogLabel');
  const dialogBodyEl = document.getElementById('messageDialogBody');
  const dialogCopySectionEl = document.getElementById('messageDialogCopySection');
  const dialogTextareaEl = document.getElementById('messageDialogText');
  const dialogCopyBtnEl = document.getElementById('messageDialogCopyBtn');

  renderTable(remedyData);

  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase();
    const filtered = remedyData.filter(item => item.Name.toLowerCase().includes(query));
    renderTable(filtered);
  });

  document.getElementById('buyListBtn').addEventListener('click', () => {
    const lowStockItems = remedyData.filter(item => {
      const qty30 = parseInt(item['Quantitiy - 30 ml']) || 0;
      const qty100 = parseInt(item['Quantitiy -  100ml']) || 0;
      const total = qty30 + qty100;
      return total <= 1;
    });

    const list = lowStockItems.map(item => item.Name);

    if (list.length === 0) {
      showMessageDialog({
        title: 'Buy List',
        message: 'No remedies found with total quantity less than or equal to 1.',
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

  function renderTable(remedies) {
    const tableBody = document.getElementById('remedyTable');
    tableBody.innerHTML = '';

    remedies.forEach(item => {
      const qty30 = parseInt(item['Quantitiy - 30 ml']) || 0;
      const qty100 = parseInt(item['Quantitiy -  100ml']) || 0;
      const total = qty30 + qty100;
      const actualIndex = remedyData.indexOf(item);

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${item.Name}</td>
        <td>${qty30}</td>
        <td>${qty100}</td>
        <td>${total}</td>
        <td><button class="btn btn-outline-primary btn-sm" onclick="openUpdateForm(${actualIndex})">Update</button></td>
      `;
      tableBody.appendChild(row);
    });
  }

  window.openUpdateForm = function(index) {
    selectedRemedyIndex = index;
    const item = remedyData[index];

    document.getElementById('remedyName').value = item.Name;
    document.getElementById('qty30ml').value = item['Quantitiy - 30 ml'];
    document.getElementById('qty100ml').value = item['Quantitiy -  100ml'];

    const modal = new bootstrap.Modal(document.getElementById('updateModal'));
    modal.show();
  };

  document.getElementById('updateForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const qty30 = parseInt(document.getElementById('qty30ml').value.trim()) || 0;
    const qty100 = parseInt(document.getElementById('qty100ml').value.trim()) || 0;

    document.getElementById('qty30ml').value = qty30;
    document.getElementById('qty100ml').value = qty100;

    remedyData[selectedRemedyIndex]['Quantitiy - 30 ml'] = qty30;
    remedyData[selectedRemedyIndex]['Quantitiy -  100ml'] = qty100;

    renderTable(remedyData);
    bootstrap.Modal.getInstance(document.getElementById('updateModal')).hide();
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
            item['Quantitiy - 30 ml'] = 0;
            item['Quantitiy -  100ml'] = 0;
          });
          renderTable(remedyData);
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
});

document.addEventListener('DOMContentLoaded', () => {
  let remedyData = [];
  let selectedRemedyIndex = null;

  fetch('remedies.json')
    .then(response => response.json())
    .then(data => {
      remedyData = data;
      renderTable(remedyData);

      const searchInput = document.getElementById('searchInput');
      searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase();
        const filtered = remedyData.filter(item => item.Name.toLowerCase().includes(query));
        renderTable(filtered);
      });
    });

  function renderTable(remedies) {
    const tableBody = document.getElementById('remedyTable');
    tableBody.innerHTML = '';

    remedies.forEach((item, index) => {
      const qty30 = parseInt(item["Quantitiy - 30 ml"]) || 0;
      const qty100 = parseInt(item["Quantitiy -  100ml"]) || 0;
      const total = qty30 + qty100;

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${item.Name}</td>
        <td>${qty30}</td>
        <td>${qty100}</td>
        <td>${total}</td>
        <td><button class="btn btn-outline-primary btn-sm" onclick="openUpdateForm(${index})">Update</button></td>
      `;
      tableBody.appendChild(row);
    });
  }

  window.openUpdateForm = function(index) {
    selectedRemedyIndex = index;
    const item = remedyData[index];

    document.getElementById('remedyName').value = item.Name;
    document.getElementById('qty30ml').value = item["Quantitiy - 30 ml"];
    document.getElementById('qty100ml').value = item["Quantitiy -  100ml"];

    const modal = new bootstrap.Modal(document.getElementById('updateModal'));
    modal.show();
  };

  document.getElementById('updateForm').addEventListener('submit', function (event) {
    event.preventDefault();

    const qty30 = parseInt(document.getElementById('qty30ml').value) || 0;
    const qty100 = parseInt(document.getElementById('qty100ml').value) || 0;

    remedyData[selectedRemedyIndex]["Quantitiy - 30 ml"] = qty30;
    remedyData[selectedRemedyIndex]["Quantitiy -  100ml"] = qty100;

    renderTable(remedyData);
    bootstrap.Modal.getInstance(document.getElementById('updateModal')).hide();
  });
});

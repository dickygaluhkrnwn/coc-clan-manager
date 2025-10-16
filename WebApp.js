/**
 * @OnlyCurrentDoc
 */

// --- KONFIGURASI GLOBAL ---
const ss = SpreadsheetApp.getActiveSpreadsheet();
const sheets = {
  DASHBOARD: ss.getSheetByName('Dashboard'),
  PERANG_AKTIF: ss.getSheetByName('Perang Aktif'),
  LOG_PERANG: ss.getSheetByName('Log Perang'),
  ANGGOTA: ss.getSheetByName('Anggota'),
  PARTISIPASI: ss.getSheetByName('Partisipasi'),
  RAID_TERBARU: ss.getSheetByName('Raid Terbaru'),
  CWL_SQUAD: ss.getSheetByName('CWL - GBK Squad'),
  CWL_CREW: ss.getSheetByName('CWL - GBK Crew'),
};

// --- FUNGSI UTAMA WEB APP ---

/**
 * Serves the HTML of the web application.
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
      .setTitle('GBK Clan War Dashboard')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// --- FUNGSI PENGHASIL HTML (Dipanggil dari Frontend) ---

function getClanInfo() {
  const sheet = sheets.DASHBOARD;
  if (!sheet) return '<p>Sheet "Dashboard" tidak ditemukan.</p>';
  const data = sheet.getRange('A1:J25').getValues();
  
  let html = '<h2>Dashboard</h2>';
  html += '<div class="dashboard-container">';

  // Clan 1 Card
  html += '<div class="clan-card">';
  html += `<h3>${data[2][0]}</h3>`; // Nama Klan
  html += `<h4>${data[4][0]}</h4>`; // Ringkasan Performa
  html += `<p><strong>Promosi:</strong> ${data[6][0]} | <strong>Demosi:</strong> ${data[6][1]}</p>`;
  html += `<p><strong>Top Raid:</strong> ${data[6][2]} | <strong>Top Donasi:</strong> ${data[6][3]}</p>`;
  html += `<h4>${data[8][0]}</h4>`; // Status War
  html += `<p><strong>Status:</strong> ${data[9][0]} | <strong>Sisa Serangan:</strong> ${data[9][1]}</p>`;
  html += `<p><strong>Skor:</strong> ${data[9][2]} vs ${data[9][3]}</p>`;
  html += `<h4>${data[11][0]}</h4>`; // CWL Bulan Terakhir
  html += buildSimpleTable(data.slice(12, 23), [0, 2, 3]);
  html += '</div>';

  // Clan 2 Card
  html += '<div class="clan-card">';
  html += `<h3>${data[2][5]}</h3>`; // Nama Klan
  html += `<h4>${data[4][5]}</h4>`; // Ringkasan Performa
  html += `<p><strong>Promosi:</strong> ${data[6][5]} | <strong>Demosi:</strong> ${data[6][6]}</p>`;
  html += `<p><strong>Top Raid:</strong> ${data[6][7]} | <strong>Top Donasi:</strong> ${data[6][8]}</p>`;
  html += `<h4>${data[8][5]}</h4>`; // Status War
  html += `<p><strong>Status:</strong> ${data[9][5]} | <strong>Sisa Serangan:</strong> ${data[9][6]}</p>`;
  html += `<p><strong>Skor:</strong> ${data[9][7]} vs ${data[9][8]}</p>`;
  html += `<h4>${data[11][5]}</h4>`; // CWL Bulan Terakhir
  html += buildSimpleTable(data.slice(12, 23), [5, 7, 8]);
  html += '</div>';
  
  html += '</div>';
  return html;
}

// --- Anggota Functions ---
function getClanMembersSquad() {
  return getFilteredSheetData(sheets.ANGGOTA, 1, 'GBK Squad', 'Daftar Anggota: GBK Squad');
}
function getClanMembersCrew() {
  return getFilteredSheetData(sheets.ANGGOTA, 1, 'GBK Crew', 'Daftar Anggota: GBK Crew');
}

// --- Partisipasi Functions ---
function getParticipationDataSquad() {
  return getFilteredSheetData(sheets.PARTISIPASI, 4, 'GBK Squad', 'Partisipasi: GBK Squad');
}
function getParticipationDataCrew() {
  return getFilteredSheetData(sheets.PARTISIPASI, 4, 'GBK Crew', 'Partisipasi: GBK Crew');
}


function getWarLogSquad() {
  return getFilteredWarLog('GBK Squad');
}

function getWarLogCrew() {
  return getFilteredWarLog('GBK Crew');
}

function getCurrentWar() {
  const sheet = sheets.PERANG_AKTIF;
  if (!sheet) return '<p>Sheet "Perang Aktif" tidak ditemukan.</p>';
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return '<h2>Perang Aktif</h2><p>Tidak ada perang yang sedang aktif.</p>';

  let html = '<h2>Perang Aktif</h2>';
  let warSections = [];
  let currentSection = null;

  data.forEach(row => {
    if (row[0] && row[0].toString().includes('vs')) {
      if (currentSection) warSections.push(currentSection);
      currentSection = { title: row[0], headers: null, members: [] };
    } else if (row[1] === 'Nama' && currentSection) {
      currentSection.headers = row;
    } else if (row[1] && currentSection && currentSection.headers) {
      currentSection.members.push(row);
    }
  });
  if (currentSection) warSections.push(currentSection);

  if (warSections.length === 0) return '<h2>Perang Aktif</h2><p>Tidak ada data perang aktif yang dapat ditampilkan.</p>';

  warSections.forEach(section => {
    html += `<h3 style="margin-top: 20px; background-color: #374151; padding: 10px; border-radius: 5px; font-family: 'Teko', sans-serif;">${section.title}</h3>`;
    if (section.headers && section.members.length > 0) {
      html += buildHtmlTable(section.headers, section.members);
    } else {
      html += '<p>Data tidak lengkap untuk perang ini.</p>';
    }
  });

  return html;
}

function getClanCWLSquad() {
  const sheet = sheets.CWL_SQUAD;
  if (!sheet) return '<h2>CWL GBK Squad</h2><p>Sheet "CWL - GBK Squad" tidak ditemukan.</p>';
  const data = sheet.getDataRange().getValues();
  return '<h2>Laporan CWL: GBK Squad</h2>' + buildRawHtmlTable(data);
}

function getClanCWLCrew() {
  const sheet = sheets.CWL_CREW;
  if (!sheet) return '<h2>CWL GBK Crew</h2><p>Sheet "CWL - GBK Crew" tidak ditemukan.</p>';
  const data = sheet.getDataRange().getValues();
  return '<h2>Laporan CWL: GBK Crew</h2>' + buildRawHtmlTable(data);
}

function getClanRaid() {
  const sheet = sheets.RAID_TERBARU;
  if (!sheet) return '<p>Sheet "Raid Terbaru" tidak ditemukan.</p>';
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return '<h2>Performa Raid Weekend</h2><p>Tidak ada data raid.</p>';

  let html = '<h2>Performa Raid Weekend</h2>';
  let raidReports = [];
  let currentReport = null;

  data.forEach(row => {
    if (row[0] && row[0].toString().includes('PERFORMA RAID')) {
      if (currentReport) raidReports.push(currentReport);
      currentReport = { title: row[0], headers: null, members: [] };
    } else if (row[0] === 'Peringkat' && currentReport) {
      currentReport.headers = row;
    } else if (row[0] && currentReport && currentReport.headers) {
      currentReport.members.push(row);
    }
  });
  if (currentReport) raidReports.push(currentReport);

  if (raidReports.length === 0) return '<h2>Performa Raid Weekend</h2><p>Tidak ada laporan raid yang dapat ditampilkan.</p>';

  raidReports.forEach(report => {
    html += `<h3 style="margin-top: 20px; font-family: 'Teko', sans-serif;">${report.title}</h3>`;
    if (report.headers && report.members.length > 0) {
      html += buildHtmlTable(report.headers, report.members);
    } else {
      html += '<p>Data tidak lengkap untuk laporan ini.</p>';
    }
  });

  return html;
}


// --- FUNGSI PEMBANTU (Helpers) ---

function getFilteredSheetData(sheet, clanNameColumnIndex, clanNameToFilter, title) {
  if (!sheet) return `<h2>${title}</h2><p>Sheet tidak ditemukan.</p>`;
  
  const allData = sheet.getDataRange().getValues();
  if (allData.length <= 1) {
    return `<h2>${title}</h2><p>Tidak ada data untuk ditampilkan.</p>`;
  }

  const headers = allData.shift();
  const filteredData = allData.filter(row => row[clanNameColumnIndex] === clanNameToFilter);

  if (filteredData.length === 0) {
    return `<h2>${title}</h2><p>Tidak ada data untuk ${clanNameToFilter}.</p>`;
  }

  return `<h2>${title}</h2>` + buildHtmlTable(headers, filteredData);
}

function getFilteredWarLog(clanNameToFilter) {
  const sheet = sheets.LOG_PERANG;
  if (!sheet) return `<h2>Log Perang: ${clanNameToFilter}</h2><p>Sheet "Log Perang" tidak ditemukan.</p>`;
  
  const allData = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();
  if (allData.length <= 1) {
    return `<h2>Log Perang: ${clanNameToFilter}</h2><p>Tidak ada data log perang untuk ditampilkan.</p>`;
  }

  const headers = allData.shift();
  const filteredData = allData.filter(row => row[1] === clanNameToFilter);

  // Sort data by date (newest first)
  const dateColumnIndex = headers.indexOf('Tanggal Selesai');
  if (dateColumnIndex !== -1) {
    filteredData.sort((a, b) => new Date(b[dateColumnIndex]) - new Date(a[dateColumnIndex]));
  }

  if (filteredData.length === 0) {
    return `<h2>Log Perang: ${clanNameToFilter}</h2><p>Tidak ada data log perang untuk ${clanNameToFilter}.</p>`;
  }

  return `<h2>Log Perang: ${clanNameToFilter}</h2>` + buildHtmlTable(headers, filteredData);
}

function buildHtmlTable(headers, data) {
    let table = '<table><thead><tr>';
    headers.forEach(header => {
        table += `<th>${header}</th>`;
    });
    table += '</tr></thead><tbody>';
    data.forEach(row => {
        table += '<tr>';
        row.forEach(cell => {
            table += `<td>${cell}</td>`;
        });
        table += '</tr>';
    });
    table += '</tbody></table>';
    return table;
}

function buildSimpleTable(data, columns) {
  let table = '<table><tbody>';
  data.forEach(row => {
    if(row[columns[0]]){ 
      table += '<tr>';
      columns.forEach(colIndex => {
        table += `<td>${row[colIndex]}</td>`;
      });
      table += '</tr>';
    }
  });
  table += '</tbody></table>';
  return table;
}

/**
 * Builds an HTML table from raw 2D array data, good for complex sheets.
 */
function buildRawHtmlTable(data) {
    let table = '<table><tbody>';
    data.forEach(row => {
        table += '<tr>';
        row.forEach(cell => {
            let cellContent = cell.toString();
            let style = '';
            // Make cells with 'vs' or 'TIM KITA' bold to act as headers
            if (cellContent.includes('vs') || cellContent.includes('TIM KITA') || cellContent.includes('HARI KE')) {
              style = "font-family: 'Teko', sans-serif; font-weight: bold; background-color: #374151;";
            }
            table += `<td style="${style}">${cellContent}</td>`;
        });
        table += '</tr>';
    });
    table += '</tbody></table>';
    return table;
}


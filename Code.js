/**
 * @OnlyCurrentDoc
 * File utama untuk backend Google Apps Script.
 * Mengelola routing web app dan penyediaan data ke front-end.
 */

// Konfigurasi Spreadsheet
const ss = SpreadsheetApp.getActiveSpreadsheet();
const sheets = {
  dashboard: ss.getSheetByName('Dashboard'),
  anggota: ss.getSheetByName('Anggota'),
  partisipasi: ss.getSheetByName('Partisipasi'),
  perangAktif: ss.getSheetByName('Perang Aktif'),
  raidTerbaru: ss.getSheetByName('Raid Terbaru'),
  cwlCrew: ss.getSheetByName('CWL - GBK Crew'),
  cwlSquad: ss.getSheetByName('CWL - GBK Squad'),
  logPerang: ss.getSheetByName('Log Perang'),
  pengaturan: ss.getSheetByName('Pengaturan'),
};

// --- PERBAIKAN ---
// Mengambil tag klan dari sheet 'Pengaturan' dan membersihkan spasi (trim).
const pengaturanSheet = sheets.pengaturan;
if (!pengaturanSheet) {
  throw new Error("Sheet 'Pengaturan' tidak ditemukan. Mohon pastikan sheet tersebut ada.");
}
const CLAN_TAGS = {
  CREW: pengaturanSheet.getRange('B2').getValue().toString().trim(),
  SQUAD: pengaturanSheet.getRange('B3').getValue().toString().trim(),
};


/**
 * Fungsi utama yang dipanggil saat web app diakses.
 * @param {Object} e Event parameter dari request GET.
 * @returns {HtmlOutput} Halaman HTML yang akan ditampilkan.
 */
function doGet(e) {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('GBK Management System')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Meng-include file HTML lain ke dalam template utama.
 * @param {string} filename Nama file HTML tanpa ekstensi.
 * @returns {string} Konten dari file HTML.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// =================================================================================
// FUNGSI-FUNGSI PEMROSESAN DATA TERPUSAT
// =================================================================================

/**
 * Membaca dan memproses data dari sheet 'Perang Aktif'.
 * Ini menjadi satu-satunya sumber data untuk perang aktif agar konsisten.
 * @returns {Object} Objek terstruktur berisi data mentah dan info status perang.
 */
function parsePerangAktifSheet() {
  const sheet = sheets.perangAktif;
  const noWarStatus = { status: "Tidak Ada Perang", sisaSerangan: "N/A", bintangKita: 0, bintangLawan: 0 };

  if (!sheet || sheet.getLastRow() <= 1) {
    return {
      crew: { rawData: [], statusInfo: noWarStatus },
      squad: { rawData: [], statusInfo: noWarStatus }
    };
  }

  const rawData = sheet.getRange('A1:P' + sheet.getLastRow()).getValues();
  const result = {
    crew: { rawData: [], statusInfo: {} },
    squad: { rawData: [], statusInfo: {} }
  };

  let currentClanKey = null;

  for (const row of rawData) {
    if (!row[0]) continue;
    const header = row[0].toString().toLowerCase();

    if (header.includes('gbk crew')) {
      currentClanKey = 'crew';
    } else if (header.includes('gbk squad')) {
      currentClanKey = 'squad';
    }

    if (currentClanKey) {
      result[currentClanKey].rawData.push(row);
    }
  }

  // Proses data untuk setiap klan untuk mendapatkan status ringkas
  for (const key of ['crew', 'squad']) {
    const clanData = result[key].rawData;
    if (clanData.length < 2) {
      result[key].statusInfo = { ...noWarStatus };
      continue;
    }

    const titleRow = clanData[0][0]; // e.g., "⚔️ GBK CREW (Classic) vs G.KAPAK (#2Q8GLU8JC) (State: preparation)"
    const members = clanData.slice(2);
    const teamSize = members.length;
    if (teamSize === 0) {
       result[key].statusInfo = { ...noWarStatus };
       continue;
    }
    const totalAttacks = teamSize * 2;

    // Ekstrak status dan nama lawan dari judul
    let statusText = "N/A";
    const stateMatch = titleRow.match(/\(State: (.*?)\)/i);
    const opponentMatch = titleRow.match(/vs (.*?)\s\(/i);
    if (stateMatch && opponentMatch) {
      statusText = `${stateMatch[1].toUpperCase()} vs ${opponentMatch[1]}`;
    } else if (stateMatch) {
       statusText = stateMatch[1].toUpperCase();
    }


    // Hitung bintang dan serangan yang sudah digunakan
    let bintangKita = 0;
    let bintangLawan = 0;
    let usedAttacks = 0;

    members.forEach(memberRow => {
      // Tim kita (kolom D untuk status, F untuk bintang)
      if (memberRow[3] && memberRow[3].includes('✔️')) usedAttacks++;
      bintangKita += Number(memberRow[5] || 0);
      
      // Tim lawan (kolom N untuk bintang)
      bintangLawan += Number(memberRow[13] || 0);
    });
    
    const sisaSerangan = `${totalAttacks - usedAttacks} / ${totalAttacks}`;

    result[key].statusInfo = {
      status: statusText,
      sisaSerangan: sisaSerangan,
      bintangKita: bintangKita,
      bintangLawan: bintangLawan
    };
  }

  return result;
}


// =================================================================================
// FUNGSI-FUNGSI UNTUK MENGAMBIL DATA DARI SPREADSHEET
// =================================================================================

/**
 * Mengambil data ringkasan untuk halaman Dashboard utama.
 * @returns {Object} Data ringkasan untuk kedua klan.
 */
function getDashboardData() {
  try {
    const dashSheet = sheets.dashboard;
    const perangAktifData = parsePerangAktifSheet(); // Menggunakan sumber data terpusat

    const clanData = {
      crew: {
        nama: 'GBK Crew',
        tag: CLAN_TAGS.CREW,
        performa: {
          promosi: dashSheet.getRange('A7').getValue(),
          demosi: dashSheet.getRange('B7').getValue(),
          raidLooter: dashSheet.getRange('C7').getValue(),
          topDonator: dashSheet.getRange('D7').getValue(),
        },
        warStatus: perangAktifData.crew.statusInfo, // <-- DATA SINKRON
        cwlTerakhir: dashSheet.getRange('A15:D20').getValues().filter(row => row[0]),
      },
      squad: {
        nama: 'GBK Squad',
        tag: CLAN_TAGS.SQUAD,
        performa: {
          promosi: dashSheet.getRange('F7').getValue(),
          demosi: dashSheet.getRange('G7').getValue(),
          raidLooter: dashSheet.getRange('H7').getValue(),
          topDonator: dashSheet.getRange('I7').getValue(),
        },
        warStatus: perangAktifData.squad.statusInfo, // <-- DATA SINKRON
        cwlTerakhir: dashSheet.getRange('F15:I20').getValues().filter(row => row[0]),
      }
    };
    return clanData;
  } catch (e) {
    Logger.log('Error in getDashboardData: ' + e.message);
    return { error: e.message };
  }
}

/**
 * Mengambil daftar semua anggota dari kedua klan.
 * @returns {Array<Array<String>>} Daftar anggota.
 */
function getDataAnggota() {
  try {
    const sheet = sheets.anggota;
    if (!sheet) throw new Error("Sheet 'Anggota' not found.");
    return sheet.getRange(2, 1, sheet.getLastRow() - 1, 13).getValues();
  } catch (e) {
    Logger.log('Error in getDataAnggota: ' + e.message);
    return [];
  }
}

/**
 * Mengambil data partisipasi anggota.
 * @returns {Array<Array<String>>} Data partisipasi.
 */
function getDataPartisipasi() {
  try {
    const sheet = sheets.partisipasi;
    if (!sheet) throw new Error("Sheet 'Partisipasi' not found.");
    return sheet.getRange(2, 1, sheet.getLastRow() - 1, 12).getValues();
  } catch (e) {
    Logger.log('Error in getDataPartisipasi: ' + e.message);
    return [];
  }
}

/**
 * Mengambil data perang yang sedang aktif.
 * @returns {Object} Data perang aktif untuk kedua klan.
 */
function getDataPerangAktif() {
  try {
    const perangAktifData = parsePerangAktifSheet(); // Menggunakan sumber data terpusat
    // Mengembalikan hanya data mentah yang diperlukan untuk tabel di front-end
    return { 
      crew: perangAktifData.crew.rawData, 
      squad: perangAktifData.squad.rawData 
    };
  } catch (e) {
    Logger.log('Error in getDataPerangAktif: ' + e.message);
    return { crew: [], squad: [] };
  }
}

/**
 * Mengambil data hasil raid terbaru.
 * @returns {Object} Data raid untuk kedua klan.
 */
function getDataRaidTerbaru() {
  try {
    const sheet = sheets.raidTerbaru;
    if (!sheet) throw new Error("Sheet 'Raid Terbaru' not found.");
    const rawData = sheet.getRange(1, 1, sheet.getLastRow(), 6).getValues();
    const result = { crew: [], squad: [] };
    let currentClan = '';
    let isHeaderPassed = false;

    rawData.forEach(row => {
      const cell = row[0].toString();
      if (cell.includes('GBK CREW')) {
        currentClan = 'crew';
        isHeaderPassed = false;
        return;
      } else if (cell.includes('GBK SQUAD')) {
        currentClan = 'squad';
        isHeaderPassed = false;
        return;
      }

      if(cell.toLowerCase().includes('peringkat')) {
        isHeaderPassed = true;
        return;
      }
      
      if (currentClan && isHeaderPassed && !isNaN(cell) && cell) {
        result[currentClan].push(row);
      }
    });
    return result;
  } catch (e) {
    Logger.log('Error in getDataRaidTerbaru: ' + e.message);
    return { crew: [], squad: [] };
  }
}

/**
 * Mengambil data CWL.
 * @returns {Object} Data CWL untuk kedua klan.
 */
function getDataCWL() {
  try {
    const getSheetData = (sheet) => {
      if (!sheet) return [];
      return sheet.getRange(1, 1, sheet.getLastRow(), 15).getValues();
    }
    return {
      crew: getSheetData(sheets.cwlCrew),
      squad: getSheetData(sheets.cwlSquad)
    };
  } catch (e) {
    Logger.log('Error in getDataCWL: ' + e.message);
    return { crew: [], squad: [] };
  }
}

/**
 * Mengambil data log atau arsip perang dan memisahkannya per klan.
 * @returns {Object} Data log perang untuk kedua klan.
 */
function getDataLogPerang() {
  try {
    const sheet = sheets.logPerang;
    if (!sheet) throw new Error("Sheet 'Log Perang' not found.");
    
    const lastRow = sheet.getLastRow();
    // Jika sheet hanya berisi header atau kosong, kembalikan data kosong.
    if (lastRow < 2) {
      return { crew: [], squad: [] };
    }
    
    const allLogs = sheet.getRange(2, 1, lastRow - 1, 11).getValues();
    const crewLogs = [];
    const squadLogs = [];

    allLogs.forEach(row => {
      // Lewati baris jika kolom pertama kosong
      if (!row[0]) return;
      
      // --- PERBAIKAN ---
      // Bersihkan spasi dari tag klan di sheet Log Perang sebelum membandingkan.
      const clanTag = row[0].toString().trim();
      
      if (clanTag === CLAN_TAGS.CREW) {
        crewLogs.push(row);
      } else if (clanTag === CLAN_TAGS.SQUAD) {
        squadLogs.push(row);
      }
    });

    return { crew: crewLogs, squad: squadLogs };
  } catch (e) {
    Logger.log('Error in getDataLogPerang: ' + e.message);
    return { crew: [], squad: [] };
  }
}


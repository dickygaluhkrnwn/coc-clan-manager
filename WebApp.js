/**
 * @file WebApp.gs
 * @description Backend untuk aplikasi web Dasbor Klan GBK. Bertanggung jawab sebagai router 
 * untuk menyajikan halaman HTML yang sesuai dan menyediakan data dari Google Sheet.
 */

const ss = SpreadsheetApp.getActiveSpreadsheet();

/**
 * Fungsi utama yang dieksekusi ketika URL aplikasi web diakses.
 * Berfungsi sebagai router untuk menampilkan halaman yang diminta.
 */
function doGet(e) {
  const pageParam = e.parameter.page || 'Dashboard';
  let fileName;

  const routes = {
    'Dashboard': 'HalamanDashboard',
    'Anggota': 'Anggota',
    'Partisipasi': 'Partisipasi',
    'LogPerang': 'LogPerang',
    'PerangAktif': 'PerangAktif',
    'RaidTerbaru': 'RaidTerbaru',
    'CWL': 'CWL' // Rute baru untuk halaman CWL
  };

  fileName = routes[pageParam] || 'Error404'; // Default ke halaman error jika rute tidak ditemukan

  try {
    const template = HtmlService.createTemplateFromFile(fileName);
    template.page = pageParam;
    return template.evaluate()
      .setTitle('GBK Management System')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
  } catch (err) {
    Logger.log(`Error saat mencoba memuat file: ${fileName}.html. Pesan: ${err.message}`);
    const errorTemplate = HtmlService.createTemplateFromFile('Error404');
    errorTemplate.page = 'Error';
    errorTemplate.errorMessage = `File HTML untuk halaman '${pageParam}' (${fileName}.html) tidak dapat ditemukan di proyek. Mohon periksa kembali nama filenya.`;
    return errorTemplate.evaluate().setTitle('Halaman Tidak Ditemukan');
  }
}

/**
 * Menyertakan konten dari file HTML lain ke dalam template utama.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Mengambil data dari sheet "Dashboard" untuk ditampilkan di halaman utama.
 * @returns {Object} Objek data dasbor yang terstruktur.
 */
function getDashboardData() {
  try {
    const dashboardSheet = ss.getSheetByName('Dashboard');
    if (!dashboardSheet) throw new Error('Sheet "Dashboard" tidak ditemukan.');
    const data = dashboardSheet.getRange('A1:I20').getValues();
    
    const crewPromo = data[6][0], crewDemote = data[6][1], crewRaidLooter = data[6][2], crewTopDonator = data[6][3];
    const crewWarStatus = data[10][0], crewWarAttacks = data[10][1], crewWarStars = data[10][2], crewWarOpponentStars = data[10][3];
    let crewCwlTop = [];
    for (let i = 14; i < 20; i++) { if(data[i][0]) crewCwlTop.push({ name: data[i][0], stars: data[i][2], percentage: data[i][3] * 100 }); }

    const squadPromo = data[6][5], squadDemote = data[6][6], squadRaidLooter = data[6][7], squadTopDonator = data[6][8];
    const squadWarStatus = data[10][5], squadWarAttacks = data[10][6], squadWarStars = data[10][7], squadWarOpponentStars = data[10][8];
    let squadCwlTop = [];
    for (let i = 14; i < 20; i++) { if(data[i][5]) squadCwlTop.push({ name: data[i][5], stars: data[i][7], percentage: (data[i][8] * 100).toFixed(0) }); }
    
    return {
      crew: { performance: { promo: crewPromo, demote: crewDemote, raidLooter: crewRaidLooter, topDonator: crewTopDonator }, activeWar: { status: crewWarStatus, attacks: crewWarAttacks, stars: crewWarStars, opponentStars: crewWarOpponentStars }, cwlTop: crewCwlTop },
      squad: { performance: { promo: squadPromo, demote: squadDemote, raidLooter: squadRaidLooter, topDonator: squadTopDonator }, activeWar: { status: squadWarStatus, attacks: squadWarAttacks, stars: squadWarStars, opponentStars: squadWarOpponentStars }, cwlTop: squadCwlTop }
    };
  } catch (e) {
    console.error("Error di getDashboardData: " + e.toString());
    throw new Error('Gagal mengambil data dasbor: ' + e.message);
  }
}

/**
 * Mengambil dan memformat data dari sheet "Anggota".
 * @returns {Array<Object>} Array objek yang berisi data anggota.
 */
function getAnggotaData() {
  try {
    const sheet = ss.getSheetByName('Anggota');
    if (!sheet) throw new Error('Sheet "Anggota" tidak ditemukan.');
    const data = sheet.getDataRange().getValues();
    const headers = data.shift(); // Ambil header
    return data.map(row => ({
      namaKlan: row[1],
      nama: row[3],
      role: row[4],
      th: row[5],
      donasi: row[6],
      donasiDiterima: row[7],
      xp: row[8],
      liga: row[9] || 'Unranked'
    }));
  } catch (e) {
    console.error("Error di getAnggotaData: " + e.toString());
    throw new Error('Gagal mengambil data anggota: ' + e.message);
  }
}

/**
 * Mengambil dan memformat data dari sheet "Partisipasi".
 * @returns {Array<Object>} Array objek yang berisi data partisipasi.
 */
function getPartisipasiData() {
  try {
    const sheet = ss.getSheetByName('Partisipasi');
    if (!sheet) throw new Error('Sheet "Partisipasi" tidak ditemukan.');
    const data = sheet.getDataRange().getValues();
    const headers = data.shift();
    return data.map(row => ({
      nama: row[0],
      th: row[1],
      role: row[2],
      namaKlan: row[4],
      cwlValid: row[6],
      warValid: row[7],
      cwlGagal: row[8],
      warGagal: row[9],
      status: row[10],
      keterangan: row[11]
    }));
  } catch (e) {
    console.error("Error di getPartisipasiData: " + e.toString());
    throw new Error('Gagal mengambil data partisipasi: ' + e.message);
  }
}

/**
 * Mengambil dan memformat data dari sheet "Log Perang".
 * @returns {Array<Object>} Array objek yang berisi data log perang.
 */
function getLogPerangData() {
  try {
    const sheet = ss.getSheetByName('Log Perang');
    if (!sheet) throw new Error('Sheet "Log Perang" tidak ditemukan.');
    const data = sheet.getDataRange().getValues();
    const headers = data.shift();
    return data.map(row => ({
      namaKlan: row[1],
      hasil: row[3],
      ukuran: row[4],
      bintangKita: row[5],
      persenKita: (row[6] * 100).toFixed(2) + '%',
      bintangLawan: row[7],
      persenLawan: (row[8] * 100).toFixed(2) + '%',
      namaLawan: row[9],
      tanggal: new Date(row[10]).toLocaleDateString('id-ID')
    }));
  } catch (e) {
    console.error("Error di getLogPerangData: " + e.toString());
    throw new Error('Gagal mengambil data log perang: ' + e.message);
  }
}

/**
 * Mengambil data dari sheet "Perang Aktif".
 * @returns {Object} Objek yang berisi detail perang aktif untuk Crew dan Squad.
 */
function getPerangAktifData() {
  try {
    const sheet = ss.getSheetByName('Perang Aktif');
    if (!sheet) throw new Error('Sheet "Perang Aktif" tidak ditemukan.');
    const data = sheet.getDataRange().getValues();
    
    let activeWars = { crew: null, squad: null };
    let currentClan = null;
    let warData = {};

    data.forEach(row => {
      if (row[0] && row[0].toString().includes('⚔️ GBK')) {
        if (currentClan) { // Simpan data perang sebelumnya
           activeWars[currentClan] = warData;
        }
        
        currentClan = row[0].toString().includes('CREW') ? 'crew' : 'squad';
        warData = { title: row[0], ourTeam: [], enemyTeam: [] };
      }
      
      if (currentClan && row[1] && row[1].toString() !== 'Nama') { // Baris data pemain
        if (row[1]) { // Ada data pemain kita
          warData.ourTeam.push({ name: row[1], th: row[2], status: row[3], target: row[4], stars: row[5], percentage: row[6] });
        }
        if (row[9]) { // Ada data pemain musuh
           warData.enemyTeam.push({ name: row[9], th: row[10], status: row[11], target: row[12], stars: row[13], percentage: row[14] });
        }
      }
    });

    if (currentClan) { // Simpan data perang terakhir
      activeWars[currentClan] = warData;
    }

    return activeWars;
  } catch (e) {
    console.error("Error di getPerangAktifData: " + e.toString());
    throw new Error('Gagal mengambil data perang aktif: ' + e.message);
  }
}

/**
 * Mengambil data dari sheet "Raid Terbaru".
 * @returns {Object} Objek yang berisi data raid terbaru untuk Crew dan Squad.
 */
function getRaidTerbaruData() {
    try {
        const sheet = ss.getSheetByName('Raid Terbaru');
        if (!sheet) throw new Error('Sheet "Raid Terbaru" tidak ditemukan.');
        const data = sheet.getDataRange().getValues();

        let raidData = { crew: { title: '', members: [] }, squad: { title: '', members: [] } };
        let currentClan = null;

        data.forEach(row => {
            if (row[0] && row[0].toString().includes('PERFORMA RAID')) {
                currentClan = row[0].toString().includes('CREW') ? 'crew' : 'squad';
                raidData[currentClan].title = row[0];
            } else if (currentClan && !isNaN(parseInt(row[0]))) { // Cek jika kolom pertama adalah angka (peringkat)
                raidData[currentClan].members.push({
                    rank: row[0],
                    name: row[1],
                    tag: row[2],
                    loot: row[3],
                    attacks: row[4],
                    avg: row[5]
                });
            }
        });
        return raidData;
    } catch (e) {
        console.error("Error di getRaidTerbaruData: " + e.toString());
        throw new Error('Gagal mengambil data raid terbaru: ' + e.message);
    }
}

/**
 * Mengambil data dari sheet "CWL - GBK Crew" dan "CWL - GBK Squad".
 * @returns {Object} Objek yang berisi data CWL yang terstruktur per hari untuk kedua klan.
 */
function getCwlData() {
    const crewSheet = ss.getSheetByName('CWL - GBK Crew');
    const squadSheet = ss.getSheetByName('CWL - GBK Squad');
    let cwlData = { crew: [], squad: [] };

    const parseCwlSheet = (sheet) => {
        if (!sheet) return [];
        const data = sheet.getDataRange().getValues();
        const rounds = [];
        let currentRound = null;

        data.forEach(row => {
            // Cek jika baris menandakan ronde baru
            if (row[0] && row[0].toString().toUpperCase().startsWith('HARI KE-')) {
                if (currentRound) {
                    rounds.push(currentRound); // Simpan ronde sebelumnya
                }
                currentRound = { title: row[0], ourTeam: [], enemyTeam: [] };
            } 
            // Cek jika ini adalah baris data pemain yang valid
            else if (currentRound && row[0] && row[0].toLowerCase() !== 'tag' && row[1]) {
                // Pastikan baris tim kita punya nama
                if (row[1]) {
                    currentRound.ourTeam.push({ tag: row[0], name: row[1], th: row[2], status: row[3], target: row[4], stars: row[5], percentage: row[6] });
                }
                // Pastikan baris tim musuh punya nama
                if (row[9]) {
                    currentRound.enemyTeam.push({ tag: row[8], name: row[9], th: row[10], status: row[11], target: row[12], stars: row[13], percentage: row[14] });
                }
            }
        });
        
        if (currentRound) {
            rounds.push(currentRound); // Simpan ronde terakhir
        }
        return rounds;
    };

    if(crewSheet) cwlData.crew = parseCwlSheet(crewSheet);
    if(squadSheet) cwlData.squad = parseCwlSheet(squadSheet);
    
    return cwlData;
}


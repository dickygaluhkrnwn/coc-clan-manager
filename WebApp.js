/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// --- KONSTANTA UNTUK TAG KLAN ---
const CLAN_TAGS = {
  CREW: '#2G8PU0GLJ',
  SQUAD: '#2GQ9R8Y2R'
};

// Fungsi utama untuk menampilkan web app
function doGet(e) {
  const html = HtmlService.createTemplateFromFile('index');

  // Mengambil data dari semua sheet yang dibutuhkan
  const anggotaData = getSheetDataAsObject('Anggota');
  const partisipasiData = getSheetDataAsObject('Partisipasi');
  const logPerangData = getSheetDataAsObject('Log Perang');
  const perangAktifData = getSheetDataAsObject('Perang Aktif');
  const arsipPerangData = getArsipPerangData(); 
  const arsipCwlData = getArsipCwlData();

  const data = {
    dashboard: getSheetDataAsObject('Dashboard'),
    anggota: splitDataByClan(anggotaData, 1, 'name'),
    partisipasi: splitDataByClan(partisipasiData, 4, 'name'),
    perang_aktif: splitActiveWarData(perangAktifData), 
    log_perang: splitDataByClan(logPerangData, 1, 'name'),
    arsip_perang: arsipPerangData,
    arsip_cwl: arsipCwlData
  };

  html.data = data;
  return html.evaluate()
    .setTitle('GBK Management System')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Memproses data dari sheet 'Perang Aktif'.
 */
function splitActiveWarData(data) {
  const wars = {
    gbkCrew: { title: '', headers: [], rows: [] },
    gbkSquad: { title: '', headers: [], rows: [] }
  };
  if (!data || data.length === 0) return wars;

  let currentClan = null;
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0 || !row[0]) continue;

    if (row[0].includes('vs') && row[0].includes('⚔️')) {
      if (row[0].includes('GBK CREW')) {
        currentClan = 'gbkCrew';
        wars.gbkCrew.title = row[0];
        if (data[i + 1]) {
          wars.gbkCrew.headers = data[i + 1];
          i++; 
        }
      } else if (row[0].includes('GBK SQUAD')) {
        currentClan = 'gbkSquad';
        wars.gbkSquad.title = row[0];
        if (data[i + 1]) {
          wars.gbkSquad.headers = data[i + 1];
          i++; 
        }
      }
    } else if (currentClan) {
      if (row.some(cell => cell.toString().trim() !== '')) {
          wars[currentClan].rows.push(row);
      }
    }
  }
  return wars;
}

/**
 * Memisahkan data berdasarkan nama atau tag klan.
 */
function splitDataByClan(data, columnIndex, splitByType = 'name') {
  if (!data || data.length < 1) return { gbkCrew: [], gbkSquad: [] };
  
  const header = data[0];
  const gbkCrew = [header];
  const gbkSquad = [header];

  const crewIdentifier = splitByType === 'tag' ? CLAN_TAGS.CREW : 'GBK Crew';
  const squadIdentifier = splitByType === 'tag' ? CLAN_TAGS.SQUAD : 'GBK Squad';

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row && row[columnIndex]) {
      if (row[columnIndex].trim() === crewIdentifier) gbkCrew.push(row);
      else if (row[columnIndex].trim() === squadIdentifier) gbkSquad.push(row);
    }
  }
  return { gbkCrew, gbkSquad };
}

/**
 * Mengambil semua data dari sheet tertentu.
 */
function getSheetDataAsObject(sheetName) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) return [[`Error: Sheet "${sheetName}" tidak ditemukan.`]];
    return sheet.getDataRange().getValues();
  } catch (e) {
    Logger.log(`Error reading sheet ${sheetName}: ${e.toString()}`);
    return [[`Error saat membaca sheet: ${sheetName}`]];
  }
}

// ======================================================================
// FUNGSI ARSIP
// ======================================================================

/**
 * Mengambil dan memproses data dari sheet 'Arsip Perang'.
 */
function getArsipPerangData() {
  const values = getSheetDataAsObject('Arsip Perang');
  values.shift(); // Hapus header
  const data = { gbkCrew: {}, gbkSquad: {} };

  values.forEach(row => {
    const clanTag = row[0];
    const warId = row[1];
    if (!clanTag || !warId || warId.trim() === '') return;

    let targetClanData;
    if (clanTag === CLAN_TAGS.CREW) targetClanData = data.gbkCrew;
    else if (clanTag === CLAN_TAGS.SQUAD) targetClanData = data.gbkSquad;
    else return;

    if (!targetClanData[warId]) {
      targetClanData[warId] = {
        id: warId,
        tanggal: row[2],
        hasil: row[3],
        namaLawan: row[4],
        attacks: []
      };
    }

    targetClanData[warId].attacks.push({
      playerTag: row[5], playerName: row[6], playerTh: row[7], playerStatus: row[8], playerTarget: row[9], playerStars: row[10], playerPercentage: row[11],
      opponentTag: row[12], opponentName: row[13], opponentTh: row[14], opponentStatus: row[15], opponentTarget: row[16], opponentStars: row[17], opponentPercentage: row[18]
    });
  });
  return data;
}

/**
 * Mengambil dan memproses data dari sheet 'Arsip CWL'.
 */
function getArsipCwlData() {
  const values = getSheetDataAsObject('Arsip CWL');
  values.shift(); // Hapus header
  const data = { gbkCrew: {}, gbkSquad: {} };
  let currentMatch = null;

  values.forEach(row => {
    if (row[1] && typeof row[1] === 'string' && row[1].includes('--- START HARI KE-')) {
      const parts = row[1].split(' / ');
      const title = parts[0].replace('--- START ', '').replace(' ---', '').trim();
      const seasonId = parts[1].replace('MUSIM ', '').trim();
      const clanTag = parts[2].replace('CLAN ', '').replace('---', '').trim();

      let targetClanData;
      if (clanTag === CLAN_TAGS.CREW) targetClanData = data.gbkCrew;
      else if (clanTag === CLAN_TAGS.SQUAD) targetClanData = data.gbkSquad;
      else return;

      if (!targetClanData[seasonId]) {
        targetClanData[seasonId] = { id: seasonId, matches: [] };
      }
      
      currentMatch = { title: title, attacks: [] };
      targetClanData[seasonId].matches.push(currentMatch);

    } else if (currentMatch) {
      const clanTag = row[0];
      const seasonId = row[1];
      if (!clanTag || !seasonId || typeof seasonId !== 'string' || seasonId.trim() === '' || seasonId.includes('---')) return;
      
      // Menambahkan TH pemain dan musuh
      currentMatch.attacks.push({
        playerTag: row[3], playerName: row[4], playerTh: row[5], playerTarget: row[7], playerStars: row[8], playerPercentage: row[9],
        opponentTag: row[11], opponentName: row[12], opponentTh: row[13], opponentTarget: row[15], opponentStars: row[16], opponentPercentage: row[17]
      });
    }
  });
  return data;
}


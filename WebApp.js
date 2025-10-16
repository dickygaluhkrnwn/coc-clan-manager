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

// Fungsi utama untuk menampilkan web app
function doGet(e) {
  const html = HtmlService.createTemplateFromFile('index');
  const anggotaData = getSheetDataAsObject('Anggota');
  const partisipasiData = getSheetDataAsObject('Partisipasi');
  const logPerangData = getSheetDataAsObject('Log Perang');

  const data = {
    dashboard: getSheetDataAsObject('Dashboard'),
    anggota: splitDataByClan(anggotaData, 1), // Nama Klan di kolom ke-2 (index 1)
    partisipasi: splitDataByClan(partisipasiData, 4), // Nama Klan di kolom ke-5 (index 4)
    perang_aktif: getSheetDataAsObject('Perang Aktif'),
    log_perang: splitDataByClan(logPerangData, 1) // Nama Klan di kolom ke-2 (index 1)
  };
  html.data = data;
  return html.evaluate()
    .setTitle('GBK Management System')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Memisahkan data dari sebuah array 2D menjadi dua array berdasarkan nama klan.
 * @param {Array<Array<string>>} data Array 2D dari sheet.
 * @param {number} clanNameColumnIndex Index kolom yang berisi nama klan.
 * @returns {{gbkCrew: Array<Array<string>>, gbkSquad: Array<Array<string>>}} Objek berisi data yang sudah dipisah.
 */
function splitDataByClan(data, clanNameColumnIndex) {
  if (!data || data.length < 1) {
    return { gbkCrew: [], gbkSquad: [] };
  }
  const header = data[0];
  const gbkCrew = [header];
  const gbkSquad = [header];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row && row[clanNameColumnIndex]) {
      if (row[clanNameColumnIndex].trim() === 'GBK Crew') {
        gbkCrew.push(row);
      } else if (row[clanNameColumnIndex].trim() === 'GBK Squad') {
        gbkSquad.push(row);
      }
    }
  }
  return { gbkCrew, gbkSquad };
}

// Fungsi untuk mengambil semua data dari sheet tertentu sebagai array 2D
function getSheetDataAsObject(sheetName) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) {
      // Jika sheet tidak ditemukan, kembalikan array kosong agar tidak error
      return [
        [`Error: Sheet "${sheetName}" tidak ditemukan.`]
      ];
    }
    return sheet.getDataRange().getValues();
  } catch (e) {
    // Tangani error jika terjadi masalah saat membaca sheet
    Logger.log(`Error reading sheet ${sheetName}: ${e.toString()}`);
    return [
      [`Error saat membaca sheet: ${sheetName}`]
    ];
  }
}


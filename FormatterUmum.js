// SELURUH KODE LENGKAP - FormatterUmum.gs (V5.86 - Penambahan Format Dashboard)
/**
 * =================================================================
 * FORMATTERUMUM.GS: Berisi fungsi dasar, skema warna, dan format untuk
 * data statis (Anggota, Partisipasi, Dashboard).
 * * Catatan: File ini menggantikan sebagian fungsi dari SpreadsheetFormatter.gs.
 * =================================================================
 */

// ** FIX KRITIS: Memastikan objek global ada sebelum diperluas. **
// Kita gunakan deklarasi global yang aman, dan definisikan fungsi-fungsi satu per satu
// untuk menjamin semua properti dimuat, terlepas dari urutan pemuatan file.
var SpreadsheetFormatter = SpreadsheetFormatter || {};

// Objek SpreadsheetFormatter akan diperluas dengan fungsi-fungsi ini di runtime Apps Script.
SpreadsheetFormatter._applyBaseTheme = function(sheet, addFilter) {
    // Kita HAPUS CF setiap kali, karena aturan CF harus diperbarui jika ada klan baru.
    if (sheet.getFilter()) sheet.getFilter().remove();
    sheet.clearConditionalFormatRules();
    // Bersihkan latar belakang dan atur font dasar
    sheet.getRange("A1:Z1000").setBackground(null).setFontColor("#000000").setVerticalAlignment("middle");
    sheet.setFrozenRows(0);

    // Tambahkan filter jika diminta
    if (addFilter) {
        if (sheet.getLastRow() > 1) {
            const range = sheet.getDataRange();
            if (range.getFilter()) range.getFilter().remove();
            range.createFilter();
        }
    }
};

SpreadsheetFormatter._applyClanColorRules = function(sheet, bodyRange, tagColumnIndex = 1) {
    // Asumsi Utils.getAllClans() sudah tersedia dari Utilities.gs
    const allClans = Utils.getAllClans();
    const rules = [];
    const tagColumnLetter = String.fromCharCode(65 + tagColumnIndex - 1); // Konversi index ke huruf (1=A, 6=F)

    // Warna Klan 1 (Biru Tua)
    if (allClans.length > 0) {
        rules.push(SpreadsheetApp.newConditionalFormatRule()
            .whenFormulaSatisfied(`=$${tagColumnLetter}2="${allClans[0].tag}"`)
            .setBackground("#1a2c3a")
            .setFontColor("#FFFFFF")
            .setRanges([bodyRange]).build());
    }
    // Warna Klan 2 (Merah Tua)
    if (allClans.length > 1) {
        rules.push(SpreadsheetApp.newConditionalFormatRule()
            .whenFormulaSatisfied(`=$${tagColumnLetter}2="${allClans[1].tag}"`)
            .setBackground("#3a1a1a")
            .setFontColor("#FFFFFF")
            .setRanges([bodyRange]).build());
    }
    return rules;
};

SpreadsheetFormatter.formatMemberSheet = function(sheet) {
    this._applyBaseTheme(sheet, true);
    sheet.setFrozenRows(1);
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return;

    const dataRange = sheet.getRange(1, 1, lastRow, 13);
    dataRange.setFontColor("#FFFFFF");

    sheet.getRange(1, 1, lastRow, 4).setHorizontalAlignment("left");
    sheet.getRange(1, 5, lastRow, 13).setHorizontalAlignment("center");

    // Header
    sheet.getRange(1, 1, 1, 13).setBackground("#0d47a1").setFontWeight("bold").setHorizontalAlignment("center");

    // Tag Klan ada di Kolom A (Index 1)
    let rules = this._applyClanColorRules(sheet, sheet.getRange(2, 1, lastRow - 1, 13), 1);
    const roleRangeBody = sheet.getRange("E2:E" + lastRow);

    // CF berdasarkan Role
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('Leader').setFontColor('#FFD700').setBold(true).setRanges([roleRangeBody]).build());
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('Co-Leader').setFontColor('#4FC3F7').setBold(true).setRanges([roleRangeBody]).build());
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('Elder').setFontColor('#82b1ff').setBold(true).setRanges([roleRangeBody]).build());

    sheet.setConditionalFormatRules(rules);
    sheet.autoResizeColumns(1, 13);
};

SpreadsheetFormatter.formatParticipationSheet = function(sheet, lastRow) {
    this._applyBaseTheme(sheet, true);
    sheet.setFrozenRows(1);
    if (lastRow <= 1) return;

    const TOTAL_COLUMNS = 12;
    const bodyRange = sheet.getRange(2, 1, lastRow - 1, TOTAL_COLUMNS);

    // Header
    sheet.getRange(1, 1, 1, TOTAL_COLUMNS).setBackground("#333333").setFontWeight("bold").setFontColor("#FFFFFF").setHorizontalAlignment('center');

    // Data Body General Style
    bodyRange.setFontColor("#FFFFFF").setHorizontalAlignment('center');

    // Alignment
    sheet.getRange(2, 1, lastRow - 1, 1).setHorizontalAlignment('left'); // Nama Pemain
    sheet.getRange(2, 4, lastRow - 1, 1).setHorizontalAlignment('left'); // Tag Pemain
    sheet.getRange(2, 5, lastRow - 1, 1).setHorizontalAlignment('left'); // Nama Klan
    sheet.getRange(2, 12, lastRow - 1, 1).setHorizontalAlignment('left'); // Keterangan

    // Tag Klan ada di Kolom F (Index 6)
    let rules = this._applyClanColorRules(sheet, bodyRange, 6);

    // --- CF berdasarkan Status ---
    const statusRange = sheet.getRange(2, 11, lastRow - 1, 1); // Kolom K: STATUS

    // 1. Promosi (✔️)
    rules.push(SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo('✔️')
        .setBackground('#A5D6A7') // Light Green BG
        .setFontColor('#1B5E20') // Dark Green Text
        .setRanges([statusRange])
        .build());

    // 2. Demosi/Pelanggaran (🔴)
    rules.push(SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo('🔴')
        .setBackground('#EF9A9A') // Light Red BG
        .setFontColor('#B71C1C') // Dark Red Text
        .setRanges([statusRange])
        .build());

    // 3. Aman (🟢)
    rules.push(SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo('🟢')
        .setBackground('#BBDEFB') // Light Blue BG
        .setFontColor('#0D47A1') // Dark Blue Text
        .setRanges([statusRange])
        .build());

    sheet.setConditionalFormatRules(rules);
    sheet.autoResizeColumns(1, TOTAL_COLUMNS);
};

SpreadsheetFormatter.formatDashboardSheet = function(sheet) {
    this._applyBaseTheme(sheet, false); // Dashboard tidak memerlukan filter

    // Asumsi Utils.getAllClans() sudah tersedia dari Utilities.gs
    const allClans = Utils.getAllClans();
    
    // Warna Klan 1 (Biru Tua) dan Klan 2 (Merah Tua)
    // Warna ini diambil dari _applyClanColorRules untuk konsistensi
    const clan1Color = allClans.length > 0 ? "#1a2c3a" : "#333333";
    const clan2Color = allClans.length > 1 ? "#3a1a1a" : "#333333";
    
    const lastRow = sheet.getLastRow();
    
    // Atur alignment dasar
    sheet.getRange("A1:Z" + lastRow).setVerticalAlignment("middle");
    sheet.getRange("B6:K16").setHorizontalAlignment("center"); // Konten tabel
    sheet.getRange("B4:K4").setHorizontalAlignment("center"); // Header Klan
    
    // --- FORMAT KLAN 1 (GBK Crew - Kolom B hingga E) ---

    // 1. Header Klan (B4:E4)
    sheet.getRange("B4:E4").setBackground(clan1Color).setFontColor("#FFFFFF").setFontWeight("bold").setFontSize(12);

    // 2. RINGKASAN PERFORMA (B6:E9) - Termasuk Judul dan Data
    sheet.getRange("B6:E9").setBackground(clan1Color).setFontColor("#FFFFFF");
    sheet.getRange("B6:E6").setFontWeight("bold").setFontSize(11); // Judul sub-tabel
    
    // 3. CWL BULAN TERAKHIR (B10:E16) - Termasuk Judul dan Data
    sheet.getRange("B10:E16").setBackground(clan1Color).setFontColor("#FFFFFF");
    sheet.getRange("B10:E10").setFontWeight("bold").setFontSize(11); // Judul sub-tabel
    
    // --- FORMAT KLAN 2 (GBK Squad - Kolom H hingga K) ---

    // 1. Header Klan (H4:K4)
    sheet.getRange("H4:K4").setBackground(clan2Color).setFontColor("#FFFFFF").setFontWeight("bold").setFontSize(12);
    
    // 2. RINGKASAN PERFORMA (H6:K9) - Termasuk Judul dan Data
    sheet.getRange("H6:K9").setBackground(clan2Color).setFontColor("#FFFFFF");
    sheet.getRange("H6:K6").setFontWeight("bold").setFontSize(11); // Judul sub-tabel

    // 3. CWL BULAN TERAKHIR (H10:K16) - Termasuk Judul dan Data
    sheet.getRange("H10:K16").setBackground(clan2Color).setFontColor("#FFFFFF");
    sheet.getRange("H10:K10").setFontWeight("bold").setFontSize(11); // Judul sub-tabel

    // Judul Utama (Row 1)
    sheet.getRange("A1:L1").setBackground("#000000").setFontColor("#FFFFFF").setFontWeight("bold").setHorizontalAlignment("center").setFontSize(14);
    
    sheet.autoResizeColumns(1, 12);
};

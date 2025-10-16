// SELURUH KODE LENGKAP - FormatterLog.gs (V5.85 - FINAL FIX Modularity)
/**
 * =================================================================
 * FORMATTERLOG.GS: Berisi format untuk semua data Log, Arsip, dan Report Temporer
 * (War Log, Perang Aktif, Raid, CWL).
 * * Catatan: File ini melengkapi FormatterUmum.gs.
 * =================================================================
 */

// ** FIX KRITIS: Memastikan objek global ada sebelum diperluas. **
// Jika FormatterLog.gs dimuat sebelum FormatterUmum.gs, baris ini mencegah TypeError.
var SpreadsheetFormatter = SpreadsheetFormatter || {};

// Objek SpreadsheetFormatter akan diperluas dengan fungsi-fungsi ini di runtime Apps Script.
SpreadsheetFormatter.formatWarLogSheet = function(sheet) {
    SpreadsheetFormatter._applyBaseTheme(sheet, true);
    sheet.setFrozenRows(1);
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return;

    const dataRange = sheet.getRange(1, 1, lastRow, 11);
    dataRange.setFontColor("#FFFFFF");

    sheet.getRange(1, 1, lastRow, 2).setHorizontalAlignment("left");
    sheet.getRange(1, 4, lastRow, 7).setHorizontalAlignment("center");
    sheet.getRange(1, 10, lastRow, 1).setHorizontalAlignment("left");
    sheet.getRange(1, 11, lastRow, 1).setHorizontalAlignment("center").setNumberFormat('yyyy-MM-dd');

    // Header
    sheet.getRange(1, 1, 1, 11).setBackground("#333333").setFontWeight("bold").setHorizontalAlignment("center");

    let rules = SpreadsheetFormatter._applyClanColorRules(sheet, sheet.getRange(2, 1, lastRow - 1, 11), 1);
    const resultRange = sheet.getRange("D2:D" + lastRow);

    // CF berdasarkan Hasil War
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('win').setFontColor('#4CAF50').setBold(true).setRanges([resultRange]).build());
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('lose').setFontColor('#F44336').setRanges([resultRange]).build());
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('tie').setFontColor('#FFC107').setRanges([resultRange]).build());

    sheet.setConditionalFormatRules(rules);
    sheet.autoResizeColumns(1, 11);
};

SpreadsheetFormatter.formatActiveWarSheet = function(sheet, formatInstructions) {
    SpreadsheetFormatter._applyBaseTheme(sheet, false);
    const lastRow = sheet.getLastRow();
    if (lastRow < 1) return;

    const fullRange = sheet.getRange(1, 1, lastRow, 15);
    fullRange.setFontColor("#FFFFFF");

    const allClans = Utils.getAllClans();
    let primaryClanTag = allClans.length > 0 ? allClans[0].tag : null;
    let secondaryClanTag = allClans.length > 1 ? allClans[1].tag : null;

    // WARNA KLUB
    const colorKlan1Primary = '#1a2c3a'; // Biru Tua (Data Body)
    const colorKlan1Secondary = '#263e50'; // Biru Lebih Muda (Data Body Selang-seling)
    const colorKlan1Header = '#0d47a1'; // Biru Tua (Header Kolom & Header Utama)

    const colorKlan2Primary = '#3a1a1a'; // Merah Tua (Data Body)
    const colorKlan2Secondary = '#4d2323'; // Merah Lebih Muda
    const colorKlan2Header = '#b71c1c'; // Merah Tua (Header Kolom & Header Utama)

    const colorFallbackPrimary = '#333333';
    const colorFallbackSecondary = '#444444';
    const colorFallbackHeader = '#333333';
    const fontColor = '#FFFFFF';

    let currentColorPrimary = colorFallbackPrimary;
    let currentColorSecondary = colorFallbackSecondary;
    let dynamicHeaderColor = colorFallbackHeader;
    let dataRowCounter = 0; // Counter baris data di dalam blok
    let inDataBlock = false;

    // Membaca semua data dari sheet
    const data = sheet.getRange(1, 1, lastRow, 15).getValues();

    let rules = [];

    data.forEach((row, i) => {
        const rowIndex = i + 1;
        const rowString = String(row[0]).toUpperCase();
        const rowRange = sheet.getRange(rowIndex, 1, 1, 15);

        if (rowString.startsWith('⚔️')) {
            // --- START HEADER UTAMA ---
            // Reset counter dan status
            dataRowCounter = 0;
            inDataBlock = false;

            // Ekstrak tag klan kita dari header (asumsi format header: ⚔️ NAMA KITA (TYPE) vs NAMA LAWAN (#TAG LAWAN))
            const ourClanNameMatch = row[0].match(/⚔️\s*(.*?)\s*\(/);
            const ourClanName = ourClanNameMatch ? ourClanNameMatch[1].trim().toUpperCase() : null;
            const foundClan = allClans.find(c => c.name.toUpperCase() === ourClanName);
            const currentClanTag = foundClan ? foundClan.tag : null;

            // Set warna klan untuk block data berikutnya
            if (currentClanTag === primaryClanTag) {
                currentColorPrimary = colorKlan1Primary;
                currentColorSecondary = colorKlan1Secondary;
                dynamicHeaderColor = colorKlan1Header;
            } else if (currentClanTag === secondaryClanTag) {
                currentColorPrimary = colorKlan2Primary;
                currentColorSecondary = colorKlan2Secondary;
                dynamicHeaderColor = colorKlan2Header;
            } else {
                currentColorPrimary = colorFallbackPrimary;
                currentColorSecondary = colorFallbackSecondary;
                dynamicHeaderColor = colorFallbackHeader;
            }

            // Format Header Utama War
            rowRange.merge().setBackground(dynamicHeaderColor).setFontColor(fontColor).setFontWeight('bold').setFontSize(12).setHorizontalAlignment('center');

        } else if (rowString === 'TAG') {
            // --- START HEADER KOLOM (Tag, Nama, TH...) ---
            inDataBlock = true;

            // Format Header Kolom
            rowRange.setFontWeight('bold').setHorizontalAlignment('center');
            sheet.getRange(rowIndex, 1, 1, 7).setBackground(dynamicHeaderColor); // Our Side
            sheet.getRange(rowIndex, 9, 1, 7).setBackground(dynamicHeaderColor); // Opponent Side
            sheet.getRange(rowIndex, 8).setBackground('#000000'); // Separator Black

        } else if (inDataBlock && rowString.startsWith('#')) {
            // --- START DATA BODY ---
            // Gunakan counter baris data untuk selang-seling warna
            let rowColor = (dataRowCounter % 2 === 0) ? currentColorPrimary : currentColorSecondary;

            // Terapkan warna langsung dan warna font
            sheet.getRange(rowIndex, 1, 1, 15).setFontColor(fontColor).setHorizontalAlignment('center');

            // Warna Latar Belakang Body
            sheet.getRange(rowIndex, 1, 1, 7).setBackground(rowColor); // Our Side
            sheet.getRange(rowIndex, 9, 1, 7).setBackground(rowColor); // Opponent Side
            sheet.getRange(rowIndex, 8).setBackground('#000000'); // Separator Black

            // Penyelarasan Kiri untuk Nama dan Tag (Ulangi di sini agar diterapkan di baris data)
            sheet.getRange(rowIndex, 1, 1, 2).setHorizontalAlignment('left');
            sheet.getRange(rowIndex, 5, 1, 1).setHorizontalAlignment('left'); // Target Kita
            sheet.getRange(rowIndex, 9, 1, 2).setHorizontalAlignment('left');
            sheet.getRange(rowIndex, 13, 1, 1).setHorizontalAlignment('left'); // Target Lawan

            dataRowCounter++;
        } else if (rowString.includes('SEDANG TIDAK DALAM PERANG')) {
            // Status Not In War/Peace
            rowRange.merge().setBackground('#212121').setFontColor('#9E9E9E').setHorizontalAlignment('center');
            inDataBlock = false;
        } else if (inDataBlock && rowString === '') {
            // Baris pemisah antara blok War
            inDataBlock = false;
        }
    });

    // --- CF untuk Status Serangan (✔️ / ❌) ---
    const lastDataRow = sheet.getLastRow();
    const ourStatusRange = sheet.getRange(1, 4, lastDataRow, 1);
    const oppStatusRange = sheet.getRange(1, 12, lastDataRow, 1);
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextStartsWith('✔️').setFontColor('#81C784').setRanges([ourStatusRange, oppStatusRange]).build());
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextStartsWith('❌').setFontColor('#E57373').setRanges([ourStatusRange, oppStatusRange]).build());
    sheet.setConditionalFormatRules(rules);


    // --- FIX LEBAR KOLOM PERANG AKTIF ---
    const TAG_WIDTH = 90;
    sheet.setColumnWidth(1, TAG_WIDTH);    // Kolom A: Tag Kita
    sheet.setColumnWidth(9, TAG_WIDTH);    // Kolom I: Tag Lawan

    // Auto-resize kolom lainnya
    sheet.autoResizeColumns(2, 7);  // Nama Kita, TH, Status, Target, Bintang, Persen (Kolom B-H)
    sheet.autoResizeColumns(10, 7); // Nama Lawan, TH, Status, Target, Bintang, Persen (Kolom J-O)

    // Kolom pemisah (H) diset lebar kecil (misalnya 10)
    sheet.setColumnWidth(8, 10);
};

SpreadsheetFormatter.formatRaidArchiveSheet = function(sheet) {
    SpreadsheetFormatter._applyBaseTheme(sheet, true);
    sheet.setFrozenRows(1);
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return;

    const dataRange = sheet.getRange(1, 1, lastRow, 8);
    dataRange.setFontColor("#FFFFFF");

    sheet.getRange(1, 1, lastRow, 2).setHorizontalAlignment("left");
    sheet.getRange(1, 3, lastRow, 1).setHorizontalAlignment("left");
    sheet.getRange(1, 4, lastRow, 1).setHorizontalAlignment("center").setNumberFormat('yyyy-MM-dd'); // Format Tanggal
    sheet.getRange(1, 5, lastRow, 2).setHorizontalAlignment("left");
    sheet.getRange(1, 7, lastRow, 2).setHorizontalAlignment("center");

    // Header
    sheet.getRange(1, 1, 1, 8).setBackground("#333333").setFontWeight("bold").setHorizontalAlignment("center");

    let rules = SpreadsheetFormatter._applyClanColorRules(sheet, sheet.getRange(2, 1, lastRow - 1, 8), 1);
    sheet.setConditionalFormatRules(rules);
    sheet.autoResizeColumns(1, 8);
};

SpreadsheetFormatter.formatDetailedRaidReportSheet = function(sheet) {
    SpreadsheetFormatter._applyBaseTheme(sheet, false);
    const lastRow = sheet.getLastRow();
    if (lastRow < 1) return;

    const TOTAL_COLS = 6;
    const data = sheet.getRange(1, 1, lastRow, TOTAL_COLS).getValues();
    const allClans = Utils.getAllClans();

    let currentClanTag = null;
    let primaryClanTag = allClans.length > 0 ? allClans[0].tag : null;
    let secondaryClanTag = allClans.length > 1 ? allClans[1].tag : null;

    // WARNA KLUB
    const colorKlan1Primary = '#1a2c3a'; // Biru Tua (Data Body)
    const colorKlan1Secondary = '#263e50'; // Biru Lebih Muda (Data Body Selang-seling)
    const colorKlan1Header = '#0d47a1'; // Biru Tua (Header Kolom & Header Utama)

    const colorKlan2Primary = '#3a1a1a'; // Merah Tua (Data Body)
    const colorKlan2Secondary = '#4d2323'; // Merah Lebih Muda
    const colorKlan2Header = '#b71c1c'; // Merah Tua (Header Kolom & Header Utama)

    const colorFallbackPrimary = '#333333';
    const colorFallbackSecondary = '#444444';
    const colorFallbackHeader = '#333333';
    const fontColor = '#FFFFFF';

    let currentColorPrimary = colorFallbackPrimary;
    let currentColorSecondary = colorFallbackSecondary;
    let dynamicHeaderColor = colorFallbackHeader;
    let dataRowCounter = 0; // Counter baris data di dalam blok
    let inDataBlock = false;

    data.forEach((row, i) => {
        const rowIndex = i + 1;
        const rowRange = sheet.getRange(rowIndex, 1, 1, TOTAL_COLS);

        if (String(row[0]).startsWith('🏆 PERFORMA RAID:')) {
            // --- START HEADER UTAMA ---
            // Reset counter dan status
            dataRowCounter = 0;
            inDataBlock = false;

            const clanNameMatch = row[0].match(/PERFORMA RAID: ([\w\s]+) \(/);
            const currentClanName = clanNameMatch ? clanNameMatch[1].trim().toUpperCase() : null;
            const foundClan = allClans.find(c => c.name.toUpperCase() === currentClanName);
            currentClanTag = foundClan ? foundClan.tag : null;

            // Set warna klan untuk block data berikutnya
            if (currentClanTag === primaryClanTag) {
                currentColorPrimary = colorKlan1Primary;
                currentColorSecondary = colorKlan1Secondary;
                dynamicHeaderColor = colorKlan1Header; // Header Biru Tua (Klan 1)
            } else if (currentClanTag === secondaryClanTag) {
                currentColorPrimary = colorKlan2Primary;
                currentColorSecondary = colorKlan2Secondary;
                dynamicHeaderColor = colorKlan2Header; // Header Merah Tua (Klan 2)
            } else {
                currentColorPrimary = colorFallbackPrimary;
                currentColorSecondary = colorFallbackSecondary;
                dynamicHeaderColor = colorFallbackHeader;
            }

            // Perbaikan KRITIS: Terapkan dynamicHeaderColor (warna klan) untuk header utama
            rowRange.merge().setBackground(dynamicHeaderColor).setFontColor(fontColor).setFontWeight('bold').setFontSize(12).setHorizontalAlignment('center');

        } else if (String(row[0]) === 'Peringkat') {
            // --- START HEADER KOLOM ---
            inDataBlock = true;
            // Terapkan warna header dinamis yang sudah ditentukan (Biru Tua/Merah Tua/Fallback)
            rowRange.setBackground(dynamicHeaderColor).setFontColor(fontColor).setFontWeight('bold').setHorizontalAlignment('center');
            sheet.getRange(rowIndex, 6).setNumberFormat('#,##0');

        } else if (inDataBlock && typeof row[0] === 'number') {
            // --- START DATA BODY ---
            // Gunakan counter baris data untuk selang-seling warna
            let rowColor = (dataRowCounter % 2 === 0) ? currentColorPrimary : currentColorSecondary;

            // Terapkan warna langsung dan warna font
            rowRange.setBackground(rowColor).setFontColor(fontColor).setHorizontalAlignment('center');

            // Terapkan kembali Alignment khusus
            sheet.getRange(rowIndex, 2).setHorizontalAlignment('left'); // Nama Pemain
            sheet.getRange(rowIndex, 3).setHorizontalAlignment('left'); // Tag

            dataRowCounter++;
        } else if (inDataBlock && !row[0] && !row[1]) {
            // Baris kosong di akhir blok (Baris Pemisah)
            inDataBlock = false;
        }
    });

    sheet.autoResizeColumns(1, TOTAL_COLS);
};

SpreadsheetFormatter.formatCwlReportSheet = function(sheet) {
    SpreadsheetFormatter._applyBaseTheme(sheet, false);
    const lastRow = sheet.getLastRow();
    if (lastRow < 1) return;

    const fullRange = sheet.getRange(1, 1, lastRow, 15);
    fullRange.setFontColor('#FFFFFF').setVerticalAlignment('middle');

    const data = sheet.getRange(1, 1, lastRow, 15).getValues();
    data.forEach((row, i) => {
        const rowIndex = i + 1;
        if (String(row[0]).startsWith('HARI KE-')) {
            sheet.getRange(rowIndex, 1, 1, 15).merge().setBackground('#004d40').setFontWeight('bold').setHorizontalAlignment('center');
        } else if (String(row[0]).startsWith('⚔️')) {
            sheet.getRange(rowIndex, 1, 1, 7).merge().setBackground('#0d47a1').setFontWeight('bold').setHorizontalAlignment('center');
            sheet.getRange(rowIndex, 9, 1, 7).merge().setBackground('#b71c1c').setFontWeight('bold').setHorizontalAlignment('center');
        } else if (row[0] === 'Tag') {
            const headerRow = sheet.getRange(rowIndex, 1, 1, 15);
            headerRow.setFontWeight('bold').setHorizontalAlignment('center');
            headerRow.setBackground(null);
            sheet.getRange(rowIndex, 1, 1, 7).setBackground('#0d47a1');
            sheet.getRange(rowIndex, 9, 1, 7).setBackground('#b71c1c');
        } else if (String(row[0]).startsWith('#')) {
            const dataRow = sheet.getRange(rowIndex, 1, 1, 15);
            dataRow.setHorizontalAlignment('center');
            sheet.getRange(rowIndex, 1, 1, 2).setHorizontalAlignment('left');
            sheet.getRange(rowIndex, 5, 1, 1).setHorizontalAlignment('left');
            sheet.getRange(rowIndex, 9, 1, 2).setHorizontalAlignment('left');
            sheet.getRange(rowIndex, 13, 1, 1).setHorizontalAlignment('left');

            // Pewarnaan Body (tidak pakai CF karena ini sheet temporer)
            dataRow.setBackground(null);
            sheet.getRange(rowIndex, 1, 1, 7).setBackground('#1a2c3a');
            sheet.getRange(rowIndex, 9, 1, 7).setBackground('#3a1a1a');
        }
    });

    // CF untuk status serangan
    const rules = [];
    const ourStatusRange = sheet.getRange("D1:D" + lastRow);
    const opponentStatusRange = sheet.getRange("L1:L" + lastRow);
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextStartsWith('✔️').setFontColor('#81C784').setRanges([ourStatusRange, opponentStatusRange]).build());
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextStartsWith('❌').setFontColor('#E57373').setRanges([ourStatusRange, opponentStatusRange]).build());
    sheet.setConditionalFormatRules(rules);

    // Fix lebar kolom
    const TAG_WIDTH = 90;
    sheet.setColumnWidth(1, TAG_WIDTH);
    sheet.setColumnWidth(9, TAG_WIDTH);
    sheet.autoResizeColumns(1, 15);
};

SpreadsheetFormatter.formatCwlArchiveSheet = function(sheet) {
    SpreadsheetFormatter._applyBaseTheme(sheet, false);
    sheet.setFrozenRows(1);
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    if (lastRow <= 1) return;

    // Header
    sheet.getRange(1, 1, 1, 18).setBackground("#333333").setFontWeight("bold").setHorizontalAlignment("center").setFontColor("#FFFFFF");

    // Rentang body difokuskan pada data yang ada
    const bodyRange = sheet.getRange(2, 1, lastRow - 1, 18);
    bodyRange.setFontColor("#FFFFFF").setHorizontalAlignment('center');

    // Penyelarasan Teks
    sheet.getRange(2, 1, lastRow - 1, 1).setHorizontalAlignment('left'); // Tag Klan
    sheet.getRange(2, 4, lastRow - 1, 2).setHorizontalAlignment('left'); // Tag & Nama Kita
    sheet.getRange(2, 12, lastRow - 1, 2).setHorizontalAlignment('left'); // Tag & Nama Lawan

    let rules = SpreadsheetFormatter._applyClanColorRules(sheet, bodyRange, 1); // Tag Klan ada di Kolom A

    // Aturan CF untuk mewarnai baris separator (persisten)
    const separatorCF = SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied(`=REGEXMATCH($B2, "--- START")`)
        .setBackground("#004d40") // Hijau Tua
        .setFontColor('#FFC107')    // Kuning Terang (Fix Kontras)
        .setRanges([sheet.getRange(2, 1, lastRow - 1, 18)])
        .build();
    rules.push(separatorCF);

    sheet.setConditionalFormatRules(rules);

    // *** FIX KONTRAST LANGSUNG (Force Font Color) ***
    // Menambahkan setFontWeight secara manual karena CF tidak mendukungnya di chaining
    const data = sheet.getRange(2, 2, lastRow - 1, 1).getValues().flat();
    data.forEach((value, index) => {
        if (String(value).startsWith('--- START')) {
            const row = index + 2;
            sheet.getRange(row, 1, 1, 18).setFontWeight('bold');
        }
    });

    // --- Perbaikan Lebar Kolom ---
    const TAG_WIDTH = 90;
    sheet.setColumnWidth(4, TAG_WIDTH);  // Kolom D (Tag Pemain Kita)
    sheet.setColumnWidth(12, TAG_WIDTH); // Kolom L (Tag Pemain Lawan)

    sheet.autoResizeColumns(1, lastCol);
};

SpreadsheetFormatter.formatClassicWarArchiveSheet = function(sheet) {
    SpreadsheetFormatter._applyBaseTheme(sheet, false);
    sheet.setFrozenRows(1);
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();

    // TOTAL_COLUMNS seharusnya 19. Kita gunakan Max(19, lastCol) untuk memastikan range aman.
    const FORMAT_WIDTH = Math.max(19, lastCol);
    if (lastRow <= 1) return;

    // Header
    sheet.getRange(1, 1, 1, FORMAT_WIDTH).setBackground("#333333").setFontWeight("bold").setHorizontalAlignment("center").setFontColor("#FFFFFF");

    // Rentang body difokuskan pada format width
    const bodyRange = sheet.getRange(2, 1, lastRow - 1, FORMAT_WIDTH);
    bodyRange.setFontColor("#FFFFFF").setHorizontalAlignment('center');

    // CF Persisten Warna Klan (Tag Klan ada di Kolom A)
    let rules = SpreadsheetFormatter._applyClanColorRules(sheet, bodyRange, 1);

    // Aturan CF Header War Classic (Ungu Persisten)
    // Kita menggunakan REGEXMATCH($A2, "⚔️") karena War Header ditulis ke Kolom A
    const headerCF = SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied(`=REGEXMATCH($A2, "⚔️")`) // Kolom A dimulai dengan ⚔️
        .setBackground("#4a148c") // Ungu Tua
        .setFontColor('#FFC107')    // Kuning Terang
        .setRanges([sheet.getRange(2, 1, lastRow - 1, FORMAT_WIDTH)])
        .build();
    rules.push(headerCF);

    // Aturan CF untuk Result (Win/Loss/Tie)
    const resultRange = sheet.getRange(2, 4, lastRow - 1, 1); // Kolom D: Hasil
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('win').setFontColor('#4CAF50').setRanges([resultRange]).build());
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('lose').setFontColor('#F44336').setRanges([resultRange]).build());
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('tie').setFontColor('#FFC107').setRanges([resultRange]).build());

    sheet.setConditionalFormatRules(rules);

    // === FIX KRITIS: MEMASTIKAN HEADER WAR TERBACA JIKA CF GAGAL (Tambahkan Pengecekan Langsung) ===
    // Membaca data kembali dan menerapkan format langsung ke baris header.
    const data = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
    data.forEach((value, index) => {
        // Jika kolom A dimulai dengan ⚔️, terapkan format secara langsung
        if (String(value).startsWith('⚔️')) {
            const row = index + 2;
            sheet.getRange(row, 1, 1, FORMAT_WIDTH)
                .setBackground('#4a148c') // Ungu Tua
                .setFontColor('#FFC107') // Kuning Terang
                .setFontWeight('bold');
        }
    });

    // --- Penyelarasan Teks ---
    sheet.getRange(1, 1, lastRow, 2).setHorizontalAlignment("left"); // Tag & ID War
    sheet.getRange(1, 6, lastRow, 2).setHorizontalAlignment("left"); // Tag & Nama Kita
    sheet.getRange(1, 13, lastRow, 2).setHorizontalAlignment("left"); // Tag & Nama Lawan

    // --- Perbaikan Lebar Kolom ---
    const TAG_WIDTH = 90;
    sheet.setColumnWidth(2, 180); // Kolom B: ID War
    sheet.setColumnWidth(6, TAG_WIDTH); // Kolom F: Tag Kita
    sheet.setColumnWidth(13, TAG_WIDTH); // Kolom M: Tag Lawan

    sheet.autoResizeColumns(1, FORMAT_WIDTH); // Auto-resize semua kolom yang ada
};

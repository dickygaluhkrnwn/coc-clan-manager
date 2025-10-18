// SELURUH KODE LENGKAP - KodeUtama.gs (V5.91 - Refactor Menu Singkat)
/**
 * =================================================================
 * KODEUTAMA.GS: Berisi Fungsi Utama (onOpen) dan Logika Arsip/Update Non-Laporan.
 * * Catatan: File ini bergantung pada Konstanta.gs, API_Coc.gs, dan Utilities.gs.
 * =================================================================
 */

function onOpen() {
    // Fungsi ini membuat menu kustom di Google Sheets saat spreadsheet dibuka.
    const ui = SpreadsheetApp.getUi();
    
    // Menu utama
    const menu = ui.createMenu('⚔️ Sistem Klan');

    // --- 1. Sub-Menu Aksi Cepat & Refresh ---
    const actionMenu = ui.createMenu('🔄 Sinkronisasi & Refresh');
    actionMenu.addItem('🚀 Sinkronisasi Lengkap', 'fullDataRefresh'); // Semua data & laporan
    actionMenu.addItem('👥 Update Anggota Saja', 'updateAllMembers'); // Hanya Anggota & Donasi
    actionMenu.addItem('📊 Refresh Dashboard Saja', 'Laporan_buildDashboard'); // Membangun Dashboard berdasarkan data yang sudah ada
    menu.addSubMenu(actionMenu);

    menu.addSeparator();
    
    // --- 2. Sub-Menu Laporan & Analisis ---
    const reportsMenu = ui.createMenu('📋 Laporan & Analisis');
    reportsMenu.addItem('Status War Aktif', 'updateCurrentWar'); // Lebih ringkas dari sebelumnya
    reportsMenu.addItem('Raid Capital Terbaru', 'generateDetailedRaidReport'); // Disingkat
    reportsMenu.addItem('Rekap CWL Musim Terakhir', 'rekapitulasiCWL'); // Disingkat
    reportsMenu.addItem('Evaluasi Partisipasi', 'getParticipationReport'); // Disingkat
    menu.addSubMenu(reportsMenu);

    menu.addSeparator();

    // --- 3. Sub-Menu Administrasi (Arsip & Pengaturan) ---
    const adminMenu = ui.createMenu('⚙️ Administrasi Sistem');
    
    // Pengarsipan
    const archiveMenu = ui.createMenu('🗄️ Arsipkan Laporan');
    archiveMenu.addItem('Arsipkan Laporan Raid', 'archiveRaidReport');
    archiveMenu.addItem('Arsipkan Rekap CWL', 'archiveCwlData');
    archiveMenu.addItem('Arsipkan Detail War Classic', 'archiveClassicWarData');
    adminMenu.addSubMenu(archiveMenu);
    
    adminMenu.addSeparator();
    
    // Pengaturan
    adminMenu.addItem('🔑 Atur API & Webhook', 'setGlobalProperties');
    adminMenu.addItem('⏰ Atur Otomatisasi Harian', 'setupAutomaticTriggers');
    menu.addSubMenu(adminMenu);

    menu.addToUi();
}

/**
 * Fungsi utama untuk melakukan sinkronisasi data non-War (hanya data anggota).
 * Log War dipindahkan ke updateCurrentWar() agar lebih logis.
 */
function fullDataRefresh() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ss.toast('Memulai sinkronisasi semua data klan...', '🚀 SINKRONISASI', -1);
    
    // 1. Ambil data dasar (Anggota)
    updateAllMembers(true); // Kirim flag untuk menekan toast individu
    
    // 2. Ambil data Laporan (yang juga melakukan fetching API)
    updateCurrentWar(); // Mencakup Log Perang dan Perang Aktif
    generateDetailedRaidReport(); // Mencakup Raid Terbaru
    
    // 3. Bangun Laporan Agregasi (berdasarkan data yang baru di-fetch)
    rekapitulasiCWL();
    getParticipationReport();
    
    // 4. Update Dashboard (Fungsi buildDashboard akan dipanggil di sini setelah selesai)
    Laporan_buildDashboard(); // Memanggil fungsi dari Laporan.gs

    ss.toast('✅ Sinkronisasi dan pembaruan laporan selesai!', 'SELESAI', 5);
}

/**
 * Fungsi placeholder untuk membangun Dashboard (sudah diganti nama ke Laporan_buildDashboard).
 * Note: Fungsi ini tidak lagi digunakan, tapi dipertahankan untuk referensi.
 */
function buildDashboard() {
    Laporan_buildDashboard();
}

/**
 * Mengambil data anggota terbaru untuk semua klan dan menuliskannya ke sheet Anggota.
 * @param {boolean} [suppressToast=false] - Menekan notifikasi sukses jika dipanggil dari fungsi lain.
 */
function updateAllMembers(suppressToast = false) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAMES.ANGGOTA);
    if (!sheet) { ss.toast(`Sheet "${SHEET_NAMES.ANGGOTA}" tidak ditemukan.`); return; }
    ss.toast('Mengambil data anggota untuk semua klan...');
    const allClans = Utils.getAllClans();
    if (allClans.length === 0) return;
    const headers = ["Tag Klan", "Nama Klan", "Tag", "Nama", "Role", "Level TH", "Donasi", "Donasi Diterima", "Level XP", "League", "Poin War Bintang", "Trophy", "Tag Terakhir Online"];
    const combinedData = [];
    allClans.forEach(clan => {
        const endpoint = `clans/${encodeURIComponent(clan.tag)}`;
        const clanData = CocApi._fetch(endpoint, true);
        if (clanData && clanData.memberList) {
            clanData.memberList.sort((a, b) => Utils.memberSorter(a, b, 'default')).forEach(member => {
                
                // Defensif check untuk Level TH
                const thLevel = member.townhallLevel || member.townHallLevel || 'N/A';

                combinedData.push([clan.tag, clan.name, member.tag, member.name, Utils.formatRoleName(member.role), thLevel, member.donations || 0, member.donationsReceived || 0, member.expLevel || 'N/A', member.league ? member.league.name : 'Unranked', member.warStars || 0, member.trophies || 0, 'N/A']);
            });
        }
    });
    sheet.clear();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    if (combinedData.length > 0) { sheet.getRange(2, 1, combinedData.length, headers.length).setValues(combinedData); }
    SpreadsheetFormatter.formatMemberSheet(sheet);
    
    if (!suppressToast) {
        ss.toast('✅ Data anggota selesai diperbarui!', 'SELESAI', 5);
    }
}

/**
 * Mengambil log perang terbaru untuk semua klan dan menuliskannya ke sheet Log Perang.
 * Fungsi ini dipanggil dari updateCurrentWar().
 */
function updateAllWarLogs() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAMES.LOG_PERANG);
    if (!sheet) { ss.toast(`Sheet "${SHEET_NAMES.LOG_PERANG}" tidak ditemukan.`); return; }
    ss.toast('Mengambil log perang untuk semua klan...');
    const allClans = Utils.getAllClans();
    if (allClans.length === 0) return;
    const headers = ["Tag Klan", "Nama Klan", "ID War", "Hasil", "Ukuran Tim", "Bintang Kita", "Persen Kita", "Bintang Lawan", "Persen Lawan", "Nama Lawan", "Tanggal Selesai"];
    const combinedData = [];
    allClans.forEach(clan => {
        const endpoint = `clans/${encodeURIComponent(clan.tag)}/warlog`;
        const warLogData = CocApi._fetch(endpoint, true);
        if (warLogData && warLogData.items) {
            warLogData.items.forEach(war => {
                if (war.clan && war.opponent && war.endTime) {
                    if (war.teamSize && war.teamSize * 3 < (parseInt(war.clan.stars) || 0)) return;
                    const endDate = Utils.cocDateToJsDate(war.endTime);
                    const warId = Utils.generateWarId(clan.tag, endDate, war.opponent.name);
                    combinedData.push([
                        clan.tag, clan.name, warId, war.result, war.teamSize,
                        parseInt(war.clan.stars) || 0, war.clan.destructionPercentage,
                        parseInt(war.opponent.stars) || 0, war.opponent.destructionPercentage,
                        war.opponent.name, endDate
                    ]);
                }
            });
        }
    });
    
    combinedData.sort((a, b) => b[10] - a[10]);
    sheet.clear();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    if (combinedData.length > 0) {
        const dataRange = sheet.getRange(2, 1, combinedData.length, headers.length);
        dataRange.setValues(combinedData);
        
        // --- START PERBAIKAN FORMAT ---
        // Atur format angka untuk kolom bintang (kolom ke-6 dan ke-8) menjadi angka biasa.
        sheet.getRange(2, 6, combinedData.length).setNumberFormat('0');
        sheet.getRange(2, 8, combinedData.length).setNumberFormat('0');
        // Atur format untuk kolom persentase (kolom ke-7 dan ke-9)
        sheet.getRange(2, 7, combinedData.length).setNumberFormat('0.00');
        sheet.getRange(2, 9, combinedData.length).setNumberFormat('0.00');
        // --- END PERBAIKAN FORMAT ---
    }
    SpreadsheetFormatter.formatWarLogSheet(sheet);
}


// === FUNGSI ARSIP & PENGATURAN ===

/**
 * Mengarsipkan laporan Raid terbaru yang ada di sheet Raid Terbaru ke Arsip Raid.
 */
function archiveRaidReport() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const reportSheet = ss.getSheetByName(SHEET_NAMES.RAID_TERBARU);
    if (!reportSheet || reportSheet.getLastRow() < 2) {
        SpreadsheetApp.getUi().alert("Tidak ada laporan untuk diarsipkan.");
        return;
    }
    const archiveSheet = ss.getSheetByName(SHEET_NAMES.ARSIP_RAID) || ss.insertSheet(SHEET_NAMES.ARSIP_RAID);
    const headers = ["Tag Klan", "Nama Klan", "ID Raid", "Tanggal Arsip", "Tag Pemain", "Nama Pemain", "Total Jarahan", "Jml Serangan"];
    if (archiveSheet.getLastRow() === 0) {
        archiveSheet.clear();
        archiveSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
    ss.toast("Memulai pengarsipan...", "ARSIP", -1);
    const reportData = reportSheet.getDataRange().getValues();
    const archiveData = [];
    const allClans = Utils.getAllClans();
    let currentClan = null;
    let raidDate = null;
    reportData.forEach(row => {
        if (row[0] && String(row[0]).includes("PERFORMA RAID")) {
            const clanNameMatch = row[0].match(/PERFORMA RAID: ([\w\s]+) \(/);
            const dateMatch = row[0].match(/\(([^)]+)\)/);
            if (clanNameMatch && dateMatch) {
                const clanName = clanNameMatch[1].trim();
                currentClan = allClans.find(c => c.name.toUpperCase() === clanName.toUpperCase());
                raidDate = dateMatch[1];
            }
        } else if (currentClan && typeof row[0] === 'number') {
            const raidId = `${currentClan.tag}-${raidDate}`;
            archiveData.push([currentClan.tag, currentClan.name, raidId, new Date(raidDate), row[2], row[1], row[3], row[4]]);
        }
    });

    const existingRaidIds = archiveSheet.getLastRow() > 1 ? archiveSheet.getRange(2, 3, archiveSheet.getLastRow() - 1, 1).getValues().flat() : [];
    const newArchiveData = archiveData.filter(row => !existingRaidIds.includes(row[2]));

    if (newArchiveData.length > 0) {
        archiveSheet.getRange(archiveSheet.getLastRow() + 1, 1, newArchiveData.length, headers.length).setValues(newArchiveData);
        SpreadsheetFormatter.formatRaidArchiveSheet(archiveSheet);
        ss.toast(`✅ Berhasil mengarsipkan ${newArchiveData.length} data raid baru.`);
    } else {
        ss.toast("Tidak ada data baru untuk diarsipkan.");
    }
    const response = SpreadsheetApp.getUi().alert('Arsip Selesai', 'Hapus laporan temporer?', SpreadsheetApp.getUi().ButtonSet.YES_NO);
    if (response == SpreadsheetApp.getUi().Button.YES) {
        ss.deleteSheet(reportSheet);
    }
}

/**
 * Mengarsipkan laporan CWL dari sheet CWL - [Nama Klan] ke Arsip CWL.
 */
function archiveCwlData() {
    const ui = SpreadsheetApp.getUi();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    const allClans = Utils.getAllClans();
    const reportsToArchive = allClans
        .map(clan => ({ name: clan.name, tag: clan.tag, sheet: ss.getSheetByName(`CWL - ${clan.name}`) }))
        .filter(report => report.sheet !== null && report.sheet.getLastRow() > 3);

    if (reportsToArchive.length === 0) {
        ui.alert("Tidak ada Laporan CWL yang siap diarsipkan.");
        return;
    }

    const seasonPrompt = ui.prompt("Masukkan ID Musim", "Masukkan ID Musim CWL (Contoh: October 2025)", ui.ButtonSet.OK_CANCEL);
    if (seasonPrompt.getSelectedButton() !== ui.Button.OK || !seasonPrompt.getResponseText()) {
        return;
    }
    const seasonId = seasonPrompt.getResponseText().trim();

    const archiveSheet = ss.getSheetByName(SHEET_NAMES.ARSIP_CWL) || ss.insertSheet(SHEET_NAMES.ARSIP_CWL);
    
    const archiveHeaders = ["Tag Klan", "ID Musim", "Tanggal Arsip", "Tag", "Nama", "TH", "Status", "Target", "Bintang", "Persen", "", "Tag Lawan", "Nama Lawan", "TH Lawan", "Status Lawan", "Target Lawan", "Bintang Lawan", "Persen Lawan"];
    if (archiveSheet.getLastRow() === 0) {
        archiveSheet.appendRow(archiveHeaders);
    }

    const isOldFormatDetected = archiveSheet.getLastRow() > 1 && String(archiveSheet.getRange('A2').getValue()).trim() === "";
    
    if (isOldFormatDetected) {
        const migrationResponse = ui.alert('Migrasi Arsip CWL',
            "Format arsip CWL lama terdeteksi. Apakah Anda ingin membersihkan arsip dan menggantinya dengan data dari laporan baru yang sudah rapi? Tindakan ini akan menghapus semua data di 'Arsip CWL' secara permanen.",
            ui.ButtonSet.YES_NO
        );
        if (migrationResponse === ui.Button.YES) {
            archiveSheet.getRange(2, 1, archiveSheet.getLastRow() - 1, archiveSheet.getLastColumn()).clearContent();
        }
    }
    
    ss.toast(`Memulai pengarsipan CWL untuk ${reportsToArchive.length} klan...`, "ARSIP CWL", -1);

    const existingArchiveBlocks = archiveSheet.getLastRow() > 1 ? archiveSheet.getRange(2, 2, archiveSheet.getLastRow() - 1, 1).getValues().flat() : [];
    
    let totalRowsArchived = 0;
    
    reportsToArchive.forEach(report => {
        const sourceSheet = report.sheet;
        const sourceData = sourceSheet.getDataRange().getValues();
        const newArchiveData = [];
        let currentOpponent = "";
        let dayCounter = 0;
        
        sourceData.forEach(row => {
            if (String(row[0]).startsWith('HARI KE-')) {
                dayCounter++;
                const opponentMatch = String(row[0]).match(/vs (.*)/);
                currentOpponent = opponentMatch ? opponentMatch[1].trim() : "Unknown Opponent";
                const blockIdentifier = `--- START HARI KE-${dayCounter} VS ${currentOpponent} / MUSIM ${seasonId} / CLAN ${report.tag} ---`;
                
                if (!existingArchiveBlocks.includes(blockIdentifier)) {
                    // Baris Header Blok: Kolom A kosong, Kolom B adalah Identifier
                    newArchiveData.push(["", blockIdentifier, ...Array(16).fill("")]);
                } else {
                    currentOpponent = "DUPLICATE";
                }
            } else if (String(row[0]).startsWith('Tag') && dayCounter > 0 && currentOpponent !== "DUPLICATE") {
                // Lewati baris header kolom
                return;
            } else if (String(row[0]).startsWith('#') && currentOpponent !== "DUPLICATE") {
                // Baris Data Pemain
                const [ourTag, ourName, ourTh, ourStatus, ourTarget, ourStars, ourPercent, , oppTag, oppName, oppTh, oppStatus, oppTarget, oppStars, oppPercent] = row;
                
                newArchiveData.push([
                    report.tag, seasonId, new Date(),
                    ourTag, ourName, ourTh, String(ourStatus), ourTarget, ourStars, ourPercent,
                    "",
                    oppTag, oppName, oppTh, String(oppStatus), oppTarget, oppStars, oppPercent
                ]);
                totalRowsArchived++;
            }
        });

        if (newArchiveData.length > 0) {
            archiveSheet.getRange(archiveSheet.getLastRow() + 1, 1, newArchiveData.length, archiveHeaders.length).setValues(newArchiveData);
        }
    });

    SpreadsheetFormatter.formatCwlArchiveSheet(archiveSheet);
    
    if (totalRowsArchived > 0) {
        ss.toast(`✅ Berhasil mengarsipkan ${totalRowsArchived} baris data CWL baru dari ${reportsToArchive.length} klan.`, "SELESAI", 10);
        
        const response = ui.alert('Arsip Selesai', `Hapus ${reportsToArchive.length} sheet laporan CWL temporer?`, ui.ButtonSet.YES_NO);
        if (response == ui.Button.YES) {
            reportsToArchive.forEach(report => ss.deleteSheet(report.sheet));
        }
    } else {
        ss.toast("Tidak ada data baru untuk diarsipkan.", "INFO", 10);
    }
}

/**
 * Mengarsipkan War Classic Detail dari sheet Perang Aktif ke Arsip Perang.
 */
function archiveClassicWarData() {
    const ui = SpreadsheetApp.getUi();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sourceSheet = ss.getSheetByName(SHEET_NAMES.PERANG_AKTIF);
    const archiveSheet = ss.getSheetByName(SHEET_NAMES.ARSIP_PERANG) || ss.insertSheet(SHEET_NAMES.ARSIP_PERANG);
    const warLogSheet = ss.getSheetByName(SHEET_NAMES.LOG_PERANG);

    if (!sourceSheet || sourceSheet.getLastRow() <= 1) {
        ui.alert('Error', `Sheet "${SHEET_NAMES.PERANG_AKTIF}" kosong. Harap update War Aktif terlebih dahulu.`, ui.ButtonSet.OK);
        return;
    }
    if (!warLogSheet || warLogSheet.getLastRow() <= 1) {
        ui.alert('Error', `Sheet "${SHEET_NAMES.LOG_PERANG}" kosong. Harap jalankan Perang Aktif (yang sudah terintegrasi) untuk update Log Perang.`, ui.ButtonSet.OK);
        return;
    }

    // --- 1. PROMPT PENGGUNA UNTUK NAMA KLAN SAJA ---
    const warNamePrompt = ui.prompt("Arsipkan War Classic", "Klan mana yang baru saja selesai berperang? (Contoh: GBK Crew)", ui.ButtonSet.OK_CANCEL);
    if (warNamePrompt.getSelectedButton() !== ui.Button.OK || !warNamePrompt.getResponseText()) return;
    
    const targetClanName = warNamePrompt.getResponseText().trim().toUpperCase();
    const targetClan = Utils.getAllClans().find(c => c.name.toUpperCase() === targetClanName);
    
    if (!targetClan) {
        ui.alert('Error', `Klan ${targetClanName} tidak ditemukan di Pengaturan.`, ui.ButtonSet.OK);
        return;
    }
    const clanTag = targetClan.tag;
    const safeTargetClanName = targetClanName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

    // --- 2. MEMBACA BLOK DATA DARI PERANG AKTIF ---
    const sourceData = sourceSheet.getDataRange().getValues();
    const detailedDataBlock = [];
    let isTargetWar = false;
    let opponentName = "";
    let opponentTag = "N/A";
    let warHeaderString = "";

    // Pola mencari: ⚔️ [NAMA KITA] (CLASSIC) vs [NAMA LAWAN] (#TAG LAWAN) (State: warEnded)
    const headerPattern = new RegExp(`⚔️\\s*${safeTargetClanName}\\s*\\(CLASSIC\\)\\s*vs\\s*(.*?)\\s*\\(#(.*?)\\)\\s*\\(STATE:\\s*warEnded\\)`, 'i');

    for (let i = 0; i < sourceData.length; i++) {
        const row = sourceData[i];
        const rowString = String(row[0]).toUpperCase();

        if (rowString.match(headerPattern)) {
            const match = rowString.match(headerPattern);
            opponentName = match && match[1] ? match[1].trim() : "Unknown Opponent";
            opponentTag = match && match[2] ? `#${match[2].trim()}` : "N/A";
            isTargetWar = true;
            warHeaderString = `⚔️ ${targetClanName} (${clanTag}) vs ${opponentName} (${opponentTag})`;
        } else if (isTargetWar) {
            if (String(row[0]).startsWith('#')) {
                detailedDataBlock.push(row);
            }
            if (row.every(cell => !cell) || rowString.startsWith('⚔️')) {
                isTargetWar = false;
            }
        }
    }

    if (detailedDataBlock.length === 0) {
        ui.alert('Error', `Tidak dapat menemukan detail War Classic untuk ${targetClanName} di sheet Perang Aktif. Pastikan War sudah selesai (State: warEnded).`, ui.ButtonSet.OK);
        return;
    }
    
    // --- 3. AUTOMATIC RESULT LOOKUP DARI LOG PERANG ---
    const warLogData = warLogSheet.getLastRow() > 1 ? warLogSheet.getRange(2, 1, warLogSheet.getLastRow() - 1, warLogSheet.getLastColumn()).getValues() : [];
    let finalResult = 'N/A';
    let warEndDate = new Date();
    
    const matchedLogEntry = warLogSheet.getLastRow() > 1 ? warLogSheet.getRange(2, 1, warLogSheet.getLastRow() - 1, warLogSheet.getLastColumn()).getValues().find(row =>
        String(row[0]) === clanTag &&
        String(row[9]).toUpperCase().includes(opponentName.toUpperCase())
    ) : null;
    
    if (matchedLogEntry) {
        finalResult = String(matchedLogEntry[3]).toLowerCase();
        warEndDate = matchedLogEntry[10];
    } else {
        ui.alert('Peringatan', 'War Log tidak mencatat War ini. Mengarsip dengan Hasil N/A.', ui.ButtonSet.OK);
    }
    
    // --- 4. PROSES PENGARSIPAN ---
    const warId = Utils.generateWarId(clanTag, warEndDate, opponentName);
    
    const archiveHeaders = ["Tag Klan", "ID War", "Tanggal Arsip", "Hasil", "Nama Lawan", "Tag", "Nama", "TH", "Status Kita", "Target Kita", "Bintang Kita", "Persen Kita", "Tag Lawan", "Nama Lawan", "TH Lawan", "Status Lawan", "Target Lawan", "Bintang Lawan", "Persen Lawan"];

    const neededColumns = archiveHeaders.length;
    if (archiveSheet.getMaxColumns() < neededColumns) { archiveSheet.setMaxColumns(neededColumns); }
    
    if (archiveSheet.getLastRow() === 0) {
        archiveSheet.getRange(1, 1, 1, archiveHeaders.length).setValues([archiveHeaders]);
    }
    
    const existingWarIds = archiveSheet.getLastRow() > 1 ? archiveSheet.getRange(2, 2, archiveSheet.getLastRow() - 1, 1).getValues().flat() : [];
    if (existingWarIds.includes(warId)) {
        ui.alert('Info', `War Classic dengan ID: ${warId} sudah ada di arsip.`, ui.ButtonSet.OK);
        return;
    }

    const dataToArchive = [];
    
    // FIX KRITIS: Baris Penanda War (Sekarang Kolom A berisi Header, Kolom B berisi ID War)
    const headerRow = [warHeaderString, warId, ...Array(neededColumns - 2).fill("")];
    dataToArchive.push(headerRow);

    detailedDataBlock.forEach(row => {
        const limitedRow = row.slice(0, 15);
        
        const outputRow = [];
        
        // Bagian I: Data Kustom War Archive (Kolom A-E)
        outputRow.push(clanTag, warId, new Date(), finalResult, opponentName);

        // Bagian II: Data Kita (Kolom F-L, 7 elemen)
        outputRow.push(limitedRow[0], limitedRow[1], limitedRow[2], String(limitedRow[3]), limitedRow[4], limitedRow[5], limitedRow[6]);

        // Bagian III: Data Lawan (Kolom M-S, 7 elemen)
        outputRow.push(opponentTag, limitedRow[9], limitedRow[10], String(limitedRow[11]), limitedRow[12], limitedRow[13], limitedRow[14]);
        
        dataToArchive.push(outputRow);
    });

    if (dataToArchive.length === 1 && dataToArchive[0][0] === warHeaderString) {
        ui.alert('Error', 'War Archive gagal. Tidak ada baris data pemain yang ditemukan di War Aktif.', ui.ButtonSet.OK);
        return;
    }
    
    archiveSheet.getRange(archiveSheet.getLastRow() + 1, 1, dataToArchive.length, neededColumns).setValues(dataToArchive);
    SpreadsheetFormatter.formatClassicWarArchiveSheet(archiveSheet);
    
    ss.toast(`✅ Berhasil mengarsipkan War Classic ${opponentName} (Result: ${finalResult}).`, "SELESAI", 10);
    
    const response = ui.alert('Arsip Selesai', `War Classic untuk ${targetClanName} sudah diarsipkan. Hapus sheet laporan "Perang Aktif" temporer?`, ui.ButtonSet.YES_NO);
    if (response == ui.Button.YES) {
        ss.deleteSheet(sourceSheet);
    }
}

function setGlobalProperties() {
    const ui = SpreadsheetApp.getUi();
    const apiKeyPrompt = ui.prompt('Atur Kunci API CoC', 'Masukkan API Key (JWT):', ui.ButtonSet.OK_CANCEL);
    if (apiKeyPrompt.getSelectedButton() == ui.Button.OK) {
        PropertiesService.getScriptProperties().setProperty('COC_API_KEY', apiKeyPrompt.getResponseText());
        ui.alert('API Key berhasil disimpan.');
    }
    const webhookPrompt = ui.prompt('Atur URL Webhook Discord', 'Masukkan URL Webhook:', ui.ButtonSet.OK_CANCEL);
    if (webhookPrompt.getSelectedButton() == ui.Button.OK) {
        PropertiesService.getScriptProperties().setProperty('DISCORD_WEBHOOK_URL', webhookPrompt.getResponseText());
        ui.alert('URL Webhook berhasil disimpan.');
    }
}

function setupAutomaticTriggers() { SpreadsheetApp.getUi().alert('Fungsi ini sedang dalam pengembangan.'); }


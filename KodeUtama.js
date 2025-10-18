// SELURUH KODE LENGKAP - KodeUtama.gs (V6.3 - Deteksi Role Otomatis)
/**
 * =================================================================
 * KODEUTAMA.GS: Berisi Fungsi Utama (onOpen) dan Logika Arsip/Update Non-Laporan.
 * * PENGEMBANGAN V6.3: Mengimplementasikan deteksi perubahan role otomatis.
 * Menghapus menu manual dan menambahkan fungsi inisialisasi snapshot.
 * =================================================================
 */

function onOpen() {
    const ui = SpreadsheetApp.getUi();
    const menu = ui.createMenu('⚔️ Sistem Klan');

    const actionMenu = ui.createMenu('🔄 Sinkronisasi & Refresh');
    actionMenu.addItem('🚀 Sinkronisasi Lengkap', 'fullDataRefresh');
    actionMenu.addItem('👥 Update Anggota Saja', 'updateAllMembers');
    actionMenu.addItem('📊 Refresh Dashboard Saja', 'Laporan_buildDashboard');
    menu.addSubMenu(actionMenu);
    menu.addSeparator();
    
    const reportsMenu = ui.createMenu('📋 Laporan & Analisis');
    reportsMenu.addItem('Status War Aktif', 'updateCurrentWar'); 
    reportsMenu.addItem('Raid Capital Terbaru', 'generateDetailedRaidReport');
    reportsMenu.addItem('Rekap CWL Musim Terakhir', 'rekapitulasiCWL'); 
    reportsMenu.addItem('Evaluasi Partisipasi', 'getParticipationReport');
    menu.addSubMenu(reportsMenu);
    menu.addSeparator();

    const adminMenu = ui.createMenu('⚙️ Administrasi Sistem');
    const archiveMenu = ui.createMenu('🗄️ Arsipkan Laporan');
    archiveMenu.addItem('Arsipkan Laporan Raid', 'archiveRaidReport');
    archiveMenu.addItem('Arsipkan Rekap CWL', 'archiveCwlData');
    archiveMenu.addItem('Arsipkan Detail War Classic', 'archiveClassicWarData');
    adminMenu.addSubMenu(archiveMenu);
    
    // --- MENU PENCATATAN MANUAL DIHAPUS ---
    // --- DIGANTIKAN DENGAN MENU INISIALISASI ---
    adminMenu.addSeparator();
    adminMenu.addItem('🔧 Inisialisasi Snapshot Role (Jalankan Sekali)', 'initializeRoleSnapshot');
    adminMenu.addSeparator();
    
    adminMenu.addItem('🔑 Atur API & Webhook', 'setGlobalProperties');
    adminMenu.addItem('⏰ Atur Automasi (Setiap 4 Jam)', 'setupAutomaticTriggers');
    menu.addSubMenu(adminMenu);

    menu.addToUi();
}

/**
 * Fungsi inisialisasi satu kali untuk mengisi sheet 'Snapshot Role'
 * berdasarkan data saat ini di sheet 'Anggota'.
 */
function initializeRoleSnapshot() {
    const ui = SpreadsheetApp.getUi();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    const confirmation = ui.alert(
        'Konfirmasi Inisialisasi',
        'Tindakan ini akan menghapus data snapshot lama dan membuat yang baru berdasarkan sheet "Anggota" saat ini. Ini hanya perlu dijalankan sekali saat pertama kali setup. Lanjutkan?',
        ui.ButtonSet.YES_NO
    );
    if (confirmation !== ui.Button.YES) return;
    
    ss.toast('Memulai inisialisasi snapshot role...', 'SETUP', -1);

    const memberSheet = ss.getSheetByName(SHEET_NAMES.ANGGOTA);
    const snapshotSheet = ss.getSheetByName('Snapshot Role');

    if (!memberSheet || memberSheet.getLastRow() < 2) {
        ui.alert('Error', 'Sheet "Anggota" kosong atau tidak ditemukan.');
        return;
    }
    if (!snapshotSheet) {
        ui.alert('Error', 'Sheet "Snapshot Role" tidak ditemukan. Harap buat sheet tersebut terlebih dahulu.');
        return;
    }

    // Ambil data Tag (Kolom C) dan Role (Kolom E)
    const memberData = memberSheet.getRange(2, 3, memberSheet.getLastRow() - 1, 3).getValues();
    const snapshotData = memberData.map(row => [row[0], row[2]]); // [Player Tag, Role]

    snapshotSheet.clearContents(); // Hapus data lama
    snapshotSheet.getRange(1, 1, 1, 2).setValues([['Player Tag', 'Role Terakhir']]); // Set header
    if (snapshotData.length > 0) {
        snapshotSheet.getRange(2, 1, snapshotData.length, 2).setValues(snapshotData);
    }
    
    ss.toast('✅ Inisialisasi Snapshot Role selesai!', 'SUKSES', 5);
}


/**
 * Fungsi inti baru untuk mendeteksi dan mencatat perubahan role secara otomatis.
 */
function _detectAndLogRoleChanges() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const memberSheet = ss.getSheetByName(SHEET_NAMES.ANGGOTA);
    const snapshotSheet = ss.getSheetByName('Snapshot Role');
    const logSheet = ss.getSheetByName('Log Perubahan Role');

    if (!memberSheet || !snapshotSheet || !logSheet || snapshotSheet.getLastRow() < 2) {
        Logger.log('Deteksi role dilewati: salah satu sheet prasyarat (Anggota, Snapshot, Log) tidak ada atau kosong.');
        return;
    }
    
    // 1. Buat Peta (Map) dari data saat ini dan snapshot untuk perbandingan cepat
    const currentRoles = new Map();
    memberSheet.getRange(2, 3, memberSheet.getLastRow() - 1, 3).getValues().forEach(row => {
        // row[0] = Player Tag, row[1] = Player Name, row[2] = Role
        if (row[0]) currentRoles.set(String(row[0]).trim().toUpperCase(), { name: row[1], role: row[2] });
    });

    const lastRoles = new Map();
    snapshotSheet.getRange(2, 1, snapshotSheet.getLastRow() - 1, 2).getValues().forEach(row => {
        if (row[0]) lastRoles.set(String(row[0]).trim().toUpperCase(), row[1]);
    });

    const changesToLog = [];
    const newSnapshotData = [];

    // 2. Bandingkan data saat ini dengan snapshot
    currentRoles.forEach((playerData, playerTag) => {
        const lastRole = lastRoles.get(playerTag);
        const currentRole = playerData.role;

        if (lastRole && lastRole !== currentRole) {
            // Perubahan terdeteksi!
            Logger.log(`Perubahan role terdeteksi untuk ${playerTag}: ${lastRole} -> ${currentRole}`);
            changesToLog.push([new Date(), playerTag, playerData.name, lastRole, currentRole]);
        }
        newSnapshotData.push([playerTag, currentRole]);
    });

    // 3. Tulis perubahan ke Log dan perbarui Snapshot
    if (changesToLog.length > 0) {
        logSheet.getRange(logSheet.getLastRow() + 1, 1, changesToLog.length, 5).setValues(changesToLog);
        ss.toast(`Perubahan role terdeteksi dan dicatat untuk ${changesToLog.length} pemain.`, 'LOG OTOMATIS', 10);
    }

    // 4. Perbarui snapshot dengan data terbaru secara keseluruhan
    snapshotSheet.clearContents();
    snapshotSheet.getRange(1, 1, 1, 2).setValues([['Player Tag', 'Role Terakhir']]);
    if (newSnapshotData.length > 0) {
        snapshotSheet.getRange(2, 1, newSnapshotData.length, 2).setValues(newSnapshotData);
    }
}


// --- FUNGSI UPDATE ANGGOTA DIPERBARUI UNTUK MEMANGGIL DETEKTOR OTOMATIS ---
function updateAllMembers(suppressToast = false) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAMES.ANGGOTA);
    if (!sheet) { ss.toast(`Sheet "${SHEET_NAMES.ANGGOTA}" tidak ditemukan.`); return; }
    if (!suppressToast) ss.toast('Mengambil data anggota untuk semua klan...');
    const allClans = Utils.getAllClans();
    if (allClans.length === 0) return;
    const headers = ["Tag Klan", "Nama Klan", "Tag", "Nama", "Role", "Level TH", "Donasi", "Donasi Diterima", "Level XP", "League", "Poin War Bintang", "Trophy", "Tag Terakhir Online"];
    const combinedData = [];
    allClans.forEach(clan => {
        const endpoint = `clans/${encodeURIComponent(clan.tag)}`;
        const clanData = CocApi._fetch(endpoint, true);
        if (clanData && clanData.memberList) {
            clanData.memberList.sort((a, b) => Utils.memberSorter(a, b, 'default')).forEach(member => {
                const thLevel = member.townhallLevel || member.townHallLevel || 'N/A';
                combinedData.push([clan.tag, clan.name, member.tag, member.name, Utils.formatRoleName(member.role), thLevel, member.donations || 0, member.donationsReceived || 0, member.expLevel || 'N/A', member.league ? member.league.name : 'Unranked', member.warStars || 0, member.trophies || 0, 'N/A']);
            });
        }
    });
    sheet.clear();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    if (combinedData.length > 0) { sheet.getRange(2, 1, combinedData.length, headers.length).setValues(combinedData); }
    SpreadsheetFormatter.formatMemberSheet(sheet);
    
    // --- PANGGILAN FUNGSI BARU DI SINI ---
    // Setelah sheet anggota diperbarui, langsung deteksi dan catat perubahannya.
    _detectAndLogRoleChanges();

    if (!suppressToast) {
        ss.toast('✅ Data anggota selesai diperbarui!', 'SELESAI', 5);
    }
}


// --- KODE LAINNYA TIDAK PERLU DIUBAH ---
function fullDataRefresh() {
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) {
        Logger.log('Proses sinkronisasi sedang berjalan. Eksekusi saat ini dilewati.');
        return;
    }
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    try {
        ss.toast('Memulai sinkronisasi semua data klan...', '🚀 SINKRONISASI', -1);
        updateAllMembers(true); // Fungsi ini sekarang sudah termasuk deteksi role otomatis
        updateCurrentWar();
        generateDetailedRaidReport();
        rekapitulasiCWL();
        getParticipationReport();
        Laporan_buildDashboard();
        ss.toast('✅ Sinkronisasi dan pembaruan laporan selesai!', 'SELESAI', 5);
    } catch (e) {
        Logger.log(`Error pada fullDataRefresh: ${e.message}`);
        ss.toast(`Terjadi Error: ${e.message}`, '❌ GAGAL', 10);
    } finally {
        lock.releaseLock();
    }
}
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
        sheet.getRange(2, 6, combinedData.length).setNumberFormat('0');
        sheet.getRange(2, 8, combinedData.length).setNumberFormat('0');
        sheet.getRange(2, 7, combinedData.length).setNumberFormat('0.00');
        sheet.getRange(2, 9, combinedData.length).setNumberFormat('0.00');
    }
    SpreadsheetFormatter.formatWarLogSheet(sheet);
}
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
                    newArchiveData.push(["", blockIdentifier, ...Array(16).fill("")]);
                } else {
                    currentOpponent = "DUPLICATE";
                }
            } else if (String(row[0]).startsWith('#') && currentOpponent !== "DUPLICATE") {
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
function archiveClassicWarData() {
    const ui = SpreadsheetApp.getUi();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sourceSheet = ss.getSheetByName(SHEET_NAMES.PERANG_AKTIF);
    const archiveSheet = ss.getSheetByName(SHEET_NAMES.ARSIP_PERANG) || ss.insertSheet(SHEET_NAMES.ARSIP_PERANG);
    const warLogSheet = ss.getSheetByName(SHEET_NAMES.LOG_PERANG);

    if (!sourceSheet || sourceSheet.getLastRow() <= 1) {
        ui.alert('Error', `Sheet "${SHEET_NAMES.PERANG_AKTIF}" kosong.`, ui.ButtonSet.OK);
        return;
    }
    if (!warLogSheet || warLogSheet.getLastRow() <= 1) {
        ui.alert('Error', `Sheet "${SHEET_NAMES.LOG_PERANG}" kosong.`, ui.ButtonSet.OK);
        return;
    }

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

    const sourceData = sourceSheet.getDataRange().getValues();
    const detailedDataBlock = [];
    let isTargetWar = false;
    let opponentName = "";
    let opponentTag = "N/A";
    let warHeaderString = "";
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
        ui.alert('Error', `Tidak dapat menemukan detail War Classic untuk ${targetClanName} yang sudah selesai.`, ui.ButtonSet.OK);
        return;
    }
    
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
    
    const warId = Utils.generateWarId(clanTag, warEndDate, opponentName);
    const archiveHeaders = ["Tag Klan", "ID War", "Tanggal Arsip", "Hasil", "Nama Lawan", "Tag", "Nama", "TH", "Status Kita", "Target Kita", "Bintang Kita", "Persen Kita", "Tag Lawan", "Nama Lawan", "TH Lawan", "Status Lawan", "Target Lawan", "Bintang Lawan", "Persen Lawan"];

    if (archiveSheet.getMaxColumns() < archiveHeaders.length) { archiveSheet.setMaxColumns(archiveHeaders.length); }
    if (archiveSheet.getLastRow() === 0) {
        archiveSheet.getRange(1, 1, 1, archiveHeaders.length).setValues([archiveHeaders]);
    }
    
    const existingWarIds = archiveSheet.getLastRow() > 1 ? archiveSheet.getRange(2, 2, archiveSheet.getLastRow() - 1, 1).getValues().flat() : [];
    if (existingWarIds.includes(warId)) {
        ui.alert('Info', `War Classic dengan ID: ${warId} sudah ada di arsip.`, ui.ButtonSet.OK);
        return;
    }

    const dataToArchive = [];
    const headerRow = [warHeaderString, warId, ...Array(archiveHeaders.length - 2).fill("")];
    dataToArchive.push(headerRow);

    detailedDataBlock.forEach(row => {
        const limitedRow = row.slice(0, 15);
        const outputRow = [];
        outputRow.push(clanTag, warId, new Date(), finalResult, opponentName);
        outputRow.push(limitedRow[0], limitedRow[1], limitedRow[2], String(limitedRow[3]), limitedRow[4], limitedRow[5], limitedRow[6]);
        outputRow.push(opponentTag, limitedRow[9], limitedRow[10], String(limitedRow[11]), limitedRow[12], limitedRow[13], limitedRow[14]);
        dataToArchive.push(outputRow);
    });

    if (dataToArchive.length <= 1) {
        ui.alert('Error', 'War Archive gagal. Tidak ada data pemain ditemukan.', ui.ButtonSet.OK);
        return;
    }
    
    archiveSheet.getRange(archiveSheet.getLastRow() + 1, 1, dataToArchive.length, archiveHeaders.length).setValues(dataToArchive);
    SpreadsheetFormatter.formatClassicWarArchiveSheet(archiveSheet);
    ss.toast(`✅ Berhasil mengarsipkan War Classic ${opponentName}.`, "SELESAI", 10);
    
    const response = ui.alert('Arsip Selesai', `Hapus sheet "Perang Aktif"?`, ui.ButtonSet.YES_NO);
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


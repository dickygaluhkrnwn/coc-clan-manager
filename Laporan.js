// SELURUH KODE LENGKAP - Laporan.gs (V5.82 - Modularisasi: Core Reports)
/**
 * =================================================================
 * LAPORAN.GS: Berisi fungsi utama untuk menghasilkan laporan (War, CWL, Raid, Partisipasi).
 * * Catatan: Logika Dashboard dipindahkan ke file Dashboard.gs.
 * =================================================================
 */

// === FUNGSI UTAMA LAPORAN ===

/**
 * Mengambil data War Aktif saat ini untuk semua klan dan menuliskannya ke sheet Perang Aktif.
 * Fungsi ini juga memanggil updateAllWarLogs() untuk sinkronisasi Log Perang.
 * (Fungsi ini ada di file Laporan.gs, dipanggil dari KodeUtama.gs)
 */
function updateCurrentWar() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. UPDATE LOG PERANG TERLEBIH DAHULU (Sesuai kesepakatan)
    updateAllWarLogs(); // Diaktifkan kembali

    const sheet = ss.getSheetByName(SHEET_NAMES.PERANG_AKTIF) || ss.insertSheet(SHEET_NAMES.PERANG_AKTIF);
    sheet.clear();
    ss.toast('Memeriksa status perang semua klan...', 'PERANG AKTIF', -1);
    const allClans = Utils.getAllClans();
    if (allClans.length === 0) return;
    const fullOutput = [];
    const formatInstructions = [];
    const headers = ["Tag", "Nama", "TH", "Status", "Target", "⭐", "%", "", "Tag", "Nama", "TH", "Status", "Target", "⭐", "%"];
    allClans.forEach((clan, index) => {
        if (index > 0) fullOutput.push(Array(15).fill(''));
        ss.toast(`Memeriksa ${clan.name}...`);
        const { data: warData, warType } = CocApi.fetchCurrentWarForClan(clan.tag);
        const currentRow = fullOutput.length + 1;
        if (warData && warData.state !== 'notInWar') {
            const { ourClanData, opponentData } = Utils.normalizeWarData(warData, clan.tag);
            formatInstructions.push({ type: 'mainHeader', row: currentRow, color: index === 0 ? '#0d47a1' : '#b71c1c' });

            const opponentTag = opponentData.tag || 'N/A';

            const mainHeader = [`⚔️ ${clan.name.toUpperCase()} (${warType}) vs ${opponentData.name.toUpperCase()} (${opponentTag}) (State: ${warData.state})`];
            while (mainHeader.length < 15) mainHeader.push('');
            fullOutput.push(mainHeader);
            formatInstructions.push({ type: 'tableHeader', row: currentRow + 1, ourColor: '#1a2c3a', oppColor: '#3a1a1a' });
            fullOutput.push(headers);
            const warAttacksAllowed = (warType === 'CWL') ? 1 : 2;
            const dataRows = [];

            // --- START PERBAIKAN LOGIKA VISUAL ---
            const sortedOurMembers = (ourClanData.members || []).sort((a, b) => a.mapPosition - b.mapPosition);
            const opponentMembers = opponentData.members || [];

            sortedOurMembers.forEach((ourPlayer) => {
                const oppPlayer = opponentMembers.find(p => p.mapPosition === ourPlayer.mapPosition) || {};

                const ourAttacks = ourPlayer.attacks || [];
                const oppAttacks = oppPlayer.attacks || [];
                const numRowsToCreate = Math.max(ourAttacks.length, oppAttacks.length, 1);

                for (let i = 0; i < numRowsToCreate; i++) {
                    const ourAttack = ourAttacks[i] || {};
                    const ourAttacksUsed = ourAttacks.length;
                    const ourStatusText = ourPlayer.tag ? (ourAttacksUsed < warAttacksAllowed ? `❌ ${ourAttacksUsed}/${warAttacksAllowed}` : `✔️ ${ourAttacksUsed}/${warAttacksAllowed}`) : '—';

                    const oppAttack = oppAttacks[i] || {};
                    const oppAttacksUsed = oppAttacks.length;
                    const oppStatusText = oppPlayer.tag ? (oppAttacksUsed < warAttacksAllowed ? `❌ ${oppAttacksUsed}/${warAttacksAllowed}` : `✔️ ${oppAttacksUsed}/${warAttacksAllowed}`) : '—';
                    
                    const defenderOpponent = opponentMembers.find(o => o.tag === ourAttack.defenderTag);
                    const ourTargetName = defenderOpponent ? `${defenderOpponent.mapPosition}. ${defenderOpponent.name}` : (ourAttack.defenderTag || '—');

                    const defenderUs = sortedOurMembers.find(o => o.tag === oppAttack.defenderTag);
                    const oppTargetName = defenderUs ? `${defenderUs.mapPosition}. ${defenderUs.name}` : (oppAttack.defenderTag || '—');

                    const rowData = [
                        // DATA KITA: Ulangi info pemain di setiap baris agar format terbaca
                        ourPlayer.tag || '—',
                        ourPlayer.name || '—',
                        ourPlayer.townhallLevel || '—',
                        ourStatusText,
                        
                        // Data serangan
                        ourTargetName,
                        ourAttack.stars ?? '—',
                        ourAttack.destructionPercentage ?? '—',
                        '', // Separator
                        
                        // DATA MUSUH: Ulangi info pemain di setiap baris agar format terbaca
                        oppPlayer.tag || '—',
                        oppPlayer.name || '—',
                        oppPlayer.townhallLevel || '—',
                        oppStatusText,

                        // Data serangan
                        oppTargetName,
                        oppAttack.stars ?? '—',
                        oppAttack.destructionPercentage ?? '—',
                    ];
                    dataRows.push(rowData);
                }
            });
            // --- END PERBAIKAN LOGIKA VISUAL ---

            fullOutput.push(...dataRows);
            formatInstructions.push({ type: 'dataBody', startRow: currentRow + 2, numRows: dataRows.length, ourColor: '#1a2c3a', oppColor: '#3a1a1a' });
        } else {
            formatInstructions.push({ type: 'peaceStatus', row: currentRow });
            const peaceRow = [`${clan.name.toUpperCase()} sedang tidak dalam perang.`];
            while (peaceRow.length < 15) peaceRow.push('');
            fullOutput.push(peaceRow);
        }
    });
    if (fullOutput.length > 0) {
        sheet.getRange(1, 1, fullOutput.length, 15).setValues(fullOutput);
        SpreadsheetFormatter.formatActiveWarSheet(sheet, formatInstructions);
        ss.toast('✅ Laporan Perang Aktif berhasil diperbarui!', 'SELESAI', 5);
        ss.setActiveSheet(sheet);
    }
}


/**
 * Membuat laporan Rekapitulasi CWL (Live atau dari Arsip).
 * (Fungsi ini ada di file Laporan.gs, dipanggil dari KodeUtama.gs)
 */
function rekapitulasiCWL() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const allClans = Utils.getAllClans();
    ss.toast("Memulai rekapitulasi CWL...", "CWL", -1);

    allClans.forEach(clan => {
        ss.toast(`Memproses CWL untuk ${clan.name}...`);

        let groupData = CocApi.fetchCwlGroupData(clan.tag);
        let isFromArchive = false;

        if (!groupData || groupData.state === 'notInWar' || !groupData.rounds || groupData.rounds.length === 0) {
            ss.toast(`Tidak ada CWL live, mencoba mengambil dari arsip untuk ${clan.name}...`);
            groupData = Utils.getLatestCwlBlocksFromArchive(clan.tag);
            if (groupData) {
                isFromArchive = true;
            }
        }

        if (!groupData || !groupData.rounds || groupData.rounds.length === 0) {
            Logger.log(`Tidak ada data CWL yang bisa diproses untuk ${clan.name}`);
            return;
        }

        const sheetName = `CWL - ${clan.name}`;
        let sheet = ss.getSheetByName(sheetName);
        if (sheet) {
            sheet.clear();
        } else {
            sheet = ss.insertSheet(sheetName);
        }

        const fullReportData = [];
        let warTagsToProcess = [];

        if (isFromArchive) {
            warTagsToProcess = groupData.rounds.map(r => ({ tag: r.warTag }));
        } else {
            const uniqueTags = new Set();
            groupData.rounds.forEach(round => {
                round.warTags.forEach(tag => {
                    if (tag !== '#0') uniqueTags.add(tag);
                });
            });
            warTagsToProcess = Array.from(uniqueTags).map(tag => ({ tag: tag }));
        }

        warTagsToProcess.forEach((warEntry, i) => {
            let warData;

            if (isFromArchive) {
                warData = CocApi.reconstructWarDataFromArchive(clan.tag, groupData.season, warEntry.tag);
            } else {
                warData = CocApi.fetchWarByTag(warEntry.tag);
            }

            if (warData && warData.clan) {
                const { ourClanData, opponentData } = Utils.normalizeWarData(warData, clan.tag);

                let opponentName;
                if (isFromArchive) {
                    const dayHeaderMatch = warData.dayHeader.match(/HARI KE-\d+ VS (.*?) \//);
                    opponentName = dayHeaderMatch ? dayHeaderMatch[1].trim() : opponentData.name;
                } else {
                    opponentName = opponentData.name;
                }

                const dayHeader = Array(15).fill('');
                dayHeader[0] = `HARI KE-${i + 1} vs ${opponentName}`;
                fullReportData.push(dayHeader);

                const teamHeader = Array(15).fill('');
                teamHeader[0] = '⚔️ TIM KITA ⚔️';
                teamHeader[8] = '🔥 TIM MUSUH 🔥';
                fullReportData.push(teamHeader);

                fullReportData.push(["Tag", "Nama", "TH", "Status", "Target", "⭐", "%", "", "Tag", "Nama", "TH", "Status", "Target", "⭐", "%"]);

                (ourClanData.members || []).sort((a, b) => a.mapPosition - b.mapPosition).forEach(member => {
                    const ourAttack = (member.attacks || [])[0] || {};
                    const opponent = (opponentData.members || []).find(op => op.mapPosition === member.mapPosition) || {};
                    const opponentAttack = (opponent.attacks || [])[0] || {};

                    fullReportData.push([
                        member.tag, member.name, member.townhallLevel,
                        (member.attacks && member.attacks.length > 0) ? '✔️' : '❌',
                        ourAttack.defenderTag || '-',
                        ourAttack.stars ?? 0,
                        ourAttack.destructionPercentage ?? 0,
                        '',
                        opponent.tag || '-',
                        opponent.name || '-',
                        opponent.townhallLevel || '-',
                        (opponent.attacks && opponent.attacks.length > 0) ? '✔️' : '❌',
                        opponentAttack.defenderTag || '-',
                        opponentAttack.stars ?? 0,
                        opponentAttack.destructionPercentage ?? 0
                    ]);
                });
                fullReportData.push(Array(15).fill(''));
            }
        });

        if (fullReportData.length > 0) {
            sheet.getRange(1, 1, fullReportData.length, 15).setValues(fullReportData);
            SpreadsheetFormatter.formatCwlReportSheet(sheet);
            ss.setActiveSheet(sheet);
        }
    });

    ss.toast("✅ Rekapitulasi CWL selesai!", "SELESAI", 5);
}

/**
 * Membuat laporan performa Raid Capital terbaru.
 * (Fungsi ini ada di file Laporan.gs, dipanggil dari KodeUtama.gs)
 */
function generateDetailedRaidReport() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = SHEET_NAMES.RAID_TERBARU;
    let sheet = ss.getSheetByName(sheetName);
    if (sheet) { sheet.clear(); } else { sheet = ss.insertSheet(sheetName, 1); }
    ss.toast('Membuat Laporan Raid...', 'RAID', -1);
    const allClans = Utils.getAllClans();
    if (allClans.length === 0) return;
    const fullReportData = [];
    allClans.forEach(clan => {
        const endpoint = `clans/${encodeURIComponent(clan.tag)}/capitalraidseasons?limit=1`;
        const raidData = CocApi._fetch(endpoint, true);
        if (raidData && raidData.items && raidData.items.length > 0) {
            const lastRaid = raidData.items[0];
            const raidDate = Utils.cocDateToJsDate(lastRaid.endTime);
            const formattedDate = Utilities.formatDate(raidDate, ss.getSpreadsheetTimeZone(), "dd MMM yyyy");
            fullReportData.push([`🏆 PERFORMA RAID: ${clan.name.toUpperCase()} (${formattedDate})`, '', '', '', '', '']);
            fullReportData.push(["Peringkat", "Nama Pemain", "Tag", "Total Jarahan", "Jml Serangan", "Rata-rata/Serangan"]);
            const members = (lastRaid.members || []).sort((a, b) => b.capitalResourcesLooted - a.capitalResourcesLooted);
            members.forEach((member, index) => {
                const totalLoot = member.capitalResourcesLooted || 0;
                const totalAttacks = member.attacks || 0;
                const avgLoot = totalAttacks > 0 ? Math.round(totalLoot / totalAttacks) : 0;
                fullReportData.push([index + 1, member.name, member.tag, totalLoot, totalAttacks, avgLoot]);
            });
            fullReportData.push(['', '', '', '', '', '']);
        }
    });
    if (fullReportData.length > 0) {
        sheet.getRange(1, 1, fullReportData.length, 6).setValues(fullReportData);
        SpreadsheetFormatter.formatDetailedRaidReportSheet(sheet);
        ss.toast('✅ Laporan Raid berhasil dibuat!', 'SELESAI', 5);
        ss.setActiveSheet(sheet);
    } else {
        ss.toast('Gagal membuat laporan: Tidak ada data.', 'GAGAL', 5);
    }
}


/**
 * Membuat laporan Evaluasi Partisipasi dari data arsip.
 * (Fungsi ini ada di file Laporan.gs, dipanggil dari KodeUtama.gs)
 */
function getParticipationReport() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = SHEET_NAMES.PARTISIPASI;
    let sheet = ss.getSheetByName(sheetName);
    if (sheet) { sheet.clear(); } else { sheet = ss.insertSheet(sheetName, 1); }
    ss.toast('Membuat Laporan Evaluasi Partisipasi...', 'PARTISIPASI', -1);

    const aggregatedData = ParticipationAggregator.getAggregatedParticipationData();

    const headers = ["Nama Pemain", "Level TH", "Role", "Tag Pemain", "Nama Klan", "Tag Klan", "CWL (Valid)", "War Classic (Valid)", "CWL (Gagal)", "War Classic (Gagal)", "STATUS", "KETERANGAN"];
    const reportData = [headers];

    aggregatedData.sort((a, b) => b.thLevel - a.thLevel || a.playerName.localeCompare(b.playerName)).forEach(player => {
        const { statusIcon, keterangan } = ParticipationAggregator.getPromotionDemotionStatus(player);

        reportData.push([
            player.playerName, player.thLevel, player.role, player.playerTag, player.clanName, player.clanTag,
            player.cwlAttacksUsed, player.classicWarsParticipated, player.cwlWarsFailed, player.classicWarsFailed,
            statusIcon, keterangan
        ]);
    });

    if (reportData.length > 1) {
        const lastRow = reportData.length;
        sheet.getRange(1, 1, lastRow, headers.length).setValues(reportData);
        SpreadsheetFormatter.formatParticipationSheet(sheet, lastRow);
        ss.toast('✅ Laporan Partisipasi berhasil dibuat!', 'SELESAI', 5);
        ss.setActiveSheet(sheet);
    } else {
        ss.toast('Gagal membuat laporan: Tidak ada data anggota.', 'GAGAL', 5);
    }
}


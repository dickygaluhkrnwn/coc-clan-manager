/**
 * =================================================================
 * DASHBOARD.GS: Berisi semua fungsi untuk membangun dan mengisi Dashboard.
 * * Catatan: File ini bergantung pada Konstanta.gs, Utilities.gs, Aggregators.gs
 * =================================================================
 */

/**
 * Fungsi Inti untuk membangun Dashboard (sudah diganti nama agar tidak konflik).
 * @returns {void}
 */
function Laporan_buildDashboard() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dashboardSheet = ss.getSheetByName(SHEET_NAMES.DASHBOARD) || ss.insertSheet(SHEET_NAMES.DASHBOARD, 0);
    dashboardSheet.clear();
    ss.toast('Membangun Dashboard...', 'DASHBOARD', -1);

    const allClans = Utils.getAllClans();
    if (allClans.length === 0) {
        dashboardSheet.getRange('A1').setValue('Harap atur klan di sheet Pengaturan.');
        return;
    }

    const CLAN_WIDTH = 4;
    const COL_GAP = 1;
    const clanRanges = [
        { startCol: 1, endCol: CLAN_WIDTH, colorIndex: 0 },
        { startCol: CLAN_WIDTH + COL_GAP + 1, endCol: CLAN_WIDTH * 2 + COL_GAP, colorIndex: 1 }
    ];
    const maxColumns = CLAN_WIDTH * 2 + COL_GAP;

    const { totalWins, totalWars, topDonators, topRaidLooters, promotionCandidates, demotionRisks, cwlSummaries } = getDashboardMetrics(ss, allClans);
    
    const outputData = [];
    const headerRow = Array(maxColumns).fill('');
    headerRow[0] = `⚔️ GBK MANAGEMENT SYSTEM ⚔️`;
    outputData.push(headerRow.slice(0, maxColumns), Array(maxColumns).fill(''));

    const clanHeaderRow = Array(maxColumns).fill('');
    clanHeaderRow[clanRanges[0].startCol - 1] = `🛡️ ${allClans[0].name.toUpperCase()} (${allClans[0].tag}) 🛡️`;
    if (allClans[1]) {
        clanHeaderRow[clanRanges[1].startCol - 1] = `🔥 ${allClans[1].name.toUpperCase()} (${allClans[1].tag}) 🔥`;
    }
    outputData.push(clanHeaderRow.slice(0, maxColumns));
    outputData.push(Array(maxColumns).fill(''));

    const metricsHeaderRow = Array(maxColumns).fill('');
    metricsHeaderRow[clanRanges[0].startCol - 1] = "📈 RINGKASAN PERFORMA";
    if (allClans[1]) metricsHeaderRow[clanRanges[1].startCol - 1] = "📈 RINGKASAN PERFORMA";
    outputData.push(metricsHeaderRow.slice(0, maxColumns));

    const R6_metricHeader = Array(maxColumns).fill('');
    const R7_metricData = Array(maxColumns).fill('');

    allClans.slice(0, 2).forEach((clan, i) => {
        const tag = clan.tag;
        const { startCol } = clanRanges[i];
        
        R6_metricHeader[startCol - 1 + 0] = 'Promosi (✔️)';
        R6_metricHeader[startCol - 1 + 1] = 'Demosi (❌)';
        R6_metricHeader[startCol - 1 + 2] = 'Raid Looter';
        R6_metricHeader[startCol - 1 + 3] = 'Top Donator';

        R7_metricData[startCol - 1 + 0] = promotionCandidates[tag];
        R7_metricData[startCol - 1 + 1] = demotionRisks[tag];
        R7_metricData[startCol - 1 + 2] = `${topRaidLooters[tag]?.name || 'N/A'} (${Utils.formatNumber(topRaidLooters[tag]?.loot || 0)})`;
        R7_metricData[startCol - 1 + 3] = `${topDonators[tag]?.name || 'N/A'} (${Utils.formatNumber(topDonators[tag]?.donations || 0)})`;
    });

    outputData.push(R6_metricHeader.slice(0, maxColumns));
    outputData.push(R7_metricData.slice(0, maxColumns));
    outputData.push(Array(maxColumns).fill(''));

    const warHeaderRow = Array(maxColumns).fill('');
    warHeaderRow[clanRanges[0].startCol - 1] = "⚔️ STATUS WAR AKTIF";
    if (allClans[1]) warHeaderRow[clanRanges[1].startCol - 1] = "⚔️ STATUS WAR AKTIF";
    outputData.push(warHeaderRow.slice(0, maxColumns));

    const warHeaderDataRow = Array(maxColumns).fill('');
    const warDataRow = Array(maxColumns).fill('');
    
    // Inisialisasi activeWarStats untuk pemformatan nanti
    const activeWarStats = {};

    allClans.slice(0, 2).forEach((clan, i) => {
        const tag = clan.tag;
        const { startCol } = clanRanges[i];
        
        // --- PERUBAHAN UTAMA: Mengambil data war langsung dari API ---
        const { data: warData } = CocApi.fetchCurrentWarForClan(tag);
        const stats = _getWarStatus(warData, tag); // Menggunakan helper baru yang akurat
        activeWarStats[tag] = stats; // Simpan status untuk pemformatan

        if (stats.status !== 'Tidak Dalam Perang') {
            warHeaderDataRow[startCol - 1 + 0] = 'STATUS';
            warHeaderDataRow[startCol - 1 + 1] = 'SERANGAN DIGUNAKAN';
            warHeaderDataRow[startCol - 1 + 2] = 'BINTANG KITA';
            warHeaderDataRow[startCol - 1 + 3] = 'BINTANG LAWAN';
            
            warDataRow[startCol - 1 + 0] = stats.status;
            warDataRow[startCol - 1 + 1] = stats.attacks;
            warDataRow[startCol - 1 + 2] = stats.ourStars;
            warDataRow[startCol - 1 + 3] = stats.oppStars;
        } else {
            warHeaderDataRow[startCol - 1] = 'War Status';
            warDataRow[startCol - 1] = 'Tidak ada War Aktif.';
        }
    });

    outputData.push(warHeaderDataRow.slice(0, maxColumns));
    outputData.push(warDataRow.slice(0, maxColumns));
    outputData.push(Array(maxColumns).fill(''));

    const cwlHeaderRow = Array(maxColumns).fill('');
    cwlHeaderRow[clanRanges[0].startCol - 1] = "🌟 CWL BULAN TERAKHIR";
    if (allClans[1]) cwlHeaderRow[clanRanges[1].startCol - 1] = "🌟 CWL BULAN TERAKHIR";
    outputData.push(cwlHeaderRow.slice(0, maxColumns));

    const list1 = cwlSummaries[allClans[0].tag]?.performanceList || [];
    const list2 = allClans[1] ? (cwlSummaries[allClans[1].tag]?.performanceList || []) : [];
    const maxListLength = Math.max(list1.length, list2.length);

    if (maxListLength > 0) {
        const listHeaderRow = Array(maxColumns).fill('');
        const listHeaders = ["Nama", "Tag", "⭐", "% Avg"];

        allClans.slice(0, 2).forEach((clan, i) => {
            const { startCol } = clanRanges[i];
            listHeaders.forEach((header, hIndex) => {
                listHeaderRow[startCol - 1 + hIndex] = header;
            });
        });
        outputData.push(listHeaderRow.slice(0, maxColumns));

        for (let i = 0; i < maxListLength; i++) {
            const dataRow = Array(maxColumns).fill('');
            if (i < list1.length) {
                const player = list1[i];
                dataRow[clanRanges[0].startCol - 1] = player.name;
                dataRow[clanRanges[0].startCol] = player.tag;
                dataRow[clanRanges[0].startCol + 1] = player.stars;
                dataRow[clanRanges[0].startCol + 2] = player.avgPercent;
            }
            if (allClans[1] && i < list2.length) {
                const player = list2[i];
                dataRow[clanRanges[1].startCol - 1] = player.name;
                dataRow[clanRanges[1].startCol] = player.tag;
                dataRow[clanRanges[1].startCol + 1] = player.stars;
                dataRow[clanRanges[1].startCol + 2] = player.avgPercent;
            }
            outputData.push(dataRow.slice(0, maxColumns));
        }
    } else {
        outputData.push(Array(maxColumns).fill(''));
        const infoRow = ['Tidak ada data CWL terbaru yang ditemukan di Arsip CWL. Harap arsipkan dulu.'].concat(Array(maxColumns - 1).fill(''));
        outputData.push(infoRow.slice(0, maxColumns));
    }

    dashboardSheet.getRange(1, 1, outputData.length, maxColumns).setValues(outputData);

    // --- PEMFORMATAN ---
    const colorKlan1Primary = '#0d47a1', colorKlan2Primary = '#b71c1c';
    const colorKlan1Secondary = '#1a2c3a', colorKlan2Secondary = '#3a1a1a';
    const colorFallback = '#212121', fontColor = '#FFFFFF', mainHeaderBg = '#212121';
    
    dashboardSheet.getRange(1, 1, 1, maxColumns).merge().setBackground(mainHeaderBg).setFontColor('#FFC107').setFontSize(18).setFontWeight('bold').setHorizontalAlignment('center');

    [3, 5, 9, 13].forEach(row => {
        allClans.slice(0, 2).forEach((clan, i) => {
            const { startCol } = clanRanges[i];
            const color = (i === 0 ? colorKlan1Primary : colorKlan2Primary);
            dashboardSheet.getRange(row, startCol, 1, CLAN_WIDTH).merge().setBackground(color).setFontColor(fontColor).setFontSize(row === 3 ? 14 : 11).setFontWeight('bold').setHorizontalAlignment('center');
            
            if (row === 9) {
                const stats = activeWarStats[clan.tag];
                const dataWarColor = (i === 0) ? colorKlan1Secondary : colorKlan2Secondary;
                
                if (stats.status === 'Tidak Dalam Perang') {
                    dashboardSheet.getRange(10, startCol, 2, CLAN_WIDTH).merge().setBackground(colorFallback).setFontColor('#9E9E9E').setHorizontalAlignment('center').setVerticalAlignment('middle').setFontWeight('normal');
                } else {
                    dashboardSheet.getRange(10, startCol, 1, CLAN_WIDTH).setBackground(color).setFontWeight('bold').setFontSize(10).setHorizontalAlignment('center').setFontColor(fontColor);
                    dashboardSheet.getRange(11, startCol, 1, CLAN_WIDTH).setBackground(dataWarColor).setFontWeight('bold').setHorizontalAlignment('center').setFontColor(fontColor);
                }
            }
        });
    });

    [6, 7].forEach(row => {
        allClans.slice(0, 2).forEach((clan, i) => {
            const { startCol } = clanRanges[i];
            const color = i === 0 ? colorKlan1Secondary : colorKlan2Secondary;
            const range = dashboardSheet.getRange(row, startCol, 1, CLAN_WIDTH).setBackground(color).setFontColor(fontColor).setVerticalAlignment('middle');
            if (row === 6) {
                range.setFontWeight('bold').setHorizontalAlignment('center');
            } else {
                dashboardSheet.getRange(row, startCol, 1, 2).setHorizontalAlignment('center');
                dashboardSheet.getRange(row, startCol + 2, 1, 2).setHorizontalAlignment('left');
            }
        });
    });

    if (maxListLength > 0) {
        const cwlHeaderRowIndex = 14;
        let playerListStartRow = cwlHeaderRowIndex + 1;
        
        allClans.slice(0, 2).forEach((clan, i) => {
            const { startCol } = clanRanges[i];
            const color = i === 0 ? colorKlan1Primary : colorKlan2Primary;
            dashboardSheet.getRange(cwlHeaderRowIndex, startCol, 1, 4).setBackground(color).setFontColor(fontColor).setFontWeight('bold').setHorizontalAlignment('center');
            dashboardSheet.getRange(cwlHeaderRowIndex, startCol).setHorizontalAlignment('left');
        });
        
        for (let r = playerListStartRow; r < playerListStartRow + maxListLength; r++) {
            allClans.slice(0, 2).forEach((clan, i) => {
                const { startCol } = clanRanges[i];
                const colorOdd = i === 0 ? colorKlan1Secondary : colorKlan2Secondary;
                const colorEven = i === 0 ? '#37474F' : '#4E342E';
                const rowColor = (r % 2 !== 0) ? colorOdd : colorEven;
                dashboardSheet.getRange(r, startCol, 1, 4).setBackground(rowColor).setFontColor(fontColor).setHorizontalAlignment('center');
                dashboardSheet.getRange(r, startCol).setHorizontalAlignment('left');
                dashboardSheet.getRange(r, startCol + 3).setNumberFormat('0.0%');
            });
        }
    }

    dashboardSheet.setColumnWidth(clanRanges[0].endCol + 1, 20);
    for (const range of clanRanges) {
        dashboardSheet.setColumnWidth(range.startCol, 100);
        dashboardSheet.setColumnWidth(range.startCol + 1, 100);
        dashboardSheet.setColumnWidth(range.startCol + 2, 190);
        dashboardSheet.setColumnWidth(range.startCol + 3, 190);
    }
    
    ss.toast('✅ Dashboard berhasil diperbarui!', 'SELESAI', 5);
    ss.setActiveSheet(dashboardSheet);
}

/**
 * Helper function untuk memproses data war mentah menjadi ringkasan status untuk Dashboard.
 * Fungsi ini menggunakan data API langsung untuk akurasi maksimal.
 * @param {object} warData - Objek data war dari API.
 * @param {string} ourClanTag - Tag klan kita untuk identifikasi.
 * @returns {object} Objek berisi status, serangan, bintang kita, dan bintang lawan.
 */
function _getWarStatus(warData, ourClanTag) {
    if (!warData || warData.state === 'notInWar') {
        return { status: 'Tidak Dalam Perang', attacks: 'N/A', ourStars: 'N/A', oppStars: 'N/A' };
    }

    const { ourClanData, opponentData } = Utils.normalizeWarData(warData, ourClanTag);
    const attacksUsed = (ourClanData.members || []).reduce((acc, member) => acc + (member.attacks ? member.attacks.length : 0), 0);
    const totalAttacks = ourClanData.members.length * warData.attacksPerMember;

    function calculateEffectiveStars(members) {
        const bestAttacksOnBases = {};
        (members || []).forEach(member => {
            (member.attacks || []).forEach(attack => {
                const defenderTag = attack.defenderTag;
                const currentBest = bestAttacksOnBases[defenderTag];
                if (!currentBest || attack.stars > currentBest.stars || (attack.stars === currentBest.stars && attack.destructionPercentage > currentBest.destructionPercentage)) {
                    bestAttacksOnBases[defenderTag] = { stars: attack.stars, destructionPercentage: attack.destructionPercentage };
                }
            });
        });
        return Object.values(bestAttacksOnBases).reduce((sum, attack) => sum + attack.stars, 0);
    }
    
    const ourEffectiveStars = calculateEffectiveStars(ourClanData.members);
    const opponentEffectiveStars = calculateEffectiveStars(opponentData.members);

    const ourDestruction = (ourClanData.destructionPercentage || 0).toFixed(2);
    const opponentDestruction = (opponentData.destructionPercentage || 0).toFixed(2);

    return {
        status: `${warData.state.toUpperCase()} vs ${opponentData.name || 'N/A'}`,
        attacks: `${attacksUsed} / ${totalAttacks}`,
        ourStars: `${ourEffectiveStars} (${ourDestruction}%)`,
        oppStars: `${opponentEffectiveStars} (${opponentDestruction}%)`
    };
}


/**
 * Mengambil dan mengagregasi semua metrik yang dibutuhkan untuk Dashboard.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss - Spreadsheet aktif.
 * @param {Object[]} allClans - Daftar klan dari Pengaturan.
 * @returns {Object} Objek berisi semua data yang sudah diagregasi.
 */
function getDashboardMetrics(ss, allClans) {
    const metrics = {
        totalWins: {}, totalWars: {}, topDonators: {}, topRaidLooters: {},
        promotionCandidates: {}, demotionRisks: {}, cwlSummaries: {}
    };

    allClans.slice(0, 2).forEach(clan => {
        const tag = clan.tag;
        metrics.promotionCandidates[tag] = 0;
        metrics.demotionRisks[tag] = 0;
        metrics.topDonators[tag] = { name: 'N/A', donations: 0 };
        metrics.topRaidLooters[tag] = { name: 'N/A', loot: 0 };
    });

    const participationData = ParticipationAggregator.getAggregatedParticipationData();
    participationData.forEach(player => {
        const tag = player.clanTag;
        if (metrics.promotionCandidates.hasOwnProperty(tag)) {
            const { statusIcon } = ParticipationAggregator.getPromotionDemotionStatus(player);
            if (player.role === 'Member' && statusIcon === '✔️') {
                metrics.promotionCandidates[tag]++;
            } else if (player.role === 'Elder' && statusIcon === '🔴') {
                metrics.demotionRisks[tag]++;
            }
        }
    });

    const memberSheet = ss.getSheetByName(SHEET_NAMES.ANGGOTA);
    if (memberSheet && memberSheet.getLastRow() > 1) {
        const memberData = memberSheet.getRange(2, 1, memberSheet.getLastRow() - 1, 7).getValues();
        memberData.forEach(row => {
            const tag = String(row[0]);
            const playerName = String(row[3]);
            const donation = Utils.parseNumber(row[6]);
            if (metrics.topDonators.hasOwnProperty(tag)) {
                if (donation > metrics.topDonators[tag].donations) {
                    metrics.topDonators[tag] = { name: playerName, donations: donation };
                }
            }
        });
    }

    const raidSheet = ss.getSheetByName(SHEET_NAMES.RAID_TERBARU);
    if (raidSheet && raidSheet.getLastRow() > 2) {
        const raidData = raidSheet.getDataRange().getValues();
        let currentTag = null;
        for (let i = 0; i < raidData.length; i++) {
            const row = raidData[i];
            const headerMatch = String(row[0]).match(/PERFORMA RAID: ([\w\s]+) \(/);
            if (headerMatch) {
                const clanName = headerMatch[1].trim();
                const clanObj = allClans.find(c => c.name.toUpperCase() === clanName.toUpperCase());
                currentTag = clanObj ? clanObj.tag : null;
            } else if (currentTag && row[0] === 1 && metrics.topRaidLooters.hasOwnProperty(currentTag)) {
                metrics.topRaidLooters[currentTag] = { name: String(row[1]), loot: Utils.parseNumber(row[3]) };
                currentTag = null;
            }
        }
    }

    allClans.slice(0, 2).forEach(clan => {
        metrics.cwlSummaries[clan.tag] = getLatestCwlSummary(ss, clan.tag);
    });

    return metrics;
}

/**
 * Mengambil ringkasan performa CWL dari musim terakhir di Arsip CWL.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss - Spreadsheet aktif.
 * @param {string} clanTag - Tag klan yang akan dianalisis.
 * @returns {Object|null} Objek ringkasan CWL atau null jika tidak ada data.
 */
function getLatestCwlSummary(ss, clanTag) {
    const archiveSheet = ss.getSheetByName(SHEET_NAMES.ARSIP_CWL);
    if (!archiveSheet || archiveSheet.getLastRow() < 2) return null;

    const data = archiveSheet.getRange(2, 1, archiveSheet.getLastRow() - 1, 10).getValues();
    let latestSeasonId = null;

    for (let i = data.length - 1; i >= 0; i--) {
        if (String(data[i][0] || '').trim() === clanTag && String(data[i][3]).startsWith('#') && data[i][1] && !String(data[i][1]).startsWith('--- START')) {
            latestSeasonId = String(data[i][1]).trim();
            break;
        }
    }

    if (!latestSeasonId) return null;

    let blockIdentifiers = new Set();
    let totalClanStars = 0;
    const playerStats = new Map();

    for (const row of data) {
        const rowClanTag = String(row[0] || '').trim();
        const seasonIdCandidate = String(row[1] || '').trim();
        const playerTag = String(row[3] || '').trim();

        if (rowClanTag === '' && seasonIdCandidate.startsWith('--- START')) {
            if (seasonIdCandidate.includes(clanTag) && seasonIdCandidate.includes(latestSeasonId)) {
                blockIdentifiers.add(seasonIdCandidate);
            }
        }

        if (seasonIdCandidate === latestSeasonId && rowClanTag === clanTag && playerTag.startsWith('#')) {
            const stars = Utils.parseNumber(row[8]);
            if (stars !== null) {
                totalClanStars += stars;
                const playerName = String(row[4] || '').trim();
                const percentage = Utils.parseNumber(row[9]);
                const currentStats = playerStats.get(playerTag) || { name: playerName, stars: 0, percentage: 0, attacks: 0 };
                playerStats.set(playerTag, {
                    name: playerName,
                    stars: currentStats.stars + stars,
                    percentage: currentStats.percentage + (percentage || 0),
                    attacks: currentStats.attacks + 1,
                });
            }
        }
    }

    const performanceList = Array.from(playerStats.values())
        .map(p => ({
            name: p.name, tag: p.tag, stars: p.stars, attacks: p.attacks,
            avgPercent: p.attacks > 0 ? (p.percentage / p.attacks) / 100 : 0
        }))
        .sort((a, b) => b.stars - a.stars || b.avgPercent - a.avgPercent);

    return {
        seasonId: latestSeasonId, totalStars: totalClanStars, totalWars: blockIdentifiers.size,
        performanceList: performanceList
    };
}


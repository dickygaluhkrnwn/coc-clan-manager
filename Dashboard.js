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
    ss.toast('Membangun Dashboard 4-Kolom...', 'DASHBOARD', -1);

    const allClans = Utils.getAllClans();
    if (allClans.length === 0) {
        dashboardSheet.getRange('A1').setValue('Harap atur klan di sheet Pengaturan.');
        return;
    }

    // [Struktur Layout yang Disederhanakan]
    // Total 4 kolom per klan (A:D dan F:I), 1 Kolom Pemisah Utama (E)
    const CLAN_WIDTH = 4; 
    const COL_GAP = 1; // Kolom Pemisah (E)
    const clanRanges = [
        { startCol: 1, endCol: CLAN_WIDTH, colorIndex: 0 },         // Klan 1 (A:D)
        { startCol: CLAN_WIDTH + COL_GAP + 1, endCol: CLAN_WIDTH * 2 + COL_GAP, colorIndex: 1 } // Klan 2 (F:I)
    ];
    const maxColumns = CLAN_WIDTH * 2 + COL_GAP; // 4 + 1 + 4 = 9

    // Persiapan data yang dibutuhkan
    const { totalWins, totalWars, topDonators, topRaidLooters, promotionCandidates, demotionRisks, cwlSummaries } = getDashboardMetrics(ss, allClans);
    // [BARU] Ambil data War Aktif
    const activeWarStats = _getWarStats(ss, allClans);

    // --- OUTPUT STRUKTUR DASAR DASHBOARD ---
    const outputData = [];

    // Row 1: Header Utama
    const headerRow = Array(maxColumns).fill('');
    headerRow[0] = `⚔️ GBK MANAGEMENT SYSTEM ⚔️`;
    outputData.push(headerRow.slice(0, maxColumns), Array(maxColumns).fill('')); // Row 1, Row 2 (Spacer)

    // Row 3: Header Klan
    const clanHeaderRow = Array(maxColumns).fill('');
    clanHeaderRow[clanRanges[0].startCol - 1] = `🛡️ ${allClans[0].name.toUpperCase()} (${allClans[0].tag}) 🛡️`;
    if (allClans[1]) {
        clanHeaderRow[clanRanges[1].startCol - 1] = `🔥 ${allClans[1].name.toUpperCase()} (${allClans[1].tag}) 🔥`;
    }
    outputData.push(clanHeaderRow.slice(0, maxColumns));
    outputData.push(Array(maxColumns).fill('')); // Row 4 (Spacer)

    // Row 5: Header Ringkasan Performa (Gabung 4 Kolom)
    const metricsHeaderRow = Array(maxColumns).fill('');
    metricsHeaderRow[clanRanges[0].startCol - 1] = "📈 RINGKASAN PERFORMA";
    if (allClans[1]) metricsHeaderRow[clanRanges[1].startCol - 1] = "📈 RINGKASAN PERFORMA";
    outputData.push(metricsHeaderRow.slice(0, maxColumns));

    // --- STRUKTUR METRIK PERFORMA (Rows 6 & 7) ---
    
    // Row 6: Header: Promosi (C1) | Demosi (C2) | Raid Looter (C3) | Top Donator (C4)
    const R6_metricHeader = Array(maxColumns).fill('');
    
    // Row 7: Data: Promosi Count (C1) | Demosi Count (C2) | Raid Looter Data (C3) | Top Donator Data (C4)
    const R7_metricData = Array(maxColumns).fill('');

    allClans.slice(0, 2).forEach((clan, i) => {
        const tag = clan.tag;
        const { startCol } = clanRanges[i];
        
        // --- Row 6: Header ---
        // Urutan: Promosi, Demosi, Raid Looter, Top Donator
        R6_metricHeader[startCol - 1 + 0] = 'Promosi (✔️)';     // Col 1 (A/F)
        R6_metricHeader[startCol - 1 + 1] = 'Demosi (❌)';       // Col 2 (B/G)
        R6_metricHeader[startCol - 1 + 2] = 'Raid Looter';       // Col 3 (C/H) - Dipisah
        R6_metricHeader[startCol - 1 + 3] = 'Top Donator';       // Col 4 (D/I) - Dipisah

        // --- Row 7: Data ---
        R7_metricData[startCol - 1 + 0] = promotionCandidates[tag]; // Col 1
        R7_metricData[startCol - 1 + 1] = demotionRisks[tag];       // Col 2
        
        // Col 3: Raid Looter Data
        R7_metricData[startCol - 1 + 2] = `${topRaidLooters[tag]?.name || 'N/A'} (${Utils.formatNumber(topRaidLooters[tag]?.loot || 0)})`;
        
        // Col 4: Top Donator Data
        R7_metricData[startCol - 1 + 3] = `${topDonators[tag]?.name || 'N/A'} (${Utils.formatNumber(topDonators[tag]?.donations || 0)})`;
    });

    outputData.push(R6_metricHeader.slice(0, maxColumns));   // New Row 6
    outputData.push(R7_metricData.slice(0, maxColumns));      // New Row 7
    outputData.push(Array(maxColumns).fill(''));              // New Row 8 (Spacer)


    // --- [BARU] STATUS WAR AKTIF (Rows 9, 10, 11) ---
    
    // Row 9: Header War Aktif
    const warHeaderRow = Array(maxColumns).fill('');
    warHeaderRow[clanRanges[0].startCol - 1] = "⚔️ STATUS WAR AKTIF";
    if (allClans[1]) warHeaderRow[clanRanges[1].startCol - 1] = "⚔️ STATUS WAR AKTIF";
    outputData.push(warHeaderRow.slice(0, maxColumns)); // Row 9

    // Row 10: Header Detail War
    const warHeaderDataRow = Array(maxColumns).fill('');
    
    // Row 11: Data War Aktif
    const warDataRow = Array(maxColumns).fill('');
    
    allClans.slice(0, 2).forEach((clan, i) => {
        const tag = clan.tag;
        const { startCol } = clanRanges[i];
        const stats = activeWarStats[tag];
        
        if (stats && stats.state !== 'NOTINWAR') {
            // Header Detail War (R10)
            warHeaderDataRow[startCol - 1 + 0] = 'STATUS';
            warHeaderDataRow[startCol - 1 + 1] = 'SISA SERANGAN';
            warHeaderDataRow[startCol - 1 + 2] = 'BINTANG KITA';
            warHeaderDataRow[startCol - 1 + 3] = 'BINTANG LAWAN';
            
            // Data Detail War (R11)
            warDataRow[startCol - 1 + 0] = `${stats.state.toUpperCase()} vs ${stats.opponentName}`;
            warDataRow[startCol - 1 + 1] = `${stats.attacksLeft} / ${stats.attacksTotal}`;
            // FIX: Gunakan data bintang dan kehancuran yang sudah diagregasi dari _getWarStats
            // Pembulatan Destruction Percentage ke angka bulat terdekat
            warDataRow[startCol - 1 + 2] = `${stats.ourStars} (${Math.round(stats.ourDestruction)}%)`; 
            warDataRow[startCol - 1 + 3] = `${stats.opponentStars} (${Math.round(stats.opponentDestruction)}%)`;
        } else {
             // Jika tidak ada war aktif
            warHeaderDataRow[startCol - 1] = 'War Status';
            warDataRow[startCol - 1] = 'Tidak ada War Aktif.';
            // Merge the rest of the columns for the non-active state message (A:D and F:I will be merged in formatting step)
        }
    });

    outputData.push(warHeaderDataRow.slice(0, maxColumns)); // Row 10 (Header Detail War)
    outputData.push(warDataRow.slice(0, maxColumns));       // Row 11 (Data Detail War)
    outputData.push(Array(maxColumns).fill(''));           // Row 12 (Spacer)


    // --- Row 13 & Seterusnya: Area CWL Summary (Index Bergeser) ---
    
    // Row 13 (Old Row 9): Header CWL
    const cwlHeaderRow = Array(maxColumns).fill('');
    cwlHeaderRow[clanRanges[0].startCol - 1] = "🌟 CWL BULAN TERAKHIR";
    if (allClans[1]) cwlHeaderRow[clanRanges[1].startCol - 1] = "🌟 CWL BULAN TERAKHIR";
    outputData.push(cwlHeaderRow.slice(0, maxColumns)); 

    // --- Row 14 & Seterusnya: Area CWL Dynamic Player List ---
    
    const list1 = cwlSummaries[allClans[0].tag]?.performanceList || [];
    const list2 = allClans[1] ? (cwlSummaries[allClans[1].tag]?.performanceList || []) : [];
    const maxListLength = Math.max(list1.length, list2.length);
    // currentRowForCwlList sekarang akan menjadi Row 14 (List Header)
    let currentRowForCwlList = outputData.length; 

    if (maxListLength > 0) {
        // Row List Headers (Row 14)
        const listHeaderRow = Array(maxColumns).fill('');
        const listHeaders = ["Nama", "Tag", "⭐", "% Avg"]; // 4 kolom data

        allClans.slice(0, 2).forEach((clan, i) => {
            const { startCol } = clanRanges[i];
            
            listHeaders.forEach((header, hIndex) => {
                listHeaderRow[startCol - 1 + hIndex] = header;
            });
        });
        outputData.push(listHeaderRow.slice(0, maxColumns)); 
        currentRowForCwlList++; // Row 15 (Start of Data)

        // Dynamic Data Body (Row 15 dst)
        for (let i = 0; i < maxListLength; i++) {
            const dataRow = Array(maxColumns).fill(''); 

            // Clan 1 Data (A:D)
            if (i < list1.length) {
                const player = list1[i];
                dataRow[clanRanges[0].startCol - 1] = player.name;         
                dataRow[clanRanges[0].startCol] = player.tag;             
                dataRow[clanRanges[0].startCol + 1] = player.stars;       
                dataRow[clanRanges[0].startCol + 2] = player.avgPercent;  
            }

            // Clan 2 Data (F:I)
            if (allClans[1] && i < list2.length) {
                const player = list2[i];
                dataRow[clanRanges[1].startCol - 1] = player.name;         
                dataRow[clanRanges[1].startCol] = player.tag;             
                dataRow[clanRanges[1].startCol + 1] = player.stars;       
                dataRow[clanRanges[1].startCol + 2] = player.avgPercent;  
            }
            outputData.push(dataRow.slice(0, maxColumns));
            currentRowForCwlList++;
        }
    } else {
        // Jika tidak ada data CWL
        outputData.push(Array(maxColumns).fill(''));
        const infoRow = ['Tidak ada data CWL terbaru yang ditemukan di Arsip CWL. Harap arsipkan dulu.'].concat(Array(maxColumns - 1).fill(''));
        outputData.push(infoRow.slice(0, maxColumns));
        currentRowForCwlList += 2;
    }

    // Tulis semua data ke sheet
    dashboardSheet.getRange(1, 1, outputData.length, maxColumns).setValues(outputData);
    
    // --- VARIABEL WARNA & FORMATTING KRITIS (Inline) ---
    const colorKlan1Primary = '#0d47a1'; 
    const colorKlan2Primary = '#b71c1c'; 
    const colorKlan1Secondary = '#1a2c3a'; 
    const colorKlan2Secondary = '#3a1a1a'; 
    const colorFallback = '#212121'; // Warna untuk status TIDAK ADA WAR
    const fontColor = '#FFFFFF';
    const mainHeaderBg = '#212121'; 
    
    // Row 1: Header Utama
    let currentRow = 1;
    dashboardSheet.getRange(currentRow, 1, 1, maxColumns).merge().setBackground(mainHeaderBg).setFontColor('#FFC107').setFontSize(18).setFontWeight('bold').setHorizontalAlignment('center');
    currentRow += 2; 
    
    // Pemformatan Statis (Merge & Background) untuk Baris 3, 5, 9 (Ringkasan Perf.), 13 (CWL)
    [3, 5, 9, 13].forEach(row => {
        allClans.slice(0, 2).forEach((clan, i) => {
            const { startCol } = clanRanges[i];
            const color = (row === 3 || row === 9 || row === 13) ? (i === 0 ? colorKlan1Primary : colorKlan2Primary) : (i === 0 ? colorKlan1Primary : colorKlan2Primary);
            
            // Header Utama Klan/Sub-Header (R3, R5, R9, R13)
            dashboardSheet.getRange(row, startCol, 1, CLAN_WIDTH).merge().setBackground(color).setFontColor(fontColor).setFontSize(row === 3 ? 14 : 11).setFontWeight('bold').setHorizontalAlignment('center');
            
            // [BARU] Merge WAR AKTIF STATUS (R9)
            if (row === 9) { 
                const stats = activeWarStats[clan.tag];
                const dataWarColor = (i === 0) ? colorKlan1Secondary : colorKlan2Secondary;
                
                if (!stats || stats.state === 'NOTINWAR') {
                    // Jika tidak ada war, merge seluruh 4 kolom untuk pesan 'Tidak ada War Aktif.' (R10 & R11)
                    dashboardSheet.getRange(10, startCol, 2, CLAN_WIDTH).merge().setBackground(colorFallback).setFontColor('#9E9E9E').setHorizontalAlignment('center').setFontWeight('normal');
                } else {
                    // Pemformatan Header Detail War (R10)
                    dashboardSheet.getRange(10, startCol, 1, CLAN_WIDTH).setBackground(color).setFontWeight('bold').setFontSize(10).setHorizontalAlignment('center').setFontColor(fontColor);
                    
                    // Pemformatan Data Detail War (R11)
                    // FIX KRITIS: Menetapkan warna data War Aktif (R11)
                    dashboardSheet.getRange(11, startCol, 1, CLAN_WIDTH).setBackground(dataWarColor).setFontWeight('bold').setHorizontalAlignment('center').setFontColor(fontColor); 
                    dashboardSheet.getRange(11, startCol + 2).setNumberFormat('0'); // Bintang Kita
                    dashboardSheet.getRange(11, startCol + 3).setNumberFormat('0'); // Bintang Lawan
                }
            }
        });
    });
    
    // Pemformatan Metrik (Row 6 & 7)
    [6, 7].forEach(row => {
        allClans.slice(0, 2).forEach((clan, i) => {
            const { startCol } = clanRanges[i];
            const color = i === 0 ? colorKlan1Secondary : colorKlan2Secondary;
            
            // Apply background to the entire metric area (4 kolom)
            dashboardSheet.getRange(row, startCol, 1, CLAN_WIDTH).setBackground(color).setFontColor(fontColor).setHorizontalAlignment('center').setVerticalAlignment('middle');

            if (row === 6) { // Header Row
                dashboardSheet.getRange(row, startCol, 1, CLAN_WIDTH).setFontWeight('bold'); 
            } else if (row === 7) { // Data Row
                // Alignment Center untuk Kolom Promosi dan Demosi (Col 1 & 2)
                dashboardSheet.getRange(row, startCol).setHorizontalAlignment('center'); 
                dashboardSheet.getRange(row, startCol + 1).setHorizontalAlignment('center'); 

                // Alignment Kiri untuk Kolom Raid Looter (Col 3)
                dashboardSheet.getRange(row, startCol + 2).setHorizontalAlignment('left'); 
                
                // Alignment Kiri untuk Kolom Top Donator (Col 4)
                dashboardSheet.getRange(row, startCol + 3).setHorizontalAlignment('left');
            }
        });
    });
    
    // Pemformatan CWL Player List
    if (maxListLength > 0) {
        const cwlHeaderRowIndex = 13 + 1; // Row 14 adalah list header
        let playerListStartRow = cwlHeaderRowIndex + 1; // Row 15 adalah data pertama
        let playerListEndRow = playerListStartRow + maxListLength - 1;
        
        // CWL List Header Row (Row 14)
        allClans.slice(0, 2).forEach((clan, i) => {
            const { startCol } = clanRanges[i];
            const color = i === 0 ? colorKlan1Primary : colorKlan2Primary;
            dashboardSheet.getRange(cwlHeaderRowIndex, startCol, 1, 4).setBackground(color).setFontColor(fontColor).setFontWeight('bold').setHorizontalAlignment('center');
            dashboardSheet.getRange(cwlHeaderRowIndex, startCol, 1, 1).setHorizontalAlignment('left'); 
        });
        
        // CWL Data Body (Row 15 dst)
        for (let r = playerListStartRow; r <= playerListEndRow; r++) {
            allClans.slice(0, 2).forEach((clan, i) => {
                const { startCol } = clanRanges[i];
                const colorOdd = i === 0 ? colorKlan1Secondary : colorKlan2Secondary; 
                const colorEven = i === 0 ? '#37474F' : '#4E342E'; 
                
                // Logika pewarnaan berselang-seling
                const rowColor = (r % 2 === 0) ? colorEven : colorOdd;
                
                dashboardSheet.getRange(r, startCol, 1, 4).setBackground(rowColor).setFontColor(fontColor).setHorizontalAlignment('center');
                dashboardSheet.getRange(r, startCol, 1, 1).setHorizontalAlignment('left'); 
                dashboardSheet.getRange(r, startCol + 3).setNumberFormat('0.0%');
            });
        }
    }

    // --- Pengaturan Lebar Kolom Akhir (FIXED WIDTHS) ---
    
    dashboardSheet.setColumnWidth(clanRanges[0].endCol + 1, 20); // Kolom Pemisah (E)
    
    for (const range of clanRanges) {
        // Kolom 1-4 (Total 4 Kolom)
        dashboardSheet.setColumnWidth(range.startCol, 100);    // Col 1: Promosi / Status War
        dashboardSheet.setColumnWidth(range.startCol + 1, 100);  // Col 2: Demosi / Sisa Serangan
        dashboardSheet.setColumnWidth(range.startCol + 2, 190);  // Col 3: Raid Looter / Bintang Kita
        dashboardSheet.setColumnWidth(range.startCol + 3, 190);  // Col 4: Top Donator / Bintang Lawan
    }
    
    ss.toast('✅ Dashboard 4-Kolom Estetik berhasil diperbarui!', 'SELESAI', 5);
    ss.setActiveSheet(dashboardSheet);
}

/**
 * Helper: Mengambil status War Aktif dan menghitung sisa serangan/stats.
 * Membaca data dari sheet 'Perang Aktif'.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss - Spreadsheet aktif.
 * @param {Object[]} allClans - Daftar klan dari Pengaturan.
 * @returns {Object} War stats per clan tag.
 */
function _getWarStats(ss, allClans) {
    const sheet = ss.getSheetByName(SHEET_NAMES.PERANG_AKTIF);
    const calculatedWarStats = {};
    if (!sheet || sheet.getLastRow() < 3) return calculatedWarStats;

    const data = sheet.getDataRange().getValues();
    
    // Map clan names from Pengaturan to Tags
    const clanNameMap = new Map(allClans.map(c => [c.name.toUpperCase(), c.tag]));

    const foundClansInWar = new Set();
    
    // Loop untuk menemukan blok War AKTIF terbaru untuk setiap klan
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowString = String(row[0]).toUpperCase();

        if (rowString.startsWith('⚔️')) {
            // Start of a new War Block
            let attacksUsedTotal = 0;
            let attacksAllowedTotal = 0;
            let totalOurStars = 0;
            let totalOpponentStars = 0;
            let totalOurDestruction = 0;
            let totalOpponentDestruction = 0;
            let playerCount = 0;
            
            const clanNameMatch = rowString.match(/⚔️\s*(.*?)\s*\(/);
            const clanName = clanNameMatch ? clanNameMatch[1].trim().toUpperCase() : null;
            const foundClanTag = clanNameMap.get(clanName);
            
            if (foundClanTag && !foundClansInWar.has(foundClanTag)) {
                
                const currentClanTag = foundClanTag;
                foundClansInWar.add(currentClanTag);

                const stateMatch = rowString.match(/STATE:\s*(\w+)\)/i);
                const opponentMatch = rowString.match(/vs (.*?) \(/);
                const state = stateMatch ? stateMatch[1] : 'N/A';
                const opponentName = opponentMatch ? opponentMatch[1].trim() : 'N/A';
                
                calculatedWarStats[currentClanTag] = {
                    state: state,
                    opponentName: opponentName,
                    ourStars: 0, 
                    ourDestruction: 0, 
                    opponentStars: 0,
                    opponentDestruction: 0,
                    attacksLeft: 0, 
                    attacksTotal: 0
                };

                // Player data starts at i + 2
                for (let j = i + 2; j < data.length; j++) {
                    const playerRow = data[j];
                    const playerRowString = String(playerRow[0]).toUpperCase();

                    if (!playerRowString.startsWith('#')) {
                        break;
                    }
                    
                    playerCount++;

                    // --- Aggregation of Attacks ---
                    // Col D: Status Kita (e.g., "❌ 0/2" or "✔️ 2/2")
                    const ourStatus = String(playerRow[3] || '').trim();
                    const match = ourStatus.match(/(\d)\/(\d)/);

                    if (match) {
                        const used = parseInt(match[1]);
                        const allowed = parseInt(match[2]);
                        attacksUsedTotal += used;
                        attacksAllowedTotal += allowed; 
                    }

                    // --- Aggregation of War Stats (Bintang dan Persen) ---
                    // Col F: Bintang Kita, Col G: Persen Kita
                    const ourStars = Utils.parseNumber(playerRow[5]) || 0;
                    const ourDestruction = Utils.parseNumber(playerRow[6]) || 0;
                    
                    // Col N: Bintang Lawan, Col O: Persen Lawan
                    const oppStars = Utils.parseNumber(playerRow[13]) || 0;
                    const oppDestruction = Utils.parseNumber(playerRow[14]) || 0;
                    
                    totalOurStars += ourStars;
                    totalOpponentStars += oppStars;
                    totalOurDestruction += ourDestruction;
                    totalOpponentDestruction += oppDestruction;
                }

                // Finalize stats for this block
                const avgOurDestruction = (playerCount > 0) ? (totalOurDestruction / playerCount) : 0;
                const avgOpponentDestruction = (playerCount > 0) ? (totalOpponentDestruction / playerCount) : 0;
                
                calculatedWarStats[currentClanTag].attacksLeft = Math.max(0, attacksAllowedTotal - attacksUsedTotal);
                calculatedWarStats[currentClanTag].attacksTotal = attacksAllowedTotal;
                
                calculatedWarStats[currentClanTag].ourStars = totalOurStars;
                calculatedWarStats[currentClanTag].opponentStars = totalOpponentStars;
                
                // Destruction is the sum of destruction percentages divided by total number of attacks used, or simplified as total destruction of all bases / total bases.
                // Since this detail sheet doesn't easily show total destruction, we use the average destruction per player, which is the sum of (Col G) / playerCount.
                calculatedWarStats[currentClanTag].ourDestruction = avgOurDestruction;
                calculatedWarStats[currentClanTag].opponentDestruction = avgOpponentDestruction;

            }
        }
    }

    // Tambahkan War stats dummy (NOTINWAR) untuk klan yang tidak ditemukan
    allClans.forEach(clan => {
        if (!calculatedWarStats.hasOwnProperty(clan.tag)) {
             calculatedWarStats[clan.tag] = { state: 'NOTINWAR', opponentName: 'N/A' };
        }
    });
    
    return calculatedWarStats;
}

function getLatestCwlSummary(ss, clanTag) {
    const archiveSheet = ss.getSheetByName(SHEET_NAMES.ARSIP_CWL);
    if (!archiveSheet || archiveSheet.getLastRow() < 2) return null;

    // AMBIL KOLOM A HINGGA J (10 kolom - Index 0 hingga 9)
    // Index 0: Tag Klan, Index 1: ID Musim/Identifier, Index 3: Tag Pemain, Index 4: Nama Pemain, Index 8: Bintang, Index 9: Persen
    const data = archiveSheet.getRange(2, 1, archiveSheet.getLastRow() - 1, 10).getValues();

    let latestSeasonId = null;

    // 1. Cari ID Musim terbaru untuk klan ini (Iterasi mundur)
    for (let i = data.length - 1; i >= 0; i--) {
        const row = data[i];
        const rowClanTag = String(row[0] || '').trim(); // Kolom A
        const seasonIdCandidate = String(row[1] || '').trim(); // Kolom B (ID MusIM atau Identifier)

        // Cari baris data pemain CWL klan kita
        if (rowClanTag === clanTag && String(row[3]).startsWith('#') && seasonIdCandidate && !seasonIdCandidate.startsWith('--- START')) {
            latestSeasonId = seasonIdCandidate;
            break;
        }
    }

    if (!latestSeasonId) return null;

    let blockIdentifiers = new Set();
    let totalClanStars = 0;
    // Map sekarang menggunakan Tag Pemain sebagai kunci agregasi dan menyimpan {tag, name, stars, percentage, attacks}
    const playerStats = new Map();

    // 2. Kumpulkan semua Block Identifier dan hitung total bintang/persentase.
    for (const row of data) {
        const rowClanTag = String(row[0] || '').trim();
        const seasonIdCandidate = String(row[1] || '').trim();
        const playerTag = String(row[3] || '').trim(); // Kolom D: Tag Pemain (Index 3)
        const playerName = String(row[4] || '').trim(); // Kolom E: Nama Pemain (Index 4)
        const stars = Utils.parseNumber(row[8]); // Kolom I: Bintang Kita (Index 8)
        const percentage = Utils.parseNumber(row[9]); // Kolom J: Persen Kita (Index 9)

        // --- LOGIKA HEADER BLOK (Menghitung Total War) ---
        const isWarBlockHeader = rowClanTag === '' && seasonIdCandidate.startsWith('--- START');

        if (isWarBlockHeader) {
            const identifier = seasonIdCandidate;
            // Kita hanya tambahkan ke set jika identifier ini milik klan kita dan musim terbaru
            if (identifier.includes(clanTag) && identifier.includes(latestSeasonId)) {
                blockIdentifiers.add(identifier);
            }
        }

        // --- LOGIKA PENGHITUNGAN BINTANG & PERSEN ---
        if (seasonIdCandidate === latestSeasonId && rowClanTag === clanTag && playerTag.startsWith('#')) {
            if (stars !== null) {
                totalClanStars += stars;

                // Agregasi bintang/persen/serangan per pemain (menggunakan Tag sebagai kunci unik)
                const currentStats = playerStats.get(playerTag) || {
                    tag: playerTag, // Simpan Tag di objek
                    name: playerName,
                    stars: 0,
                    percentage: 0,
                    attacks: 0
                };
                playerStats.set(playerTag, {
                    tag: playerTag,
                    name: playerName,
                    stars: currentStats.stars + stars,
                    percentage: currentStats.percentage + (percentage || 0),
                    attacks: currentStats.attacks + 1,
                });
            }
        }
    }

    const totalWarDays = blockIdentifiers.size;

    // 3. Kompilasi Daftar Performa Lengkap
    const performanceList = Array.from(playerStats.values())
        .map(p => ({
            name: p.name,
            tag: p.tag,
            stars: p.stars,
            attacks: p.attacks,
            // Hitung rata-rata persentase kehancuran (Dibiarkan sebagai angka desimal 0.0 - 1.0)
            avgPercent: p.attacks > 0 ? (p.percentage / p.attacks) / 100 : 0 
            // Dibagi 100 karena data persentase dari API/Arsip (Kolom J) biasanya dalam bentuk 95.0, 
            // padahal untuk format Spreadsheet 0.0% dibutuhkan nilai 0.95.
        }))
        // Urutkan berdasarkan Bintang Total, lalu Rata-rata Persentase
        .sort((a, b) => {
            if (b.stars !== a.stars) return b.stars - a.stars;
            // Di sini kita bandingkan langsung angka (bukan string)
            return b.avgPercent - a.avgPercent; 
        });

    return {
        seasonId: latestSeasonId,
        totalStars: totalClanStars,
        totalWars: totalWarDays,
        performanceList: performanceList // Mengganti rankSummaryLines dengan list performa lengkap
    };
}


function getDashboardMetrics(ss, allClans) {
    const metrics = {
        totalWins: {}, totalWars: {},
        topDonators: {},
        topRaidLooters: {},
        promotionCandidates: {},
        demotionRisks: {},
        cwlSummaries: {} // Tambahkan CWL Summaries
    };

    allClans.slice(0, 2).forEach(clan => {
        const tag = clan.tag;
        metrics.totalWins[tag] = 0;
        metrics.totalWars[tag] = 0;
        metrics.promotionCandidates[tag] = 0;
        metrics.demotionRisks[tag] = 0;
        metrics.topDonators[tag] = { name: 'N/A', donations: 0 };
        metrics.topRaidLooters[tag] = { name: 'N/A', loot: 0 };
    });

    // 1. War Log (Win Rate)
    const warLogSheet = ss.getSheetByName(SHEET_NAMES.LOG_PERANG);
    if (warLogSheet && warLogSheet.getLastRow() > 1) {
        // Kolom A: Tag Klan, Kolom D: Hasil
        const logData = warLogSheet.getRange(2, 1, warLogSheet.getLastRow() - 1, 4).getValues();
        logData.forEach(row => {
            const tag = String(row[0]);
            const result = String(row[3]).toLowerCase();
            if (metrics.totalWars.hasOwnProperty(tag)) {
                metrics.totalWars[tag]++;
                if (result === 'win') {
                    metrics.totalWins[tag]++;
                }
            }
        });
    }

    // 2. Anggota (Top Donator)
    const memberSheet = ss.getSheetByName(SHEET_NAMES.ANGGOTA);
    if (memberSheet && memberSheet.getLastRow() > 1) {
        // Kolom A: Tag Klan, Kolom D: Nama, Kolom G: Donasi
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

    // 3. Raid Terbaru (Top Raid Looter)
    const raidSheet = ss.getSheetByName(SHEET_NAMES.RAID_TERBARU);
    if (raidSheet && raidSheet.getLastRow() > 2) {
        // Data Raid Terbaru harus dipecah per klan, cari header PERFORMA RAID
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
                // Baris Peringkat 1
                const topLooterName = String(row[1]);
                const totalLoot = Utils.parseNumber(row[3]);
                metrics.topRaidLooters[currentTag] = { name: topLooterName, loot: totalLoot };
                currentTag = null; // Berhenti mencari data klan ini setelah mendapatkan top looter
            }
        }
    }

    // 4. Partisipasi (Promosi/Demosi)
    const participationData = ParticipationAggregator.getAggregatedParticipationData();
    participationData.forEach(player => {
        const tag = player.clanTag;
        if (metrics.promotionCandidates.hasOwnProperty(tag)) {
            const { statusIcon } = ParticipationAggregator.getPromotionDemotionStatus(player);
            if (player.role === 'Member' && statusIcon === '✔️') { // Promosi (Member)
                metrics.promotionCandidates[tag]++;
            } else if (player.role === 'Elder' && statusIcon === '🔴') { // Demosi (Elder)
                metrics.demotionRisks[tag]++;
            }
        }
    });

    // 5. CWL Summary
    allClans.slice(0, 2).forEach(clan => {
        metrics.cwlSummaries[clan.tag] = getLatestCwlSummary(ss, clan.tag);
    });

    return metrics;
}

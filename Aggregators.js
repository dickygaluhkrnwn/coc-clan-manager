// SELURUH KODE LENGKAP - Aggregators.gs (V5.88 - FIX Classic War Aggregation V2)
/**
 * =================================================================
 * AGGREGATORS.GS: Berisi semua logika agregasi data (Partisipasi).
 * - ParticipationAggregator: Menghitung metrik War/CWL untuk Promosi/Demosi.
 * =================================================================
 */

// Objek untuk mengelola semua perhitungan Partisipasi
const ParticipationAggregator = {
    
    /**
     * Mengambil data anggota dasar dari sheet Anggota.
     * @returns {Map<string, Object>} Map dengan playerTag sebagai kunci.
     */
    _initializeMemberData: function() {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const memberSheet = ss.getSheetByName(SHEET_NAMES.ANGGOTA);
        if (!memberSheet || memberSheet.getLastRow() < 2) return new Map();

        // Ambil Tag Klan, Nama Klan, Tag Pemain, Nama Pemain, Role, TH Level (Kolom A-F)
        const data = memberSheet.getRange(2, 1, memberSheet.getLastRow() - 1, 6).getValues();
        const memberData = new Map();

        data.forEach(row => {
            const [clanTag, clanName, playerTag, playerName, role, thLevel] = row; 
            
            if (playerTag && String(playerTag).startsWith('#')) {
                // Perbaikan: Mencoba dua properti Town Hall Level yang paling umum
                let thLevelParsed = Utils.parseNumber(thLevel);

                memberData.set(playerTag, {
                    playerTag: String(playerTag).trim(),
                    playerName: String(playerName).trim(),
                    clanTag: String(clanTag).trim(),
                    clanName: String(clanName).trim(),
                    role: String(role).trim(),
                    thLevel: thLevelParsed,
                    
                    // Metrik Agregasi War/CWL/Raid
                    cwlAttacksUsed: 0,
                    cwlWarsFailed: 0,
                    classicWarsParticipated: 0,
                    classicWarsFailed: 0,
                    raidSeasonsParticipated: 0,
                    
                    // Set untuk melacak hari CWL unik (digunakan untuk menghitung Penalti)
                    cwlWarsRegistered: new Set(),
                });
            }
        });
        return memberData;
    },

    /**
     * Mengagregasi data War Classic dari Arsip Perang.
     * @param {Map<string, Object>} memberData
     */
    _aggregateClassicWar: function(memberData) {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const archiveSheet = ss.getSheetByName(SHEET_NAMES.ARSIP_PERANG);
        if (!archiveSheet || archiveSheet.getLastRow() < 2) return;

        // DATA WAR CLASSIC di Arsip Perang
        // Ambil data dari Kolom F hingga Kolom J (5 kolom)
        // Kolom: [Tag Pemain Kita (F), Nama, TH, Status Kita (I), Target Kita (J)]
        const data = archiveSheet.getRange(2, 6, archiveSheet.getLastRow() - 1, 5).getValues();
        const attacksRequired = 2; // War Classic membutuhkan 2 serangan

        data.forEach(row => {
            const playerTag = String(row[0] || "").trim(); // Kolom F (Indeks 0)
            const status = String(row[3] || "").trim(); 	// Kolom I (Indeks 3): Status Kita (e.g., "✔️ 2/2" atau "❌ 0/2")
            
            const player = memberData.get(playerTag);

            // Kita hanya memproses baris data pemain yang valid
            if (player && playerTag.startsWith('#') && status) {
                
                // Ekstrak serangan yang digunakan dari string status (misal: "✔️ 2/2" -> 2)
                const attacksUsedMatch = status.match(/(\d)\/2/);
                const attacksUsed = attacksUsedMatch ? Utils.parseNumber(attacksUsedMatch[1]) : 0;
                
                // --- PERUBAHAN LOGIKA DI SINI ---
                
                if (attacksUsed === attacksRequired) { 
                    // Kasus 1: Menggunakan 2 serangan (War Classic Valid)
                    player.classicWarsParticipated += 1; 
                    
                } else if (attacksUsed === 0) {
                    // Kasus 2: Menggunakan 0 serangan (War Classic Gagal/Penalti)
                    player.classicWarsFailed += 1; 
                    
                } 
                // Kasus 3: Menggunakan 1 serangan (attacksUsed === 1) tidak dihitung, 
                // sehingga tidak ada perubahan pada classicWarsParticipated atau classicWarsFailed.
            }
        });
    },

    /**
     * Mengagregasi data CWL dari Arsip CWL.
     * @param {Map<string, Object>} memberData
     */
    _aggregateCwlWar: function(memberData) {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const archiveSheet = ss.getSheetByName(SHEET_NAMES.ARSIP_CWL);
        if (!archiveSheet || archiveSheet.getLastRow() < 2) return;

        // Ambil data dari Kolom B (ID Musim), Kolom D (Tag Pemain), Kolom G (Status)
        // Range: Kolom B - G (6 kolom total)
        // [ID Musim/Identifier (B), Tanggal Arsip (C), Tag Pemain (D), Nama Pemain (E), TH (F), Status (G)]
        const data = archiveSheet.getRange(2, 2, archiveSheet.getLastRow() - 1, 6).getValues(); 
        let currentWarBlock = null;

        data.forEach(row => {
            const blockIdentifier = String(row[0] || "").trim(); // Kolom B (Indeks 0)
            const playerTag = String(row[2] || "").trim(); 		// Kolom D (Indeks 2): Tag Pemain
            const attackStatus = String(row[5] || "").trim(); 	// Kolom G (Indeks 5): Status (e.g., "✔️" atau "❌")
            
            // 1. Lacak Block Identifier (Header War Day)
            if (blockIdentifier.startsWith('--- START')) {
                currentWarBlock = blockIdentifier;
                return;
            }

            const player = memberData.get(playerTag);

            if (player && currentWarBlock) {
                // 2. Track Attacks Used (Success)
                if (attackStatus.startsWith('✔️')) {
                    player.cwlAttacksUsed += 1; // Menghitung serangan CWL sukses (VALID)
                }
                
                // 3. Track Registered Days (Opportunity/Kesempatan)
                // Hanya hitung jika pemain benar-benar ada di row data (bukan baris kosong/header)
                if (playerTag.startsWith('#')) {
                    player.cwlWarsRegistered.add(currentWarBlock); // Total hari CWL yang didaftarkan
                }
            }
        });

        // 4. Final Calculation of Penalties
        memberData.forEach(player => {
            // CWL (Valid) = Total serangan yang digunakan (player.cwlAttacksUsed)
            // CWL (Gagal/Penalti) = Total Hari Didaftarkan - Total Serangan yang Digunakan
            const registeredDays = player.cwlWarsRegistered.size;
            const attacksUsed = player.cwlAttacksUsed;
            
            player.cwlWarsFailed = registeredDays - attacksUsed; 
            
            // Pastikan Penalti tidak pernah negatif
            if (player.cwlWarsFailed < 0) player.cwlWarsFailed = 0;
        });
    },

    /**
     * Mengambil data Partisipasi total.
     * @returns {Object[]} Array dari objek pemain yang teragregasi.
     */
    getAggregatedParticipationData: function() {
        const memberData = this._initializeMemberData();
        this._aggregateClassicWar(memberData);
        this._aggregateCwlWar(memberData);
        
        return Array.from(memberData.values());
    },
    
    /**
     * Menentukan status Promosi/Demosi berdasarkan metrik.
     * Aturan: 3x Sukses = Promosi (Member), 3x Gagal = Demosi (Elder)
     * @param {Object} player - Objek pemain yang sudah teragregasi.
     * @returns {{statusIcon: string, keterangan: string}}
     */
    getPromotionDemotionStatus: function(player) {
        const SUCCESS_LIMIT = 3;
        const PENALTY_LIMIT = 3;
        
        const totalSuccess = player.cwlAttacksUsed + player.classicWarsParticipated;
        const totalPenalty = player.cwlWarsFailed + player.classicWarsFailed;
        
        const isLeaderOrCo = (player.role === 'Leader' || player.role === 'Co-Leader');
        
        if (isLeaderOrCo) {
            // Leader/Co-Leader hanya dipantau
            return { statusIcon: '🟢', keterangan: 'Aman (Leader/Co-Leader)' };
        } 
        
        // --- 1. ATURAN DEMOSI (untuk Elder) ---
        if (player.role === 'Elder') {
            if (totalPenalty >= PENALTY_LIMIT) {
                return { statusIcon: '🔴', keterangan: `Demosi ke Member (Penalti ${totalPenalty}x)` };
            }
            if (totalPenalty > 0) {
                return { statusIcon: '🟢', keterangan: `Aman (Memiliki ${totalPenalty}x Penalti)` };
            }
            return { statusIcon: '🟢', keterangan: 'Aman' };
        }
        
        // --- 2. ATURAN PROMOSI (untuk Member) ---
        if (player.role === 'Member') {
            // Prioritas 1: Promosi
            if (totalSuccess >= SUCCESS_LIMIT) {
                return { statusIcon: '✔️', keterangan: `Promosi ke Elder (Sukses ${totalSuccess}x)` };
            }
            
            // Prioritas 2: Pelanggaran (Demosi Manual/Kick)
            if (totalPenalty >= PENALTY_LIMIT) {
                 return { statusIcon: '🔴', keterangan: `Pelanggaran (Demosi Manual/Kick)` };
            }

            // Prioritas 3: Aman / Netral
            if (totalSuccess > 0) {
                 return { statusIcon: '🟢', keterangan: `Aman (${totalSuccess}x Sukses)` };
            }
            if (totalPenalty > 0) {
                 return { statusIcon: '🟢', keterangan: `Aman (Memiliki ${totalPenalty}x Penalti)` };
            }

            // Jika 0 Sukses dan 0 Penalti
            return { statusIcon: '🟢', keterangan: 'Aman (Tidak Aktif/Baru)' };
        }
        
        return { statusIcon: '🟢', keterangan: 'Aman' };
    }
};

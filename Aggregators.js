// SELURUH KODE LENGKAP - Aggregators.js (V6.3 - Sesuai dengan Deteksi Otomatis)
/**
 * =================================================================
 * AGGREGATORS.GS: Berisi semua logika agregasi data (Partisipasi).
 * * PENGEMBANGAN V6.3: Logika disesuaikan untuk membaca 'Log Perubahan Role'
 * yang sekarang diisi secara otomatis oleh KodeUtama.js.
 * =================================================================
 */

// Objek untuk mengelola semua perhitungan Partisipasi
const ParticipationAggregator = {
    
    /**
     * Mengambil data anggota dasar dan log perubahan role terakhir mereka.
     * @returns {Map<string, Object>} Map dengan playerTag sebagai kunci.
     */
    _initializeMemberData: function() {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const memberSheet = ss.getSheetByName(SHEET_NAMES.ANGGOTA);
        if (!memberSheet) return new Map();

        // 1. Ambil Log Perubahan Role TERAKHIR untuk setiap pemain
        const logSheet = ss.getSheetByName('Log Perubahan Role');
        const roleChangeLogs = new Map();
        if (logSheet && logSheet.getLastRow() > 1) {
            // Ambil data: Timestamp (A), Player Tag (B)
            const logData = logSheet.getRange(2, 1, logSheet.getLastRow() - 1, 2).getValues();
            logData.forEach(([timestamp, playerTag]) => {
                if (playerTag) {
                    // Selalu simpan timestamp terbaru jika ada duplikat untuk pemain yang sama
                    roleChangeLogs.set(String(playerTag).trim().toUpperCase(), new Date(timestamp));
                }
            });
        }
        
        // 2. Inisialisasi data anggota dari sheet Anggota
        const memberData = new Map();
        if (memberSheet.getLastRow() < 2) return memberData;
        const data = memberSheet.getRange(2, 1, memberSheet.getLastRow() - 1, 6).getValues();

        data.forEach(row => {
            const [clanTag, clanName, playerTag, playerName, role, thLevel] = row; 
            const cleanPlayerTag = String(playerTag).trim().toUpperCase();

            if (playerTag && cleanPlayerTag.startsWith('#')) {
                memberData.set(cleanPlayerTag, {
                    playerTag: cleanPlayerTag,
                    playerName: String(playerName).trim(),
                    clanTag: String(clanTag).trim(),
                    clanName: String(clanName).trim(),
                    role: String(role).trim(),
                    thLevel: Utils.parseNumber(thLevel),
                    resetDate: roleChangeLogs.get(cleanPlayerTag) || null, // Tambahkan tanggal reset dari log
                    
                    // Metrik partisipasi
                    cwlAttacksUsed: 0,
                    cwlWarsFailed: 0,
                    classicWarsParticipated: 0,
                    classicWarsFailed: 0,
                    
                    // Sets untuk melacak partisipasi unik dan mencegah penghitungan ganda
                    cwlWarsRegistered: new Set(),
                    classicWarsParticipatedRegistered: new Set(),
                    classicWarsFailedRegistered: new Set()
                });
            }
        });
        return memberData;
    },

    /**
     * Mengagregasi data War Classic, mengabaikan data sebelum tanggal reset
     * dan mencegah penghitungan ganda dari war yang sama.
     */
    _aggregateClassicWar: function(memberData) {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const archiveSheet = ss.getSheetByName(SHEET_NAMES.ARSIP_PERANG);
        if (!archiveSheet || archiveSheet.getLastRow() < 2) return;

        // Ambil Kolom B (ID War), C (Tgl Arsip), F (Tag Pemain), I (Status Kita)
        const data = archiveSheet.getRange(2, 2, archiveSheet.getLastRow() - 1, 8).getValues();
        
        data.forEach(row => {
            const warId = String(row[0] || "").trim(); // Indeks 0 dari range (Kolom B)
            const archiveDate = row[1] ? new Date(row[1]) : null; // Indeks 1 (Kolom C)
            const playerTag = String(row[4] || "").trim().toUpperCase(); // Indeks 4 (Kolom F)
            const status = String(row[7] || "").trim(); // Indeks 7 (Kolom I)

            if (!warId || !playerTag.startsWith('#') || !archiveDate) return;
            
            const player = memberData.get(playerTag);

            if (player) {
                // Filter 1: Abaikan data sebelum tanggal reset
                if (player.resetDate && archiveDate < player.resetDate) return; 
                
                // Filter 2: Hitung partisipasi berdasarkan status, pastikan ID War unik
                if (status.includes('2/2')) {
                    if (!player.classicWarsParticipatedRegistered.has(warId)) {
                        player.classicWarsParticipated += 1;
                        player.classicWarsParticipatedRegistered.add(warId);
                    }
                } 
                else if (status.includes('0/2')) {
                    if (!player.classicWarsFailedRegistered.has(warId)) {
                        player.classicWarsFailed += 1;
                        player.classicWarsFailedRegistered.add(warId);
                    }
                }
            }
        });
    },

    /**
     * Mengagregasi data CWL, mengabaikan data sebelum tanggal reset.
     */
    _aggregateCwlWar: function(memberData) {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const archiveSheet = ss.getSheetByName(SHEET_NAMES.ARSIP_CWL);
        if (!archiveSheet || archiveSheet.getLastRow() < 2) return;

        // Ambil Kolom B (ID Musim/Identifier), C (Tgl Arsip), D (Tag Pemain), G (Status)
        const data = archiveSheet.getRange(2, 2, archiveSheet.getLastRow() - 1, 6).getValues(); 
        let currentWarBlock = null;

        data.forEach(row => {
            const blockIdentifier = String(row[0] || "").trim();
            const archiveDate = row[1] ? new Date(row[1]) : null; // Indeks 1 (Kolom C)
            const playerTag = String(row[2] || "").trim().toUpperCase(); // Indeks 2 (Kolom D)
            const attackStatus = String(row[5] || "").trim(); // Indeks 5 (Kolom G)
            
            if (blockIdentifier.startsWith('--- START')) {
                currentWarBlock = blockIdentifier;
                return;
            }

            if (!playerTag.startsWith('#') || !archiveDate) return;

            const player = memberData.get(playerTag);

            if (player && currentWarBlock) {
                // Filter: Abaikan data sebelum tanggal reset
                if (player.resetDate && archiveDate < player.resetDate) return; 

                // Hitung partisipasi
                if (attackStatus.startsWith('✔️')) {
                    player.cwlAttacksUsed += 1;
                }
                
                if (playerTag.startsWith('#')) {
                    player.cwlWarsRegistered.add(currentWarBlock);
                }
            }
        });

        // Hitung kegagalan setelah semua data CWL diproses
        memberData.forEach(player => {
            const registeredDays = player.cwlWarsRegistered.size;
            const attacksUsed = player.cwlAttacksUsed;
            player.cwlWarsFailed = registeredDays - attacksUsed; 
            if (player.cwlWarsFailed < 0) player.cwlWarsFailed = 0;
        });
    },

    /**
     * Fungsi utama untuk menjalankan semua agregator.
     */
    getAggregatedParticipationData: function() {
        const memberData = this._initializeMemberData();
        this._aggregateClassicWar(memberData);
        this._aggregateCwlWar(memberData);
        return Array.from(memberData.values());
    },
    
    /**
     * Menentukan status promosi/demosi berdasarkan metrik yang sudah bersih.
     */
    getPromotionDemotionStatus: function(player) {
        const SUCCESS_LIMIT = 3;
        const PENALTY_LIMIT = 3;
        
        const totalSuccess = player.cwlAttacksUsed + player.classicWarsParticipated;
        const totalPenalty = player.cwlWarsFailed + player.classicWarsFailed;
        
        const isLeaderOrCo = (player.role === 'Leader' || player.role === 'Co-Leader');
        
        if (isLeaderOrCo) {
            return { statusIcon: '🟢', keterangan: 'Aman (Leader/Co-Leader)' };
        } 
        
        if (player.role === 'Elder') {
            if (totalPenalty >= PENALTY_LIMIT) {
                return { statusIcon: '🔴', keterangan: `Demosi ke Member (Penalti ${totalPenalty}x)` };
            }
            if (totalPenalty > 0) {
                return { statusIcon: '🟢', keterangan: `Aman (Memiliki ${totalPenalty}x Penalti)` };
            }
            return { statusIcon: '🟢', keterangan: 'Aman' };
        }
        
        if (player.role === 'Member') {
            if (totalSuccess >= SUCCESS_LIMIT) {
                return { statusIcon: '✔️', keterangan: `Promosi ke Elder (Sukses ${totalSuccess}x)` };
            }
            if (totalPenalty >= PENALTY_LIMIT) {
                 return { statusIcon: '🔴', keterangan: `Pelanggaran (Demosi Manual/Kick)` };
            }
            if (totalSuccess > 0) {
                 return { statusIcon: '🟢', keterangan: `Aman (Progres promosi: ${totalSuccess}/${SUCCESS_LIMIT} sukses)` };
            }
            if (totalPenalty > 0) {
                 return { statusIcon: '🟢', keterangan: `Aman (Memiliki ${totalPenalty}x penalti)` };
            }
            return { statusIcon: '🟢', keterangan: 'Aman (Tidak Aktif/Baru)' };
        }
        
        return { statusIcon: '🟢', keterangan: 'Aman' };
    }
};


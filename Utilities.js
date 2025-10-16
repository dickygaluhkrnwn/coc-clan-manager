// SELURUH KODE LENGKAP - Utilities.gs (V5.80 - Modularisasi)
/**
 * =================================================================
 * UTILITIES.GS: Berisi fungsi helper umum dan utilitas konversi.
 * * Catatan: File ini bergantung pada Konstanta.gs.
 * =================================================================
 */

const Utils = {
    /**
     * Mengambil daftar klan yang aktif dari sheet Pengaturan.
     * @returns {Object[]} Array objek klan {name, tag}.
     */
    getAllClans: function() {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const settingsSheet = ss.getSheetByName(SHEET_NAMES.PENGATURAN);
        if (!settingsSheet) {
            Logger.log(`Error: Sheet "${SHEET_NAMES.PENGATURAN}" tidak ditemukan.`);
            return [];
        }
        const data = settingsSheet.getRange("A2:B" + settingsSheet.getLastRow()).getValues();
        const clans = data.filter(row => row[0] && row[1]).map(row => ({ name: String(row[0]).trim(), tag: String(row[1]).trim() }));
        return clans;
    },

    /**
     * Mendapatkan blok War CWL terbaru dari Arsip (digunakan sebagai fallback).
     * @param {string} clanTag - Tag klan yang dicari.
     * @returns {Object|null} Objek grup CWL yang direkonstruksi atau null.
     */
    getLatestCwlBlocksFromArchive: function(clanTag) {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const archiveSheet = ss.getSheetByName(SHEET_NAMES.ARSIP_CWL);
        if (!archiveSheet || archiveSheet.getLastRow() < 2) return null;

        const data = archiveSheet.getRange(2, 1, archiveSheet.getLastRow() - 1, 2).getValues();
        
        // 1. Identifikasi semua baris yang relevan (Tag Klan atau Header START)
        const clanData = data.map((row, index) => ({
            tag: String(row[0]).trim(), 
            identifier: String(row[1]).trim(),
            row: index + 2
        })).filter(item => item.tag === clanTag || item.identifier.startsWith('--- START'));

        if (clanData.length === 0) return null;

        // 2. Cari season ID terbaru
        const latestPlayerRow = [...clanData].reverse().find(row => row.tag === clanTag);
        if (!latestPlayerRow) return null;

        // Season ID tersimpan di kolom ID Musim di baris data pemain
        const latestSeasonId = archiveSheet.getRange(latestPlayerRow.row, 2).getValue();
        if (!latestSeasonId) return null;

        const rounds = [];
        const uniqueWarTags = new Set();
        
        // 3. Kumpulkan semua header blok CWL untuk season terbaru klan ini
        clanData.forEach(item => {
            if (item.identifier.startsWith('--- START') && item.identifier.includes(latestSeasonId) && item.identifier.includes(clanTag)) {
                if (!uniqueWarTags.has(item.identifier)) {
                    rounds.push({ warTag: item.identifier }); // 'warTag' adalah block identifier
                    uniqueWarTags.add(item.identifier);
                }
            }
        });
        
        if (rounds.length > 0) {
            return { rounds: rounds, state: 'warEnded', season: latestSeasonId };
        }
        
        return null;
    },

    /**
     * Mengkonversi CoC date string (YYYYMMDDTHHMMSS.000Z) ke JavaScript Date object.
     * @param {string} cocDate - CoC API date string.
     * @returns {Date|string} JavaScript Date object atau 'N/A'.
     */
    cocDateToJsDate: function(cocDate) {
        if (!cocDate) return 'N/A';
        const YYYY = cocDate.substring(0, 4), MM = cocDate.substring(4, 6), DD = cocDate.substring(6, 8),
            HH = cocDate.substring(9, 11), mm = cocDate.substring(11, 13), SS = cocDate.substring(13, 15);
        return new Date(`${YYYY}-${MM}-${DD}T${HH}:${mm}:${SS}Z`);
    },

    /**
     * Memformat nama role dari API.
     * @param {string} role - Role dari API ('admin', 'coLeader', 'leader', 'member').
     * @returns {string} Nama role yang diformat.
     */
    formatRoleName: function(role) {
        if (role === 'admin') return 'Elder';
        if (role === 'coLeader') return 'Co-Leader';
        if (role === 'leader') return 'Leader';
        return 'Member';
    },

    /**
     * Fungsi pembanding untuk menyortir anggota klan.
     */
    memberSorter: function(a, b, sortOrder) {
        if (sortOrder === 'name') return a.name.localeCompare(b.name);
        const rolePriority = { 'leader': 1, 'coLeader': 2, 'admin': 3, 'member': 4 };
        const priorityA = rolePriority[a.role] || 5;
        const priorityB = rolePriority[b.role] || 5;
        if (priorityA !== priorityB) return priorityA - priorityB;
        return b.townHallLevel - a.townHallLevel;
    },

    /**
     * Menormalisasi data war untuk mengidentifikasi klan kita dan klan lawan.
     * @param {Object} warData - Data War mentah dari API.
     * @param {string} clanTag - Tag klan kita.
     * @returns {{ourClanData: Object, opponentData: Object}} Data War yang dinormalisasi.
     */
    normalizeWarData: function(warData, clanTag) {
        let ourClanData, opponentData;
        if (warData.clan && warData.clan.tag === clanTag) {
            ourClanData = warData.clan;
            opponentData = warData.opponent;
        } else if (warData.opponent && warData.opponent.tag === clanTag) {
            ourClanData = warData.opponent;
            opponentData = warData.clan;
        } else {
            // Fallback untuk War data yang direkonstruksi
            ourClanData = warData.clan;
            opponentData = warData.opponent;
        }
        return { ourClanData, opponentData };
    },

    /**
     * Menghasilkan ID War unik untuk War Classic.
     * @param {string} clanTag - Tag klan.
     * @param {Date} endDate - Tanggal selesai War (Date object).
     * @param {string} opponentName - Nama klan lawan.
     * @returns {string} ID War unik.
     */
    generateWarId: function(clanTag, endDate, opponentName) {
        const formattedDate = Utilities.formatDate(endDate, SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(), "yyyyMMdd");
        const safeOpponentName = opponentName.toUpperCase().replace(/[^A-Z0-9]/g, '');
        return `${clanTag}-${formattedDate}-${safeOpponentName}`;
    },

    /**
     * Menganalisis nilai dan mengkonversinya menjadi angka (untuk menghindari masalah '0' vs null/empty).
     * @param {*} value - Nilai yang akan dianalisis.
     * @returns {number|null} Nilai angka atau null.
     */
    parseNumber: function(value) {
        if (typeof value === 'number') {
            return value;
        }
        if (typeof value === 'string') {
            const num = parseFloat(value.replace(/[^0-9.-]/g, ''));
            return isNaN(num) ? null : num;
        }
        return null;
    },
    
    /**
     * Memformat angka besar dengan pemisah ribuan (mis. 1234567 -> 1.234.567).
     * @param {number} num - Angka yang akan diformat.
     * @returns {string} String yang diformat.
     */
    formatNumber: function(num) {
        if (num === null || typeof num !== 'number' || isNaN(num)) {
            return '0';
        }
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }
};

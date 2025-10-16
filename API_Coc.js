// SELURUH KODE LENGKAP - API_Coc.gs (V5.80 - Modularisasi)
/**
 * =================================================================
 * API_COC.GS: Fungsi untuk koneksi ke Clash of Clans API dan rekonstruksi War.
 * * Catatan: File ini bergantung pada Konstanta.gs untuk SHEET_NAMES dan Utils.
 * =================================================================
 */

const CocApi = {
    _cachedApiKey: null,
    
    /**
     * Mengambil API Key dari Script Properties.
     * @returns {string} API Key JWT.
     * @throws {Error} Jika API Key belum diatur.
     */
    _getApiKey: function() {
        if (!this._cachedApiKey) {
            this._cachedApiKey = PropertiesService.getScriptProperties().getProperty('COC_API_KEY');
        }
        if (!this._cachedApiKey) {
            throw new Error("COC_API_KEY belum diatur. Harap atur melalui menu.");
        }
        return this._cachedApiKey;
    },

    /**
     * Melakukan permintaan HTTP ke Clash of Clans API.
     * @param {string} endpoint - Bagian endpoint API (misalnya: 'clans/#TAG/currentwar').
     * @param {boolean} suppressAlert - Jika true, tidak menampilkan alert error ke UI.
     * @returns {Object|null} Objek JSON hasil API atau null jika gagal.
     */
    _fetch: function(endpoint, suppressAlert = false) {
        try {
            const apiKey = this._getApiKey();
            // Menggunakan proxy API (cocproxy.royaleapi.dev) untuk menghindari batasan Google Apps Script.
            const baseUrl = "https://cocproxy.royaleapi.dev/v1/"; 
            const url = baseUrl + endpoint;
            
            const options = {
                'method': 'get',
                'muteHttpExceptions': true, // Penting untuk menangani response non-200
                'headers': { 'Authorization': `Bearer ${apiKey}` }
            };
            
            const response = UrlFetchApp.fetch(url, options);
            const responseCode = response.getResponseCode();
            
            if (responseCode == 200) {
                return JSON.parse(response.getContentText());
            } else {
                const errorBody = response.getContentText();
                const errorMsg = `API Error ${responseCode} (${endpoint}): ${errorBody}`;
                
                if (!suppressAlert) {
                    // Tampilkan pesan error ringkas ke UI
                    SpreadsheetApp.getUi().alert(`Kesalahan API (${responseCode}): ${endpoint}`);
                }
                Logger.log(errorMsg);
                return null;
            }
        } catch (e) {
            if (!suppressAlert) SpreadsheetApp.getUi().alert('Error koneksi atau API Key: ' + e.message);
            Logger.log('Error koneksi: ' + e.message);
            return null;
        }
    },

    /**
     * Mengambil data War Aktif (War Classic atau CWL) untuk klan tertentu.
     * Logika ini memastikan CWL sedang berjalan dan mengambil war tag yang relevan.
     * @param {string} clanTag - Tag klan.
     * @returns {{data: Object, warType: string}} Data War dan tipenya ('Classic' atau 'CWL').
     */
    fetchCurrentWarForClan: function(clanTag) {
        // Cek War Classic dulu
        const classicEndpoint = `clans/${encodeURIComponent(clanTag)}/currentwar`;
        let data = this._fetch(classicEndpoint, true);
        let warType = 'Classic';

        // Jika War Classic tidak aktif (notInWar), atau data War milik klan lain (War sedang dipublikasikan di API klan lain, ini jarang terjadi tapi dicek)
        if (!data || data.reason === 'notInWar' || (data.clan && data.clan.tag !== clanTag && data.opponent.tag !== clanTag) ) {
            warType = 'CWL';
            const groupData = this._fetch(`clans/${encodeURIComponent(clanTag)}/currentwar/leaguegroup`, true);
            let warData = null;

            if (groupData && groupData.state !== 'notInWar') {
                // Cari ronde CWL saat ini yang memiliki warTag
                const currentRound = groupData.rounds.find(round => round.warTags.some(tag => tag !== '#0'));
                
                if(currentRound) {
                    // Coba ambil data war untuk setiap tag di ronde saat ini
                    for(const warTag of currentRound.warTags) {
                        if(warTag === '#0') continue; // Skip tag dummy
                        
                        // Asumsi fetchWarByTag ada di objek yang sama
                        const tempWarData = this.fetchWarByTag(warTag); 
                        
                        // Cek apakah war ini melibatkan klan kita
                        if(tempWarData && tempWarData.clan && tempWarData.opponent && (tempWarData.clan.tag === clanTag || tempWarData.opponent.tag === clanTag)) {
                            warData = tempWarData;
                            break; // War ditemukan
                        }
                    }
                }
                // Update data dengan hasil CWL (bisa null/state notInWar jika warTag tidak ditemukan)
                data = warData ? warData : { state: 'notInWar' }; 
            } else {
                // Tidak ada CWL aktif
                data = { state: 'notInWar' };
            }
        }
        
        return { data, warType };
    },

    /**
     * Mengambil data grup CWL (digunakan untuk rekapitulasi).
     * @param {string} clanTag - Tag klan.
     * @returns {Object|null} Data grup CWL.
     */
    fetchCwlGroupData: function(clanTag) {
        const endpoint = `clans/${encodeURIComponent(clanTag)}/currentwar/leaguegroup`;
        return this._fetch(endpoint, true);
    },
    
    /**
     * Mengambil data War CWL spesifik berdasarkan War Tag.
     * @param {string} warTag - War Tag CWL.
     * @returns {Object|null} Data War CWL.
     */
    fetchWarByTag: function(warTag) {
        if (!warTag || warTag === '#0') return null;
        const warData = this._fetch(`clanwarleagues/wars/${encodeURIComponent(warTag)}`, true);
        return warData;
    },
    
    /**
     * Merekonstruksi objek War dari data yang tersimpan di Arsip CWL.
     * Digunakan untuk membuat laporan rekap CWL dari arsip.
     * @param {string} clanTag - Tag klan kita.
     * @param {string} seasonId - ID Musim CWL (Tidak digunakan dalam logika, tapi dipertahankan untuk konsistensi).
     * @param {string} dayIdentifier - Block Identifier War Day (--- START HARI KE-...).
     * @returns {Object|null} Objek War yang direkonstruksi (mirip API War Object).
     */
    reconstructWarDataFromArchive: function(clanTag, seasonId, dayIdentifier) {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const archiveSheet = ss.getSheetByName(SHEET_NAMES.ARSIP_CWL);
        if (!archiveSheet) return null;
        
        // Kolom B: ID Musim / Block Identifier. Kolom R (18) adalah Persen Lawan.
        // Asumsi data dimulai dari baris 2
        const data = archiveSheet.getRange(2, 1, archiveSheet.getLastRow() - 1, 18).getValues();
        
        const warDayData = [];
        let collect = false;
        
        for (const row of data) {
            // Kolom B: ID Musim / Block Identifier
            if (String(row[1]) === dayIdentifier) { 
                collect = true;
                continue; // Mulai koleksi setelah header blok
            }
            if (collect) {
                // Deteksi akhir blok (Header Blok Baru)
                if (String(row[1]).startsWith('--- START')) {
                    break;
                }
                // Deteksi Baris Data Pemain (Kolom D: Tag Pemain Kita)
                if (String(row[3]).startsWith('#')) { 
                    warDayData.push(row);
                }
            }
        }

        if (warDayData.length > 0) {
            // Kolom M (Index 12) berisi Nama Lawan
            const opponentName = warDayData[0][12] || 'Nama Lawan Tidak Ditemukan'; 
            
            // Asumsi Utils.getAllClans() ada di file Utils.gs
            const clanName = Utils.getAllClans().find(c => c.tag === clanTag).name;

            // Membangun data Member Kita
            const ourMembers = warDayData.map((row, index) => {
                // Kolom H: Status, Kolom J: Bintang, Kolom K: Persen, Kolom I: Target
                const hasAttack = String(row[6]).startsWith('✔️'); 
                const attack = hasAttack ? [{ 
                    stars: parseInt(row[8]) || 0, 
                    destructionPercentage: parseFloat(row[9]) || 0, 
                    defenderTag: row[7] // Target Lawan
                }] : [];
                
                return { 
                    tag: row[3], // Tag Kita
                    name: row[4], // Nama Kita
                    townhallLevel: row[5] || 'N/A', // TH Kita
                    mapPosition: index + 1,
                    attacks: attack
                };
            });
            
            // Membangun data Member Lawan (Defenses)
            const opponentMembers = warDayData.map((row, index) => { 
                // Kolom P: Status, Kolom R: Bintang, Kolom S: Persen, Kolom Q: Target
                const hasDefense = String(row[14]).startsWith('✔️'); // Status Lawan
                const defenseAttack = hasDefense ? [{ 
                    stars: parseInt(row[16]) || 0, 
                    destructionPercentage: parseFloat(row[17]) || 0, 
                    attackerTag: row[3] // Tag Kita (Penyerang)
                }] : [];

                return { 
                    tag: row[11], // Tag Lawan
                    name: row[12], // Nama Lawan
                    townhallLevel: row[13] || 'N/A', // TH Lawan
                    mapPosition: index + 1,
                    // Dalam rekonstruksi, kita anggap attacks lawan sebagai defenses.
                    // Data arsip hanya menyimpan 1x serangan (CWL).
                    defenses: defenseAttack.length > 0 ? defenseAttack : [] 
                };
            });

            return {
                state: 'warEnded', 
                dayHeader: dayIdentifier,
                clan: { 
                    tag: clanTag, 
                    name: clanName, 
                    members: ourMembers 
                },
                opponent: { 
                    tag: 'archiveOpponent', // Tag dummy
                    name: opponentName, 
                    members: opponentMembers 
                }
            };
        }
        return null;
    }
};

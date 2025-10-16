// SELURUH KODE LENGKAP - Automasi.gs (V5.86 - Logika Trigger)
/**
 * =================================================================
 * AUTOMASI.GS: Berisi fungsi untuk mengatur trigger waktu dan cleanup.
 * * Catatan: File ini melengkapi fungsi setupAutomaticTriggers() di KodeUtama.gs.
 * =================================================================
 */

// Konstanta Waktu Eksekusi (dalam jam, berdasarkan waktu GMT+7 / WIB)
const AUTOMATION_TIME = {
    // Jalankan full sinkronisasi setiap hari di sore hari (Misal: 17:00 WIB/GMT+7)
    SYNC_HOUR: 17, 
    // Jam untuk membersihkan trigger yang sudah usang (Misal: 01:00 WIB/GMT+7)
    CLEANUP_HOUR: 1
};


/**
 * Menghapus semua trigger yang ada untuk proyek script ini.
 */
function deleteExistingTriggers() {
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
        ScriptApp.deleteTrigger(trigger);
    });
}

/**
 * Mengatur trigger otomatis harian untuk sinkronisasi data penuh.
 * Fungsi ini dipanggil dari menu 'Atur Otomatisasi'.
 */
function setupAutomaticTriggers() {
    const ui = SpreadsheetApp.getUi();

    try {
        // 1. Hapus semua trigger yang sudah ada untuk menghindari duplikasi
        deleteExistingTriggers();

        // 2. Buat trigger harian untuk sinkronisasi data penuh
        // fullDataRefresh() didefinisikan di KodeUtama.gs
        ScriptApp.newTrigger('fullDataRefresh')
            .timeBased()
            .everyDays(1)
            .atHour(AUTOMATION_TIME.SYNC_HOUR)
            .create();

        // 3. (Opsional) Buat trigger harian untuk cleanup/maintenance
        ScriptApp.newTrigger('deleteExistingTriggers')
            .timeBased()
            .everyDays(1)
            .atHour(AUTOMATION_TIME.CLEANUP_HOUR)
            .create();

        ui.alert('✅ Otomatisasi Berhasil Diatur!', 
                 `Sistem akan melakukan sinkronisasi data penuh secara otomatis setiap hari pada pukul ${AUTOMATION_TIME.SYNC_HOUR}:00 WIB.`);

    } catch (e) {
        ui.alert('❌ Gagal Mengatur Otomatisasi', 
                 'Terjadi kesalahan saat membuat trigger. Pastikan Anda memiliki izin yang benar. Pesan Error: ' + e.message);
        Logger.log(e);
    }
}

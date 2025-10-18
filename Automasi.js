// SELURUH KODE LENGKAP - Automasi.gs (V6.0 - Trigger Per Jam)
/**
 * =================================================================
 * AUTOMASI.GS: Berisi fungsi untuk mengatur trigger waktu.
 * * PENGEMBANGAN: Mengubah trigger dari harian menjadi setiap 4 jam.
 * =================================================================
 */

// Konstanta Interval Automasi (dalam jam)
const AUTOMATION_INTERVAL_HOURS = 4; // Ubah angka ini untuk mengubah interval (misal: 1, 2, 4, 6)

/**
 * Menghapus semua trigger yang ada untuk proyek script ini.
 * Fungsi ini memastikan tidak ada trigger duplikat atau trigger lama yang tertinggal.
 */
function deleteExistingTriggers() {
    const triggers = ScriptApp.getProjectTriggers();
    for (const trigger of triggers) {
        // Hanya hapus trigger yang memanggil fungsi 'fullDataRefresh'
        if (trigger.getHandlerFunction() === 'fullDataRefresh') {
            ScriptApp.deleteTrigger(trigger);
        }
    }
    Logger.log('Trigger lama untuk "fullDataRefresh" telah dihapus.');
}

/**
 * Mengatur trigger otomatis untuk sinkronisasi data penuh secara periodik.
 * Fungsi ini dipanggil dari menu 'Atur Otomatisasi'.
 */
function setupAutomaticTriggers() {
    const ui = SpreadsheetApp.getUi();

    try {
        // 1. Hapus semua trigger yang sudah ada untuk fungsi ini agar tidak duplikat
        deleteExistingTriggers();

        // 2. Buat trigger baru berbasis waktu yang berjalan setiap X jam
        // fullDataRefresh() didefinisikan di KodeUtama.gs
        ScriptApp.newTrigger('fullDataRefresh')
            .timeBased()
            .everyHours(AUTOMATION_INTERVAL_HOURS)
            .create();

        Logger.log(`Trigger baru dibuat untuk menjalankan 'fullDataRefresh' setiap ${AUTOMATION_INTERVAL_HOURS} jam.`);

        ui.alert('✅ Automasi Berhasil Diatur!', 
                 `Sistem akan melakukan sinkronisasi data penuh secara otomatis setiap ${AUTOMATION_INTERVAL_HOURS} jam.` +
                 '\n\nAnda dapat menutup spreadsheet ini, automasi akan tetap berjalan di server Google.',
                 ui.ButtonSet.OK);

    } catch (e) {
        Logger.log(`Gagal membuat trigger: ${e.message}`);
        ui.alert('❌ Gagal Mengatur Automasi', 
                 'Terjadi kesalahan saat membuat trigger. Pastikan Anda memiliki izin yang benar. Pesan Error: ' + e.message,
                 ui.ButtonSet.OK);
    }
}

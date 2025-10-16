# Sistem Manajemen Klan CoC (v6.0 - Arsitektur Modular)

![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-4285F4?style=for-the-badge&logo=google&logoColor=white) ![Google Sheets](https://img.shields.io/badge/Google%20Sheets-34A853?style=for-the-badge&logo=google-sheets&logoColor=white)

Sistem ini adalah dasbor manajemen klan Clash of Clans yang komprehensif, dibangun sepenuhnya di atas platform Google Sheets dan ditenagai oleh Google Apps Script. Versi ini merupakan refactor besar dari versi sebelumnya, mengadopsi arsitektur modular untuk meningkatkan keterbacaan, pemeliharaan, dan skalabilitas kode.

Tujuannya tetap sama: mengotomatisasi pengumpulan data, membuat laporan perang yang detail, menganalisis partisipasi anggota, dan mengarsipkan data historis untuk analisis jangka panjang.

---

## 📋 Fitur Utama

- **Arsitektur Modular:** Kode dipecah menjadi beberapa file logis (`API`, `Laporan`, `Dashboard`, `Utilities`, `Formatter`, dll.) untuk manajemen yang lebih mudah.
- **Manajemen Multi-Klan:** Lacak data untuk beberapa klan sekaligus dari satu spreadsheet terpusat.
- **Dasbor Dinamis 4-Kolom:** Tampilan utama yang merangkum metrik performa, status perang aktif, dan ringkasan CWL untuk dua klan secara berdampingan.
- **Laporan Komprehensif:**
    - **Status Perang Aktif:** Laporan *real-time* yang menampilkan data serangan kedua belah pihak untuk Perang Klasik dan CWL.
    - **Rekapitulasi CWL:** Membuat laporan detail untuk setiap hari CWL, dengan kemampuan untuk merekonstruksi laporan dari data arsip.
    - **Evaluasi Partisipasi:** Menganalisis data dari arsip untuk memberikan rekomendasi Promosi/Demosi berdasarkan metrik aktivitas yang ditetapkan.
- **Sistem Pengarsipan Cerdas:**
    - Arsipkan detail Perang Klasik dan CWL untuk analisis historis.
    - Dilengkapi sistem migrasi untuk memperbarui format arsip lama ke standar baru.
    - Menghasilkan ID unik untuk setiap perang agar tidak ada duplikasi data.
- **Otomatisasi:** Kemampuan untuk mengatur *trigger* harian untuk sinkronisasi data otomatis.
- **Terintegrasi dengan GitHub:** Kode sumber dikelola menggunakan Git dan `clasp` untuk kontrol versi profesional.

---

## 🔗 Akses Dasbor Spreadsheet

Anda dapat melihat contoh *live* dari dasbor yang dihasilkan oleh sistem ini melalui tautan Google Sheets di bawah ini. (Akses hanya lihat).

- **[Buka Dasbor Google Sheets](https://docs.google.com/spreadsheets/d/1HBP_elghNzpeEg343DDg-OOi_53mpNrJEzgHus1HTzM/edit?usp=sharing)**

---

## 📂 Struktur File (Arsitektur Modular)

Proyek ini dipecah menjadi beberapa file `.js`/`.gs` yang masing-masing memiliki tanggung jawab spesifik:

-   **`Konstanta.js`**: Mendefinisikan semua konstanta global, terutama `SHEET_NAMES`, untuk memastikan konsistensi di seluruh skrip.
-   **`KodeUtama.js`**: Titik masuk utama aplikasi.
    -   `onOpen()`: Membuat struktur menu kustom di UI Spreadsheet.
    -   Berisi fungsi level atas seperti `fullDataRefresh()` dan fungsi-fungsi untuk pengarsipan.
-   **`Laporan.js`**: Berisi semua fungsi yang menghasilkan laporan temporer atau analisis.
    -   `updateCurrentWar()`: Membuat laporan Perang Aktif.
    -   `rekapitulasiCWL()`: Membuat laporan CWL.
    -   `generateDetailedRaidReport()`: Membuat laporan Raid Capital.
    -   `getParticipationReport()`: Menjalankan agregator partisipasi dan menampilkannya.
-   **`Dashboard.js`**: Logika khusus untuk membangun dan memformat sheet `Dashboard` utama. Mengambil data teragregasi dan menampilkannya dalam format 4-kolom.
-   **`API_Coc.js`**: Bertanggung jawab untuk semua komunikasi dengan API resmi Clash of Clans. Mengelola *fetching* data, menangani *error*, dan merekonstruksi data perang dari arsip.
-   **`Utilities.js`**: Kumpulan fungsi pembantu umum (`helper functions`) seperti konversi tanggal, normalisasi data, dan pembuatan ID unik.
-   **`Aggregators.js`**: Logika kompleks untuk mengumpulkan dan menganalisis data dari berbagai sumber (terutama dari arsip) untuk menghasilkan metrik turunan, seperti data untuk laporan partisipasi.
-   **`FormatterUmum.js` & `FormatterLog.js`**: Kumpulan fungsi untuk mempercantik tampilan sheet. Dipisahkan antara format umum (Anggota, Dashboard) dan format laporan dinamis (Log Perang, Arsip, dll.).
-   **`Automasi.gs.js`**: Mengelola pembuatan dan penghapusan *trigger* otomatis berbasis waktu.

---

## ⚙️ Instalasi & Penggunaan

1.  **Pengaturan Awal:**
    -   Buat salinan Google Sheets dan siapkan proyek Apps Script.
    -   Unggah semua file `.js`/`.gs` ke proyek menggunakan `clasp push`.
    -   Atur API Key CoC melalui menu `⚔️ Sistem Klan > ⚙️ Administrasi Sistem > 🔑 Atur API & Webhook`.
    -   Isi data klan Anda di sheet **"Pengaturan"**.
2.  **Penggunaan Harian:**
    -   Gunakan menu **`🔄 Sinkronisasi & Refresh`** untuk memperbarui data.
    -   Gunakan menu **`📋 Laporan & Analisis`** untuk membuat laporan spesifik.
    -   Gunakan menu **`⚙️ Administrasi Sistem`** untuk melakukan pengarsipan setelah perang atau CWL selesai.

---
*Proyek ini dibuat dan dikelola untuk manajemen internal klan. Dibuat pada Oktober 2025.*
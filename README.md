# AVARA - Sistem Rekap & Laporan Teknisi

Aplikasi web modern untuk manajemen rekapitulasi, monitoring, dan verifikasi laporan pekerjaan teknisi lapangan pada perusahaan **AVARA**. Dibangun dengan **Next.js (App Router)**, **SQLite** (`better-sqlite3`), dan **Tailwind CSS** dengan desain antarmuka presisi tinggi sesuai *design mockup*.

---

## 📸 Fitur Utama

### 1. Otentikasi & Login (`/login`)
- **Login Multi-Role**: Mengarahkan Admin ke Dashboard Monitoring dan Pemohon/Teknisi ke Dashboard Mobile.
- **Teks Sambutan & Quote Dinamis**: Teks "Selamat Datang" dan Quote inspiratif yang dapat diatur oleh Admin.
- **Demo Quick Login**: Tombol akses cepat satu-klik untuk login sebagai Admin (`admin`) atau Teknisi (`sodik`).

### 2. Dashboard Monitoring Admin (`/dashboard`)
- **Sticky / Fixed Header**: Header tetap berada di bagian atas saat halaman di-scroll dengan efek *backdrop blur*.
- **Sidebar Collapsible**: Tombol toggle untuk memperkecil sidebar (menampilkan icon saja) dan memperluasnya kembali.
- **Card Tindak Lanjut & Non Project**: Menampilkan jumlah total dan jumlah selesai dengan ukuran font angka yang diperbesar (`text-lg font-extrabold`).
- **Chart Laporan Bar Vertikal**: Visualisasi batang perbandingan *Tindak Lanjut* dan *Selesai* secara interaktif.
- **Popup Pengaturan (Settings Modal)**: Pengaturan logo aplikasi, Teks Selamat Datang, Quote, dan nama pembuat quote.

### 3. Rekapitulasi (`/rekap`)
- **Tabel Daftar Rekap**:
  - Kolom: No, No. Tindak Lanjut (`yymmdd-[nomor-urut]`), Pemohon, Kategori, Deskripsi, Durasi Repair (hari), Durasi Laporan (hari), Form, dan Status.
  - **Badge Status**: `Selesai` (hijau), `Warning` (merah, otomatis aktif jika durasi laporan $\ge$ 50% durasi repair), dan `Belum selesai / Proses Lapangan` (oranye).
- **Instant Search**: Pencarian langsung nomor tindak lanjut, pemohon, atau deskripsi saat diketik.
- **Filter Popover**: Tombol icon funnel filter untuk menyaring status laporan.
- **Ekspor CSV**: Unduh rekap ke format file `.csv`.
- **Lihat Form**: Popup modal lengkap dengan rincian segmen, foto dokumentasi, dan integrasi Google Maps.

### 4. Verifikasi Laporan (`/laporan`)
- **Grid Card Laporan**: Tampilan kartu 3 kolom persis seperti desain referensi.
- **Filter Bar Komprehensif**: Filter Region, Pelapor, Tanggal (*datepicker*), dan Deskripsi.
- **Modal Verifikasi**:
  - Saat tombol *Verifikasi* diklik, muncul popup modal yang menampilkan seluruh foto dokumentasi lapangan dengan fitur perbesar (*lightbox*).
  - Tombol **Selesai** di bagian bawah modal: Ketika diklik, status laporan berubah menjadi *Selesai* dan tombol pada card berubah menjadi *Terverifikasi*.

### 5. Akun Pemohon (`/akun-pemohon`)
- **Layout 2 Kolom**:
  - **Kolom Kiri (col-4)**: Kategori Pemohon dengan tombol aksi *Edit* dan *Delete*.
  - **Kolom Kanan (col-8)**: Tabel Akun Pemohon dengan kolom No, Nama, Total Laporan (dihitung otomatis), dan Action (*Edit* & *Delete*).
- **Popup Tambah Akun Pemohon**:
  - Input Nama Lengkap.
  - Select Divisi & Kategori Pemohon.
  - **Username Otomatis**: Digenerate dari nama lengkap (huruf kecil semua tanpa spasi) dan tetap bisa diedit manual.
  - Input Password Baru & tombol Register.

### 6. Master Data Kategori, Region, dan Divisi
- Halaman **Kategori** (`/kategori`): CRUD kategori laporan dengan *instant search*.
- Halaman **Region** (`/region`): CRUD wilayah penanganan dengan *instant search*.
- Halaman **Divisi** (`/divisi`): CRUD divisi teknisi dengan *instant search*.

### 7. Dashboard Pemohon / Teknisi Mobile (`/pemohon`)
- **Mobile-First Experience**: Didesain khusus untuk smartphone teknisi di lapangan.
- **Header Khusus**: Logo Avara, nama teknisi aktif, dan dropdown logout.
- **Form Laporan**:
  - Nama Pemohon otomatis terisi dan *readonly*.
  - Select Kategori dan Select Region.
  - Input "Segmen BB/Feeder/Access" dengan fitur tombol **Gunakan GPS** (membaca koordinat perangkat secara instan).
  - Lampiran Foto: Pilihan **Kamera Langsung** (`capture="environment"`) atau **Dari Galeri / File**, multi-upload dengan thumbnail preview & tombol hapus.
  - Deskripsi pekerjaan.
- **Halaman Sukses & Konfirmasi**:
  - Saat tombol *Kirim Laporan* berhasil, tampil halaman khusus dengan **Icon Check Besar**, teks pemberitahuan, detail No. Tindak Lanjut, dan **Tombol Kembali**.
- **Tab Riwayat Laporan**: Melihat daftar laporan yang pernah dikirimkan beserta status penyelesaian dan foto dokumentasi.

---

## 🔑 Kredensial Akun Pengujian (Demo)

| Peran | Username | Password | Deskripsi |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` | Akses penuh dashboard monitoring admin |
| **Teknisi 1** | `sodik` | `sodik123` | Teknisi Divisi Fiber Optic |
| **Teknisi 2** | `yusuf` | `yusuf123` | Teknisi Divisi Fiber Optic |
| **Teknisi 3** | `sanari` | `sanari123` | Teknisi Divisi Radio Wireless |

---

## 🛠️ Menjalankan Aplikasi

### Kebutuhan Sistem:
- Node.js versi 18+ (disarankan Node.js 20 atau 22)
- npm 9+

### Instalasi & Menjalankan:
```bash
# 1. Masuk ke direktori
cd rekap-avara

# 2. Instalasi dependensi (jika belum terinstal)
npm install

# 3. Mode Produksi (Cepat & Stabil)
npm run build
npm run start

# Atau Mode Pengembangan (Live reload)
npm run dev
```

Buka peramban di: **`http://localhost:3000`**

---

## 🗄️ Database & Penyimpanan
- Menggunakan database **SQLite** berkas lokal yang disimpan di `data/avara.db`.
- Database diinisialisasi dan di-*seed* secara otomatis saat aplikasi pertama kali dijalankan.

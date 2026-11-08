import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dbDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, "avara.db");
const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma("journal_mode = WAL");

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    app_name TEXT DEFAULT 'AVARA',
    logo_url TEXT DEFAULT '',
    welcome_text TEXT DEFAULT 'Selamat Datang di Sistem Rekap & Laporan Teknisi Avara',
    quote_text TEXT DEFAULT 'Kecepatan penanganan jaringan dan akurasi pelaporan adalah wujud dedikasi kami untuk kehandalan layanan.',
    quote_author TEXT DEFAULT 'Avara Management'
  );

  CREATE TABLE IF NOT EXISTS divisi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS region (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS kategori (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS kategori_pemohon (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'pemohon', -- 'admin' or 'pemohon'
    divisi_id INTEGER,
    kategori_pemohon_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(divisi_id) REFERENCES divisi(id) ON DELETE SET NULL,
    FOREIGN KEY(kategori_pemohon_id) REFERENCES kategori_pemohon(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS laporan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nomor_tindak_lanjut TEXT NOT NULL UNIQUE,
    pemohon_id INTEGER NOT NULL,
    kategori_id INTEGER NOT NULL,
    region_id INTEGER NOT NULL,
    segmentasi TEXT NOT NULL,
    deskripsi TEXT NOT NULL,
    durasi_repair INTEGER DEFAULT 14,
    durasi_laporan INTEGER DEFAULT 1,
    status TEXT DEFAULT 'Proses Lapangan', -- 'Proses Lapangan', 'Warning', 'Selesai'
    is_verified INTEGER DEFAULT 0,
    attachments TEXT DEFAULT '[]', -- JSON string array of base64 or paths
    lokasi TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    verified_at DATETIME,
    FOREIGN KEY(pemohon_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(kategori_id) REFERENCES kategori(id) ON DELETE RESTRICT,
    FOREIGN KEY(region_id) REFERENCES region(id) ON DELETE RESTRICT
  );
`);

// Migration: Ensure 'lokasi' column exists
try {
  db.exec("ALTER TABLE laporan ADD COLUMN lokasi TEXT DEFAULT ''");
} catch {
  // column already exists
}

// Seed default data if empty
const countSettings = (db.prepare("SELECT COUNT(*) as count FROM settings").get() as { count: number }).count;
if (countSettings === 0) {
  db.prepare(`
    INSERT INTO settings (id, app_name, logo_url, welcome_text, quote_text, quote_author)
    VALUES (1, 'AVARA', '', 'Selamat Datang di Sistem Rekap & Laporan Teknisi Avara', 'Kecepatan penanganan jaringan dan akurasi pelaporan adalah wujud dedikasi kami untuk kehandalan layanan.', 'Avara Management')
  `).run();
}

const countDivisi = (db.prepare("SELECT COUNT(*) as count FROM divisi").get() as { count: number }).count;
if (countDivisi === 0) {
  const insertDivisi = db.prepare("INSERT INTO divisi (name) VALUES (?)");
  ["Fiber Optic", "Radio Wireless", "Core Network", "Maintenance & Support", "Infrastructure"].forEach((name) => {
    insertDivisi.run(name);
  });
}

const countRegion = (db.prepare("SELECT COUNT(*) as count FROM region").get() as { count: number }).count;
if (countRegion === 0) {
  const insertRegion = db.prepare("INSERT INTO region (name) VALUES (?)");
  ["Serang", "Cilegon", "Tangerang", "Jakarta Barat", "Lebak", "Pandeglang"].forEach((name) => {
    insertRegion.run(name);
  });
}

const countKategori = (db.prepare("SELECT COUNT(*) as count FROM kategori").get() as { count: number }).count;
if (countKategori === 0) {
  const insertKategori = db.prepare("INSERT INTO kategori (name) VALUES (?)");
  ["PM Non Project", "Tindak Lanjut", "Preventive Maintenance", "Corrective Action"].forEach((name) => {
    insertKategori.run(name);
  });
}

const countKatPemohon = (db.prepare("SELECT COUNT(*) as count FROM kategori_pemohon").get() as { count: number }).count;
if (countKatPemohon === 0) {
  const insertKatPemohon = db.prepare("INSERT INTO kategori_pemohon (name) VALUES (?)");
  ["Teknisi Internal", "Mitra Lapangan", "Project Engineer", "Helpdesk Support"].forEach((name) => {
    insertKatPemohon.run(name);
  });
}

const countUsers = (db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number }).count;
if (countUsers === 0) {
  const insertUser = db.prepare(`
    INSERT INTO users (name, username, password, role, divisi_id, kategori_pemohon_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Admin user
  insertUser.run("Dedy", "admin", "admin123", "admin", 1, 1);

  // Pemohon users
  insertUser.run("Sodik", "sodik", "sodik123", "pemohon", 1, 1);
  insertUser.run("Yusuf", "yusuf", "yusuf123", "pemohon", 1, 1);
  insertUser.run("Sanari", "sanari", "sanari123", "pemohon", 2, 2);
  insertUser.run("Budi Santoso", "budisantoso", "budi123", "pemohon", 3, 1);
}

const countLaporan = (db.prepare("SELECT COUNT(*) as count FROM laporan").get() as { count: number }).count;
if (countLaporan === 0) {
  const insertLaporan = db.prepare(`
    INSERT INTO laporan (nomor_tindak_lanjut, pemohon_id, kategori_id, region_id, segmentasi, deskripsi, durasi_repair, durasi_laporan, status, is_verified, attachments, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Sample reports matching screenshots
  insertLaporan.run(
    "261107-001",
    3, // Yusuf
    1, // PM Non Project
    1, // Serang
    "xcc serang - Bluebird",
    "Pemindahan tiang dan swing link ke kabel 96 dwdm",
    14,
    14,
    "Selesai",
    1,
    JSON.stringify([
      "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80"
    ]),
    "2026-11-01 09:30:00"
  );

  insertLaporan.run(
    "261107-002",
    2, // Sodik
    2, // Tindak Lanjut
    1, // Serang
    "xcc serang - Bluebird",
    "Jointing core idle & perlu swing link ke kabel 96 dwdm",
    14,
    14,
    "Proses Lapangan",
    0,
    JSON.stringify([
      "https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=600&q=80"
    ]),
    "2026-11-03 14:15:00"
  );

  insertLaporan.run(
    "261107-003",
    4, // Sanari
    2, // Tindak Lanjut
    3, // Tangerang
    "Backbone Tangerang - Jakarta",
    "Switch link trunk dan pengecekan redaman optical",
    14,
    8, // 8 >= 14 * 0.5 -> Warning
    "Warning",
    0,
    JSON.stringify([
      "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80"
    ]),
    "2026-11-04 11:00:00"
  );

  insertLaporan.run(
    "261107-004",
    2, // Sodik
    1, // PM Non Project
    1, // Serang
    "xcc serang - Bluebird",
    "perlu swing link ke kabel 96 dwdm",
    14,
    5,
    "Proses Lapangan",
    0,
    JSON.stringify([
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80"
    ]),
    "2026-11-05 10:20:00"
  );

  insertLaporan.run(
    "261107-005",
    3, // Yusuf
    1, // PM Non Project
    2, // Cilegon
    "Feeder Kawasan Industri Krakatau",
    "Pembersihan OTB dan splice tray jalur utama",
    14,
    14,
    "Selesai",
    1,
    JSON.stringify([]),
    "2026-11-06 16:45:00"
  );

  insertLaporan.run(
    "261107-006",
    4, // Sanari
    2, // Tindak Lanjut
    4, // Jakarta Barat
    "Metro-E Kebon Jeruk",
    "Penggantian SFP transceiver 10G",
    14,
    14,
    "Selesai",
    1,
    JSON.stringify([]),
    "2026-11-07 08:15:00"
  );
}

export default db;


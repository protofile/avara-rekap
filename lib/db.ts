import mysql, { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import bcrypt from "bcryptjs";
import { dataUrlToPhoto } from "./uploads";

/**
 * MySQL / MariaDB access layer.
 *
 * Configuration comes from environment variables (see .env.example).
 * The schema is created automatically on first use (CREATE TABLE IF NOT EXISTS),
 * so a fresh, empty database from cPanel "MySQL Databases" is enough.
 */

type Param = string | number | boolean | null | Date;

declare global {
  // eslint-disable-next-line no-var
  var __avaraPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __avaraInit: Promise<void> | undefined;
}

function createPool(): Pool {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 5),
    charset: "utf8mb4",
    // Return DATETIME columns as "YYYY-MM-DD HH:MM:SS" strings (same as the old SQLite layer)
    dateStrings: true,
    timezone: "+07:00",
  });

  // All timestamps (CURRENT_TIMESTAMP / NOW()) are stored in WIB.
  pool.pool.on("connection", (conn) => {
    conn.query("SET time_zone = '+07:00'");
  });

  return pool;
}

function getPool(): Pool {
  if (!globalThis.__avaraPool) {
    globalThis.__avaraPool = createPool();
  }
  return globalThis.__avaraPool;
}

async function ready(): Promise<Pool> {
  if (!globalThis.__avaraInit) {
    globalThis.__avaraInit = initDatabase(getPool()).catch((err) => {
      // allow retry on the next request
      globalThis.__avaraInit = undefined;
      throw err;
    });
  }
  await globalThis.__avaraInit;
  return getPool();
}

/** SELECT returning all rows. */
export async function query<T = any>(sql: string, params: Param[] = []): Promise<T[]> {
  const pool = await ready();
  const [rows] = await pool.query<RowDataPacket[]>(sql, params);
  return rows as T[];
}

/** SELECT returning the first row or undefined. */
export async function queryOne<T = any>(sql: string, params: Param[] = []): Promise<T | undefined> {
  const rows = await query<T>(sql, params);
  return rows[0];
}

/** INSERT / UPDATE / DELETE. */
export async function execute(sql: string, params: Param[] = []): Promise<ResultSetHeader> {
  const pool = await ready();
  const [result] = await pool.query<ResultSetHeader>(sql, params);
  return result;
}

export function isDuplicateError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "ER_DUP_ENTRY";
}

// ---------------------------------------------------------------------------
// Schema & seed
// ---------------------------------------------------------------------------

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS settings (
    id INT PRIMARY KEY,
    app_name VARCHAR(100) DEFAULT 'AVARA',
    logo_url MEDIUMTEXT,
    welcome_text TEXT,
    quote_text TEXT,
    quote_author VARCHAR(255)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS divisi (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS region (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS kategori (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS kategori_pemohon (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin','pemohon') NOT NULL DEFAULT 'pemohon',
    divisi_id INT NULL,
    kategori_pemohon_id INT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_divisi FOREIGN KEY (divisi_id) REFERENCES divisi(id) ON DELETE SET NULL,
    CONSTRAINT fk_users_katpem FOREIGN KEY (kategori_pemohon_id) REFERENCES kategori_pemohon(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS laporan (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nomor_tindak_lanjut VARCHAR(20) NOT NULL UNIQUE,
    pemohon_id INT NOT NULL,
    kategori_id INT NOT NULL,
    region_id INT NOT NULL,
    segmentasi VARCHAR(255) NOT NULL,
    deskripsi TEXT NOT NULL,
    durasi_repair INT DEFAULT 14,
    durasi_laporan INT DEFAULT 1,
    status VARCHAR(30) DEFAULT 'Proses Lapangan',
    is_verified TINYINT(1) DEFAULT 0,
    attachments LONGTEXT,
    lokasi VARCHAR(500) DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    verified_at DATETIME NULL,
    INDEX idx_laporan_pemohon (pemohon_id),
    INDEX idx_laporan_created (created_at),
    CONSTRAINT fk_laporan_pemohon FOREIGN KEY (pemohon_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_laporan_kategori FOREIGN KEY (kategori_id) REFERENCES kategori(id) ON DELETE RESTRICT,
    CONSTRAINT fk_laporan_region FOREIGN KEY (region_id) REFERENCES region(id) ON DELETE RESTRICT
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

async function count(conn: PoolConnection, table: string): Promise<number> {
  const [rows] = await conn.query<RowDataPacket[]>(`SELECT COUNT(*) AS c FROM ${table}`);
  return Number(rows[0].c);
}

async function seedNames(conn: PoolConnection, table: string, names: string[]) {
  if ((await count(conn, table)) > 0) return;
  for (const name of names) {
    await conn.query(`INSERT INTO ${table} (name) VALUES (?)`, [name]);
  }
}

async function initDatabase(pool: Pool): Promise<void> {
  const conn = await pool.getConnection();
  try {
    for (const stmt of SCHEMA) {
      await conn.query(stmt);
    }

    if ((await count(conn, "settings")) === 0) {
      await conn.query(
        `INSERT INTO settings (id, app_name, logo_url, welcome_text, quote_text, quote_author) VALUES (1, 'AVARA', '', ?, ?, ?)`,
        [
          "Selamat Datang di Sistem Rekap & Laporan Teknisi Avara",
          "Kecepatan penanganan jaringan dan akurasi pelaporan adalah wujud dedikasi kami untuk kehandalan layanan.",
          "Avara Management",
        ]
      );
    }

    await seedNames(conn, "divisi", ["Fiber Optic", "Radio Wireless", "Core Network", "Maintenance & Support", "Infrastructure"]);
    await seedNames(conn, "region", ["Serang", "Cilegon", "Tangerang", "Jakarta Barat", "Lebak", "Pandeglang"]);
    await seedNames(conn, "kategori", ["PM Non Project", "Tindak Lanjut", "Preventive Maintenance", "Corrective Action"]);
    await seedNames(conn, "kategori_pemohon", ["Teknisi Internal", "Mitra Lapangan", "Project Engineer", "Helpdesk Support"]);

    // Initial admin account: credentials come from env, never hard-coded.
    const [admins] = await conn.query<RowDataPacket[]>("SELECT COUNT(*) AS c FROM users WHERE role = 'admin'");
    if (Number(admins[0].c) === 0) {
      const username = (process.env.ADMIN_USERNAME || "admin").trim().toLowerCase();
      const password = process.env.ADMIN_PASSWORD;
      if (!password || password.length < 8) {
        console.warn(
          "[avara] No admin account exists. Set ADMIN_PASSWORD (min. 8 characters) and restart to create one."
        );
      } else {
        const hash = await bcrypt.hash(password, 10);
        await conn.query(
          "INSERT INTO users (name, username, password, role, divisi_id, kategori_pemohon_id) VALUES (?, ?, ?, 'admin', NULL, NULL)",
          [process.env.ADMIN_NAME || "Administrator", username, hash]
        );
        console.log(`[avara] Created initial admin account "${username}".`);
      }
    }

    if (process.env.SEED_DEMO === "true") {
      await seedDemo(conn);
    }

    await migrateInlinePhotos(conn);
  } finally {
    conn.release();
  }
}

/**
 * One-time migration: older reports stored photos as base64 data URLs inside
 * laporan.attachments. Move them to files (lib/uploads.ts) and keep only URLs.
 * Safe to run on every start; it only touches rows that still contain "data:".
 */
async function migrateInlinePhotos(conn: PoolConnection) {
  const [rows] = await conn.query<RowDataPacket[]>(
    "SELECT id FROM laporan WHERE attachments LIKE '%\"data:%'"
  );
  if (rows.length === 0) return;

  let moved = 0;
  for (const { id } of rows) {
    const [[row]] = await conn.query<RowDataPacket[]>("SELECT pemohon_id, attachments FROM laporan WHERE id = ?", [id]);
    let list: unknown[];
    try {
      list = JSON.parse(row.attachments || "[]");
    } catch {
      continue;
    }
    if (!Array.isArray(list)) continue;

    const converted: string[] = [];
    for (const item of list) {
      if (typeof item !== "string") continue;
      if (item.startsWith("data:")) {
        const url = await dataUrlToPhoto(row.pemohon_id, item);
        if (url) {
          converted.push(url);
          moved++;
        } else {
          console.warn(`[avara] laporan ${id}: dropped an unreadable inline photo`);
        }
      } else {
        converted.push(item);
      }
    }
    await conn.query("UPDATE laporan SET attachments = ? WHERE id = ?", [JSON.stringify(converted), id]);
  }
  console.log(`[avara] Moved ${moved} inline photo(s) from ${rows.length} report(s) to files.`);
}

/** Demo technicians + sample reports, for local development only (SEED_DEMO=true). */
async function seedDemo(conn: PoolConnection) {
  if ((await count(conn, "laporan")) > 0) return;

  const ids: Record<string, number> = {};
  const demoUsers: [string, string, string, number, number][] = [
    ["Sodik", "sodik", "sodik123", 1, 1],
    ["Yusuf", "yusuf", "yusuf123", 1, 1],
    ["Sanari", "sanari", "sanari123", 2, 2],
    ["Budi Santoso", "budisantoso", "budi123", 3, 1],
  ];
  for (const [name, username, password, divisi, katPem] of demoUsers) {
    const [existing] = await conn.query<RowDataPacket[]>("SELECT id FROM users WHERE username = ?", [username]);
    if (existing.length > 0) {
      ids[username] = existing[0].id;
      continue;
    }
    const [res] = await conn.query<ResultSetHeader>(
      "INSERT INTO users (name, username, password, role, divisi_id, kategori_pemohon_id) VALUES (?, ?, ?, 'pemohon', ?, ?)",
      [name, username, await bcrypt.hash(password, 10), divisi, katPem]
    );
    ids[username] = res.insertId;
  }

  const img1 = "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80";
  const img2 = "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80";
  const img3 = "https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=600&q=80";

  const reports: [string, string, number, number, string, string, number, number, string, number, string[], string][] = [
    ["261101-001", "yusuf", 1, 1, "xcc serang - Bluebird", "Pemindahan tiang dan swing link ke kabel 96 dwdm", 14, 14, "Selesai", 1, [img1, img2], "2026-11-01 09:30:00"],
    ["261103-001", "sodik", 2, 1, "xcc serang - Bluebird", "Jointing core idle & perlu swing link ke kabel 96 dwdm", 14, 14, "Proses Lapangan", 0, [img3], "2026-11-03 14:15:00"],
    ["261104-001", "sanari", 2, 3, "Backbone Tangerang - Jakarta", "Switch link trunk dan pengecekan redaman optical", 14, 8, "Warning", 0, [img1], "2026-11-04 11:00:00"],
    ["261105-001", "sodik", 1, 1, "xcc serang - Bluebird", "perlu swing link ke kabel 96 dwdm", 14, 5, "Proses Lapangan", 0, [img2], "2026-11-05 10:20:00"],
    ["261106-001", "yusuf", 1, 2, "Feeder Kawasan Industri Krakatau", "Pembersihan OTB dan splice tray jalur utama", 14, 14, "Selesai", 1, [], "2026-11-06 16:45:00"],
    ["261107-001", "sanari", 2, 4, "Metro-E Kebon Jeruk", "Penggantian SFP transceiver 10G", 14, 14, "Selesai", 1, [], "2026-11-07 08:15:00"],
  ];
  for (const [nomor, user, kat, reg, seg, desk, dr, dl, status, verified, att, created] of reports) {
    await conn.query(
      `INSERT INTO laporan (nomor_tindak_lanjut, pemohon_id, kategori_id, region_id, segmentasi, deskripsi, durasi_repair, durasi_laporan, status, is_verified, attachments, lokasi, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?)`,
      [nomor, ids[user], kat, reg, seg, desk, dr, dl, status, verified, JSON.stringify(att), created]
    );
  }
  console.log("[avara] Seeded demo data.");
}

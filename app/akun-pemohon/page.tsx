"use client";

import React, { useEffect, useState, useMemo } from "react";
import AdminLayout from "@/components/AdminLayout";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
} from "lucide-react";

interface UserItem {
  id: number;
  name: string;
  username: string;
  role: string;
  divisi_id: number | null;
  divisi_name: string | null;
  kategori_pemohon_id: number | null;
  kategori_pemohon_name: string | null;
  total_laporan: number;
  created_at: string;
}

interface KatPemohonItem {
  id: number;
  name: string;
}

interface DivisiItem {
  id: number;
  name: string;
}

export default function AkunPemohonPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [kategoriList, setKategoriList] = useState<KatPemohonItem[]>([]);
  const [divisiList, setDivisiList] = useState<DivisiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Modals state
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);

  const [isKatModalOpen, setIsKatModalOpen] = useState(false);
  const [editingKat, setEditingKat] = useState<KatPemohonItem | null>(null);
  const [katInputName, setKatInputName] = useState("");

  // User form fields
  const [formName, setFormName] = useState("");
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formDivisiId, setFormDivisiId] = useState("");
  const [formKatId, setFormKatId] = useState("");
  const [formError, setFormError] = useState("");
  const [isUsernameManuallyEdited, setIsUsernameManuallyEdited] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [uRes, kRes, dRes] = await Promise.all([
        fetch("/api/pemohon"),
        fetch("/api/kategori-pemohon"),
        fetch("/api/divisi"),
      ]);

      const [uData, kData, dData] = await Promise.all([
        uRes.json(),
        kRes.json(),
        dRes.json(),
      ]);

      if (Array.isArray(uData)) setUsers(uData);
      if (Array.isArray(kData)) setKategoriList(kData);
      if (Array.isArray(dData)) setDivisiList(dData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.divisi_name && u.divisi_name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [users, searchTerm]);

  // Handle auto-generate username from name
  const handleNameChange = (val: string) => {
    setFormName(val);
    if (!editingUser && !isUsernameManuallyEdited) {
      const generated = val.toLowerCase().replace(/\s+/g, "");
      setFormUsername(generated);
    }
  };

  // Open modal to add user
  const openAddUserModal = () => {
    setEditingUser(null);
    setFormName("");
    setFormUsername("");
    setFormPassword("");
    setFormDivisiId(divisiList[0] ? String(divisiList[0].id) : "");
    setFormKatId(kategoriList[0] ? String(kategoriList[0].id) : "");
    setIsUsernameManuallyEdited(false);
    setFormError("");
    setIsUserModalOpen(true);
  };

  // Open modal to edit user
  const openEditUserModal = (u: UserItem) => {
    setEditingUser(u);
    setFormName(u.name);
    setFormUsername(u.username);
    setFormPassword("");
    setFormDivisiId(u.divisi_id ? String(u.divisi_id) : "");
    setFormKatId(u.kategori_pemohon_id ? String(u.kategori_pemohon_id) : "");
    setIsUsernameManuallyEdited(true);
    setFormError("");
    setIsUserModalOpen(true);
  };

  // Submit User form
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formName.trim() || !formUsername.trim()) {
      setFormError("Nama lengkap dan username wajib diisi");
      return;
    }

    if (!editingUser && !formPassword) {
      setFormError("Password baru wajib diisi");
      return;
    }

    try {
      const method = editingUser ? "PUT" : "POST";
      const payload: any = {
        name: formName.trim(),
        username: formUsername.trim().toLowerCase(),
        divisi_id: formDivisiId ? parseInt(formDivisiId, 10) : null,
        kategori_pemohon_id: formKatId ? parseInt(formKatId, 10) : null,
      };

      if (editingUser) {
        payload.id = editingUser.id;
        if (formPassword) payload.password = formPassword;
      } else {
        payload.password = formPassword;
      }

      const res = await fetch("/api/pemohon", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Gagal menyimpan data pemohon");
        return;
      }

      setIsUserModalOpen(false);
      loadData();
    } catch {
      setFormError("Terjadi kesalahan jaringan");
    }
  };

  // Delete user
  const handleDeleteUser = async (id: number) => {
    if (!confirm("Yakin ingin menghapus akun pemohon ini?")) return;
    try {
      const res = await fetch(`/api/pemohon?id=${id}`, { method: "DELETE" });
      if (res.ok) loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Kategori Pemohon actions
  const openAddKatModal = () => {
    setEditingKat(null);
    setKatInputName("");
    setIsKatModalOpen(true);
  };

  const openEditKatModal = (k: KatPemohonItem) => {
    setEditingKat(k);
    setKatInputName(k.name);
    setIsKatModalOpen(true);
  };

  const handleSaveKategori = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!katInputName.trim()) return;

    try {
      const method = editingKat ? "PUT" : "POST";
      const payload: any = { name: katInputName.trim() };
      if (editingKat) payload.id = editingKat.id;

      const res = await fetch("/api/kategori-pemohon", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsKatModalOpen(false);
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteKategori = async (id: number) => {
    if (!confirm("Hapus kategori pemohon ini?")) return;
    try {
      const res = await fetch(`/api/kategori-pemohon?id=${id}`, { method: "DELETE" });
      if (res.ok) loadData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AdminLayout pageTitle="Akun Pemohon" breadcrumb="Akun Pemohon">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Kolom Kiri: Kategori Pemohon (col-4) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Kategori Pemohon</h3>
              <p className="text-xs text-slate-400 mt-0.5">Kelola tipe / kelompok akun pemohon</p>
            </div>
            <button
              onClick={openAddKatModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-semibold transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah</span>
            </button>
          </div>

          <div className="space-y-2">
            {kategoriList.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/70 hover:bg-slate-50 transition border border-slate-100"
              >
                <span className="text-xs font-semibold text-slate-800">{item.name}</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => openEditKatModal(item)}
                    className="text-xs font-medium text-blue-600 hover:text-blue-800 transition"
                  >
                    Edit
                  </button>
                  <span className="text-slate-300">·</span>
                  <button
                    onClick={() => handleDeleteKategori(item.id)}
                    className="text-xs font-medium text-red-500 hover:text-red-700 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Kolom Kanan: Daftar Akun Pemohon (col-8) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Daftar Akun Pemohon</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Kelola akun teknisi pemohon laporan
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari Pemohon..."
                  className="pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Add New Pemohon Button */}
              <button
                onClick={openAddUserModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0084FF] hover:bg-blue-600 text-white text-xs font-bold shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Pemohon</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                  <th className="py-4 px-6 w-12 text-center">No</th>
                  <th className="py-4 px-6">Nama</th>
                  <th className="py-4 px-6 text-center">Total Laporan</th>
                  <th className="py-4 px-6 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400">
                      Memuat daftar akun pemohon...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400">
                      Belum ada akun pemohon yang terdaftar
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u, idx) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-4 px-6 text-center text-slate-400 font-medium">{idx + 1}</td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-xs">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{u.name}</p>
                            <p className="text-[11px] text-slate-400">
                              @{u.username} {u.divisi_name ? `• ${u.divisi_name}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-[#EBF5FF] text-[#0084FF]">
                          {u.total_laporan} Laporan
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditUserModal(u)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition"
                          >
                            <Pencil className="w-3 h-3 text-blue-500" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition"
                          >
                            <Trash2 className="w-3 h-3 text-red-500" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Add / Edit Pemohon */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-base">
                {editingUser ? "Edit Akun Pemohon" : "Tambah Pemohon Baru"}
              </h3>
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 font-medium">
                  {formError}
                </div>
              )}

              {/* Nama Lengkap */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Contoh: Sodik Ramadhan"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>

              {/* Select Divisi */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Divisi
                </label>
                <select
                  value={formDivisiId}
                  onChange={(e) => setFormDivisiId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="">Pilih Divisi</option>
                  {divisiList.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Kategori Pemohon */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Kategori Pemohon
                </label>
                <select
                  value={formKatId}
                  onChange={(e) => setFormKatId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="">Pilih Kategori</option>
                  {kategoriList.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Username (auto-generated, but editable) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Username
                  </label>
                  <span className="text-[11px] text-slate-400">Otomatis digenerate</span>
                </div>
                <input
                  type="text"
                  value={formUsername}
                  onChange={(e) => {
                    setIsUsernameManuallyEdited(true);
                    setFormUsername(e.target.value);
                  }}
                  placeholder="username_pemohon"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>

              {/* Input Password Baru */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  {editingUser ? "Password Baru (Kosongkan jika tidak diganti)" : "Password Baru"}
                </label>
                <input
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder={editingUser ? "••••••••" : "Masukkan password baru"}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required={!editingUser}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#0084FF] hover:bg-blue-600 text-white rounded-xl text-xs font-bold shadow-sm transition"
                >
                  {editingUser ? "Simpan Perubahan" : "Register"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add / Edit Kategori Pemohon */}
      {isKatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-base">
                {editingKat ? "Edit Kategori Pemohon" : "Tambah Kategori Pemohon"}
              </h3>
              <button
                onClick={() => setIsKatModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveKategori} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nama Kategori
                </label>
                <input
                  type="text"
                  value={katInputName}
                  onChange={(e) => setKatInputName(e.target.value)}
                  placeholder="Contoh: Teknisi Internal"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsKatModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#0084FF] hover:bg-blue-600 text-white rounded-xl text-xs font-bold shadow-sm transition"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

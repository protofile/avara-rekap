"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  Image as ImageIcon,
  User,
  Tag,
  MapPin,
  Layers,
  Send,
  LogOut,
  ChevronDown,
  X,
  CheckCircle2,
  History,
  PlusCircle,
  ShieldAlert,
  Navigation,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";

interface KategoriItem {
  id: number;
  name: string;
}

interface RegionItem {
  id: number;
  name: string;
}

interface UserSession {
  id: number;
  name: string;
  username: string;
  role: string;
  divisi_name?: string;
}

interface RiwayatItem {
  id: number;
  nomor_tindak_lanjut: string;
  kategori: string;
  region: string;
  lokasi?: string;
  segmentasi: string;
  deskripsi: string;
  durasi_repair: number;
  durasi_laporan: number;
  status: string;
  is_verified: number;
  attachments: string[];
  created_at: string;
}

export default function PemohonDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [activeTab, setActiveTab] = useState<"form" | "riwayat">("form");

  // Options
  const [kategoriList, setKategoriList] = useState<KategoriItem[]>([]);
  const [regionList, setRegionList] = useState<RegionItem[]>([]);
  const [riwayatList, setRiwayatList] = useState<RiwayatItem[]>([]);

  // Form state
  const [selectedKategori, setSelectedKategori] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [lokasi, setLokasi] = useState("");
  const [segmentasi, setSegmentasi] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Success view state
  const [isSubmitSuccessView, setIsSubmitSuccessView] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<{
    nomor_tindak_lanjut: string;
    kategori: string;
    region: string;
    lokasi?: string;
    segmentasi: string;
    created_at: string;
  } | null>(null);

  // Dropdown header & Location button
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [gettingLokasi, setGettingLokasi] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const handleCekLokasi = () => {
    if (!navigator.geolocation) {
      alert("Perangkat Anda tidak mendukung fitur lokasi GPS");
      return;
    }
    setGettingLokasi(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
        setLokasi(mapsUrl);
        setGettingLokasi(false);
      },
      (err) => {
        console.error(err);
        alert("Gagal membaca titik lokasi GPS. Pastikan izin lokasi (GPS) pada peramban telah diizinkan.");
        setGettingLokasi(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Hidden file inputs
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const storageInputRef = useRef<HTMLInputElement>(null);

  // Load session & master data
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) {
          router.push("/login");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data && data.user) {
          setUser(data.user);
          loadRiwayat(data.user.id);
        }
      })
      .catch(() => router.push("/login"));

    fetch("/api/kategori")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setKategoriList(data);
          if (data.length > 0) setSelectedKategori(String(data[0].id));
        }
      })
      .catch(console.error);

    fetch("/api/region")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setRegionList(data);
          if (data.length > 0) setSelectedRegion(String(data[0].id));
        }
      })
      .catch(console.error);
  }, []);

  const loadRiwayat = (userId: number) => {
    fetch(`/api/laporan?pemohon_id=${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setRiwayatList(data);
      })
      .catch(console.error);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  // Handle files conversion to base64
  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const newFiles = Array.from(fileList);

    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setImages((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Submit Laporan
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!selectedKategori || !selectedRegion || !segmentasi.trim() || !deskripsi.trim()) {
      setErrorMessage("Semua kolom bertanda * wajib diisi.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/laporan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kategori_id: parseInt(selectedKategori, 10),
          region_id: parseInt(selectedRegion, 10),
          lokasi: lokasi.trim(),
          segmentasi: segmentasi.trim(),
          deskripsi: deskripsi.trim(),
          attachments: images,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        setErrorMessage(resData.error || "Gagal mengirim laporan");
        return;
      }

      const currentKat = kategoriList.find((k) => String(k.id) === selectedKategori)?.name || "Kategori";
      const currentReg = regionList.find((r) => String(r.id) === selectedRegion)?.name || "Region";

      setSubmittedTicket({
        nomor_tindak_lanjut: resData.data?.nomor_tindak_lanjut || "261107-xxx",
        kategori: currentKat,
        region: currentReg,
        lokasi: lokasi.trim(),
        segmentasi: segmentasi.trim(),
        created_at: new Date().toISOString(),
      });

      setIsSubmitSuccessView(true);

      // Reset form fields
      setLokasi("");
      setSegmentasi("");
      setDeskripsi("");
      setImages([]);

      if (user) loadRiwayat(user.id);
    } catch {
      setErrorMessage("Terjadi kesalahan jaringan");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "Selesai") {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E6F9F0] text-[#10B981]">
          Selesai
        </span>
      );
    }
    if (status === "Warning") {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FEECEC] text-[#EF4444]">
          Warning
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFF3EB] text-[#F97316]">
        Proses Lapangan
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16">
      {/* Mobile-optimized Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          {/* Logo Avara */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0084FF] text-white font-black flex items-center justify-center text-lg shadow-sm">
              A
            </div>
            <div>
              <span className="font-extrabold text-base tracking-wider text-slate-900 block leading-tight">
                AVARA
              </span>
              <span className="text-[10px] text-slate-400 font-medium leading-none">
                Portal Teknisi
              </span>
            </div>
          </div>

          {/* User Info & Dropdown Logout */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] flex items-center justify-center font-bold">
                {user?.name ? user.name.charAt(0).toUpperCase() : "P"}
              </div>
              <span className="max-w-[90px] truncate">{user?.name || "Pemohon"}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-800 truncate">{user?.name}</p>
                  <p className="text-[10px] text-slate-400">
                    {user?.divisi_name || "Teknisi Lapangan"}
                  </p>
                </div>
                {user?.role === "admin" && (
                  <button
                    onClick={() => router.push("/dashboard")}
                    className="w-full text-left px-4 py-2 text-xs text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                  >
                    <span>Masuk Dashboard Admin</span>
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5 text-red-500" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {/* Navigation Tabs (Mobile) */}
        <div className="bg-white p-1 rounded-2xl border border-slate-100 shadow-sm flex items-center text-xs font-semibold">
          <button
            onClick={() => setActiveTab("form")}
            className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 transition ${
              activeTab === "form"
                ? "bg-[#0084FF] text-white shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Buat Laporan</span>
          </button>
          <button
            onClick={() => setActiveTab("riwayat")}
            className={`flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 transition ${
              activeTab === "riwayat"
                ? "bg-[#0084FF] text-white shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <History className="w-4 h-4" />
            <span>Riwayat Saya ({riwayatList.length})</span>
          </button>
        </div>

        {/* Tab 1: Form Permohonan / Success Screen */}
        {activeTab === "form" && (
          isSubmitSuccessView ? (
            /* Tampilan Sukses dengan Icon Check Besar dan Tombol Kembali */
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm text-center animate-in zoom-in-95 duration-200 space-y-5">
              {/* Icon Check Besar */}
              <div className="w-24 h-24 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto ring-8 ring-emerald-50/50 shadow-inner">
                <CheckCircle2 className="w-14 h-14 text-emerald-500" />
              </div>

              {/* Teks Pemberitahuan */}
              <div className="space-y-1.5">
                <h2 className="text-xl font-bold text-slate-900">
                  Laporan Berhasil Dikirim!
                </h2>
                <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                  Laporan dan dokumentasi teknisi Anda telah sukses tercatat di sistem pemantauan Avara.
                </p>
              </div>

              {/* Ringkasan Tiket Laporan */}
              {submittedTicket && (
                <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 text-left space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      No. Tindak Lanjut
                    </span>
                    <span className="text-xs font-mono font-bold text-[#0084FF] bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                      {submittedTicket.nomor_tindak_lanjut}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Kategori</span>
                    <span className="font-semibold text-slate-800">{submittedTicket.kategori}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Region</span>
                    <span className="font-semibold text-slate-800">{submittedTicket.region}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Segmen</span>
                    <span className="font-semibold text-slate-800 max-w-[170px] truncate">
                      {submittedTicket.segmentasi}
                    </span>
                  </div>

                  {submittedTicket.lokasi && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Lokasi</span>
                      {submittedTicket.lokasi.startsWith("http") ? (
                        <a
                          href={submittedTicket.lokasi}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-blue-600 hover:underline inline-flex items-center gap-1"
                        >
                          <span>Buka di Maps</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ) : (
                        <span className="font-semibold text-slate-800 max-w-[170px] truncate">
                          {submittedTicket.lokasi}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-200/70">
                    <span className="text-slate-500 font-medium">Status Pekerjaan</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FFF3EB] text-[#F97316]">
                      Proses Lapangan
                    </span>
                  </div>
                </div>
              )}

              {/* Tombol Aksi (Tombol Kembali) */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSubmitSuccessView(false)}
                  className="w-full py-3 px-4 rounded-xl bg-[#0084FF] hover:bg-blue-600 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Kembali</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsSubmitSuccessView(false);
                    setActiveTab("riwayat");
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                >
                  Lihat Riwayat Laporan Saya
                </button>
              </div>
            </div>
          ) : (
            /* Form Input Permohonan / Laporan */
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Form Laporan Teknisi</h2>
                <p className="text-xs text-slate-400">
                  Kirim data hasil pekerjaan dan lampirkan foto dokumentasi
                </p>
              </div>

              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5 animate-in fade-in">
                  <ShieldAlert className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Field 1: Nama Pemohon (Readonly / Otomatis terisi) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Nama Pemohon
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={user?.name || "Memuat pemohon..."}
                    readOnly
                    disabled
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 cursor-not-allowed select-none"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Otomatis terisi dari akun Anda yang sedang aktif.
                </p>
              </div>

              {/* Field 2: Select Kategori */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Kategori Pekerjaan *
                </label>
                <div className="relative">
                  <Tag className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <select
                    value={selectedKategori}
                    onChange={(e) => setSelectedKategori(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none"
                    required
                  >
                    {kategoriList.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Field 3: Select Region */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Region Lokasi *
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <select
                    value={selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none"
                    required
                  >
                    {regionList.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Field 4: Lokasi (Di atas Segmen BB - input link Google Maps dengan tombol primary Cek Lokasi di sisi kanan) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Lokasi (Google Maps / Koordinat)
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={lokasi}
                      onChange={(e) => setLokasi(e.target.value)}
                      placeholder="Input link Google Maps atau klik Cek Lokasi"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCekLokasi}
                    disabled={gettingLokasi}
                    className="flex-shrink-0 px-3.5 py-2.5 rounded-xl bg-[#0084FF] hover:bg-blue-600 active:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-500/20 flex items-center justify-center gap-1.5 border border-transparent transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    <Navigation className={`w-3.5 h-3.5 ${gettingLokasi ? "animate-spin" : ""}`} />
                    <span>{gettingLokasi ? "Membaca..." : "Cek Lokasi"}</span>
                  </button>
                </div>
                {lokasi && (
                  <div className="mt-1 flex items-center justify-between text-[10px]">
                    <span className="text-slate-400 truncate max-w-[220px]">
                      {lokasi.startsWith("http") ? "Link Google Maps terdeteksi" : "Koordinat terinput"}
                    </span>
                    {lokasi.startsWith("http") && (
                      <a
                        href={lokasi}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 font-semibold hover:underline inline-flex items-center gap-1"
                      >
                        <span>Uji Buka Maps</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Field 5: Segmen BB / Feeder / Access (Diisi manual oleh teknisi) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Segmen BB / Feeder / Access *
                </label>
                <div className="relative">
                  <Layers className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={segmentasi}
                    onChange={(e) => setSegmentasi(e.target.value)}
                    placeholder="Contoh: xcc serang - Bluebird"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    required
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Diisi manual oleh teknisi sesuai segmen jaringan.
                </p>
              </div>

              {/* Field 5: Lampiran (Camera & Storage Upload) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Lampiran Foto Dokumentasi
                </label>

                {/* Hidden File Inputs */}
                <input
                  type="file"
                  ref={cameraInputRef}
                  accept="image/*"
                  capture="environment"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
                <input
                  type="file"
                  ref={storageInputRef}
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />

                {/* Action Buttons for Mobile */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-dashed border-blue-300 bg-blue-50/50 hover:bg-blue-50 text-[#0084FF] transition"
                  >
                    <Camera className="w-5 h-5 mb-1" />
                    <span className="text-xs font-bold">Kamera Langsung</span>
                    <span className="text-[10px] text-blue-400">Ambil foto baru</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => storageInputRef.current?.click()}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 transition"
                  >
                    <ImageIcon className="w-5 h-5 mb-1 text-slate-500" />
                    <span className="text-xs font-bold">Dari Galeri / File</span>
                    <span className="text-[10px] text-slate-400">Pilih dari hp</span>
                  </button>
                </div>

                {/* Image Previews */}
                {images.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[11px] font-semibold text-slate-500 mb-2">
                      Foto Terlampir ({images.length})
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {images.map((img, idx) => (
                        <div
                          key={idx}
                          className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img}
                            alt={`Preview ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="absolute top-1 right-1 p-1 bg-red-600/90 hover:bg-red-700 text-white rounded-full transition shadow-sm"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Field 6: Deskripsi (textarea) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Deskripsi Pekerjaan *
                </label>
                <textarea
                  value={deskripsi}
                  onChange={(e) => setDeskripsi(e.target.value)}
                  rows={3}
                  placeholder="Jelaskan detail perbaikan, kendala di lapangan, atau kebutuhan lanjutan..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                  required
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-4 rounded-xl bg-[#0084FF] hover:bg-blue-600 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {submitting ? (
                  <span>Mengirim Laporan...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Kirim Laporan</span>
                  </>
                )}
              </button>
            </form>
          </div>
          )
        )}

        {/* Tab 2: Riwayat Laporan Saya */}
        {activeTab === "riwayat" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-bold text-slate-800">Riwayat Laporan Saya</h2>
              <span className="text-xs text-slate-400 font-medium">
                Total: {riwayatList.length} laporan
              </span>
            </div>

            {riwayatList.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-100 text-xs text-slate-400">
                Anda belum memiliki riwayat laporan.
              </div>
            ) : (
              riwayatList.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#0084FF] font-mono">
                      {item.nomor_tindak_lanjut}
                    </span>
                    {getStatusBadge(item.status)}
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-800 text-xs">{item.kategori}</h4>
                    <p className="text-[11px] text-slate-500 font-medium">{item.segmentasi}</p>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {item.deskripsi}
                  </p>

                  {/* Foto Lampiran di Riwayat */}
                  {item.attachments && item.attachments.length > 0 && (
                    <div className="flex items-center gap-2 pt-1 overflow-x-auto pb-1">
                      {item.attachments.map((photo, pIdx) => (
                        <div
                          key={pIdx}
                          onClick={() => setPreviewPhoto(photo)}
                          className="w-14 h-14 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0 cursor-pointer shadow-xs hover:opacity-90 transition"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={photo} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-50">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{item.region}</span>
                    </div>
                    <div>
                      <span>
                        {new Date(item.created_at).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Lightbox Preview Foto Riwayat */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <div className="relative max-w-sm max-h-[85vh]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewPhoto}
              alt="Preview"
              className="max-h-[80vh] max-w-full rounded-2xl shadow-2xl object-contain"
            />
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

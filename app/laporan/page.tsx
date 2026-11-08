"use client";

import React, { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/components/AdminLayout";
import LihatFormModal from "@/components/LihatFormModal";
import VerifikasiModal from "@/components/VerifikasiModal";
import {
  MapPin,
  User,
  Calendar,
  Search,
  CheckCircle2,
} from "lucide-react";

interface LaporanItem {
  id: number;
  nomor_tindak_lanjut: string;
  pemohon_id: number;
  pemohon: string;
  kategori_id: number;
  kategori: string;
  region_id: number;
  region: string;
  segmentasi: string;
  lokasi?: string;
  deskripsi: string;
  durasi_repair: number;
  durasi_laporan: number;
  status: string;
  is_verified: number;
  attachments: string[];
  created_at: string;
}

interface DropdownOption {
  id: number;
  name: string;
}

export default function LaporanPage() {
  const [items, setItems] = useState<LaporanItem[]>([]);
  const [regions, setRegions] = useState<DropdownOption[]>([]);
  const [pelapors, setPelapors] = useState<DropdownOption[]>([]);

  // Filter state
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [selectedPelapor, setSelectedPelapor] = useState("all");
  const [selectedTanggal, setSelectedTanggal] = useState("");
  const [searchDeskripsi, setSearchDeskripsi] = useState("");

  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<LaporanItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Verifikasi Popup Modal State
  const [isVerifikasiModalOpen, setIsVerifikasiModalOpen] = useState(false);
  const [itemToVerify, setItemToVerify] = useState<LaporanItem | null>(null);
  const [isVerifyingSubmitting, setIsVerifyingSubmitting] = useState(false);

  // Fetch filter options
  useEffect(() => {
    fetch("/api/region")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setRegions(data);
      })
      .catch(console.error);

    fetch("/api/pemohon")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setPelapors(data);
      })
      .catch(console.error);
  }, []);

  // Fetch reports
  const fetchLaporan = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedRegion !== "all") params.append("region_id", selectedRegion);
    if (selectedPelapor !== "all") params.append("pemohon_id", selectedPelapor);
    if (selectedTanggal) params.append("tanggal", selectedTanggal);
    if (searchDeskripsi.trim()) params.append("deskripsi", searchDeskripsi.trim());

    fetch(`/api/laporan?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setItems(data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedRegion, selectedPelapor, selectedTanggal, searchDeskripsi]);

  useEffect(() => {
    fetchLaporan();
  }, [fetchLaporan]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLaporan();
  };

  const handleOpenVerifikasi = (item: LaporanItem) => {
    setItemToVerify(item);
    setIsVerifikasiModalOpen(true);
  };

  const handleConfirmSelesai = async (item: LaporanItem) => {
    setIsVerifyingSubmitting(true);
    try {
      const res = await fetch("/api/laporan", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          is_verified: 1,
          status: "Selesai",
        }),
      });

      if (res.ok) {
        await fetchLaporan();
        setIsVerifikasiModalOpen(false);
        setItemToVerify(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsVerifyingSubmitting(false);
    }
  };

  return (
    <AdminLayout pageTitle="Laporan" breadcrumb="Laporan">
      <div className="space-y-6">
        {/* Top Filter Bar */}
        <form
          onSubmit={handleSearchSubmit}
          className="bg-transparent flex flex-wrap items-center gap-3"
        >
          {/* Select Region */}
          <div className="relative flex-1 min-w-[160px]">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 rounded-2xl bg-white border border-slate-200/90 text-xs font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none"
            >
              <option value="all">Pilih Region</option>
              {regions.map((reg) => (
                <option key={reg.id} value={reg.id}>
                  {reg.name}
                </option>
              ))}
            </select>
          </div>

          {/* Select Pelapor */}
          <div className="relative flex-1 min-w-[160px]">
            <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <select
              value={selectedPelapor}
              onChange={(e) => setSelectedPelapor(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 rounded-2xl bg-white border border-slate-200/90 text-xs font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none"
            >
              <option value="all">Pilih Pelapor</option>
              {pelapors.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tanggal */}
          <div className="relative flex-1 min-w-[160px]">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="date"
              value={selectedTanggal}
              onChange={(e) => setSelectedTanggal(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-2xl bg-white border border-slate-200/90 text-xs font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Search Deskripsi */}
          <div className="relative flex-2 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchDeskripsi}
              onChange={(e) => setSearchDeskripsi(e.target.value)}
              placeholder="Deskripsi"
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-white border border-slate-200/90 text-xs font-medium text-slate-700 shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Cari Button */}
          <button
            type="submit"
            className="px-6 py-2.5 rounded-2xl bg-[#0084FF] hover:bg-blue-600 text-white text-xs font-bold shadow-sm transition"
          >
            Cari
          </button>
        </form>

        {/* Card Grid */}
        {loading ? (
          <div className="p-16 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-100">
            Memuat daftar laporan...
          </div>
        ) : items.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-100">
            Tidak ada laporan yang sesuai dengan filter
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  setSelectedItem(item);
                  setIsModalOpen(true);
                }}
                className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-md transition flex flex-col justify-between cursor-pointer"
              >
                <div>
                  {/* Card Header: Category + Lokasi Button */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-900 text-base">{item.kategori}</h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const targetUrl = item.lokasi && item.lokasi.startsWith("http")
                          ? item.lokasi
                          : item.lokasi
                          ? `https://www.google.com/maps?q=${encodeURIComponent(item.lokasi)}`
                          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${item.segmentasi}, ${item.region}`)}`;
                        window.open(targetUrl, "_blank", "noopener,noreferrer");
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EBF5FF] text-[#0084FF] hover:bg-blue-100 transition"
                      title="Buka Lokasi di Google Maps"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Lokasi</span>
                    </button>
                  </div>

                  {/* Card Details */}
                  <div className="space-y-3 text-xs text-slate-600">
                    <div>
                      <p className="text-[11px] text-slate-400 font-medium">Region</p>
                      <p className="font-medium text-slate-800 mt-0.5">{item.region}</p>
                    </div>

                    <div>
                      <p className="text-[11px] text-slate-400 font-medium">Segmentasi</p>
                      <p className="font-medium text-slate-800 mt-0.5">{item.segmentasi}</p>
                    </div>

                    <div>
                      <p className="text-[11px] text-slate-400 font-medium">Deskripsi</p>
                      <p className="font-normal text-slate-700 mt-0.5 leading-relaxed line-clamp-2">
                        {item.deskripsi}
                      </p>
                    </div>

                    {/* Tanggal & Pelaksana */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100/80">
                      <div>
                        <p className="text-[11px] text-slate-400 font-medium">Tanggal</p>
                        <p className="font-medium text-slate-800 mt-0.5">
                          {new Date(item.created_at).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-[11px] text-slate-400 font-medium">Pelaksana</p>
                        <p className="font-semibold text-slate-800 mt-0.5">{item.pemohon}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Action: Verifikasi */}
                <div className="mt-5 pt-3 flex justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenVerifikasi(item);
                    }}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition ${
                      item.is_verified
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100"
                        : "bg-[#EBF5FF] text-[#0084FF] hover:bg-blue-100"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {item.is_verified ? "Terverifikasi" : "Verifikasi"}
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Detail Form */}
      <LihatFormModal
        isOpen={isModalOpen}
        item={selectedItem}
        onClose={() => setIsModalOpen(false)}
        onVerified={fetchLaporan}
      />

      {/* Modal Verifikasi Laporan & Lampiran Foto */}
      <VerifikasiModal
        isOpen={isVerifikasiModalOpen}
        item={itemToVerify}
        onClose={() => setIsVerifikasiModalOpen(false)}
        onConfirmSelesai={handleConfirmSelesai}
        isSubmitting={isVerifyingSubmitting}
      />
    </AdminLayout>
  );
}

"use client";

import React, { useEffect, useState, useMemo } from "react";
import AdminLayout from "@/components/AdminLayout";
import LihatFormModal from "@/components/LihatFormModal";
import { Search, Download, FileText, Filter, X } from "lucide-react";

interface RekapItem {
  id: number;
  nomor_tindak_lanjut: string;
  pemohon_id: number;
  pemohon: string;
  kategori_id: number;
  kategori: string;
  region_id: number;
  region: string;
  segmentasi: string;
  deskripsi: string;
  durasi_repair: number;
  durasi_laporan: number;
  status: string;
  is_verified: number;
  attachments: string[];
  created_at: string;
}

export default function RekapPage() {
  const [items, setItems] = useState<RekapItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [kategoriFilter, setKategoriFilter] = useState("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<RekapItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchRekap = () => {
    setLoading(true);
    fetch("/api/rekap")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setItems(data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRekap();
  }, []);

  // Instant search & filter
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        item.nomor_tindak_lanjut.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.pemohon.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.deskripsi.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.kategori.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "Selesai" && item.status === "Selesai") ||
        (statusFilter === "Warning" && item.status === "Warning") ||
        (statusFilter === "Proses" && (item.status === "Proses Lapangan" || item.status === "Belum selesai"));

      const matchKategori = kategoriFilter === "all" || item.kategori === kategoriFilter;

      return matchSearch && matchStatus && matchKategori;
    });
  }, [items, searchTerm, statusFilter, kategoriFilter]);

  const handleExportCSV = () => {
    if (items.length === 0) return;
    const headers = [
      "No",
      "No. Tindak Lanjut",
      "Pemohon",
      "Kategori",
      "Deskripsi",
      "Durasi Repair (hari)",
      "Durasi Laporan (hari)",
      "Status",
      "Tanggal",
    ];

    const rows = filteredItems.map((item, idx) => [
      idx + 1,
      item.nomor_tindak_lanjut,
      `"${item.pemohon.replace(/"/g, '""')}"`,
      `"${item.kategori.replace(/"/g, '""')}"`,
      `"${item.deskripsi.replace(/"/g, '""')}"`,
      item.durasi_repair,
      item.durasi_laporan,
      item.status,
      new Date(item.created_at).toLocaleDateString("id-ID"),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Rekap_Avara_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    if (status === "Selesai") {
      return (
        <span className="inline-block px-3.5 py-1 rounded-full text-xs font-semibold bg-[#E6F9F0] text-[#10B981] whitespace-nowrap">
          Selesai
        </span>
      );
    }
    if (status === "Warning") {
      return (
        <span className="inline-block px-3.5 py-1 rounded-full text-xs font-semibold bg-[#FEECEC] text-[#EF4444] whitespace-nowrap">
          Warning
        </span>
      );
    }
    return (
      <span className="inline-block px-3.5 py-1 rounded-full text-xs font-semibold bg-[#FFF3EB] text-[#F97316] whitespace-nowrap">
        Belum selesai
      </span>
    );
  };

  return (
    <AdminLayout pageTitle="Rekap" breadcrumb="Rekap">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] overflow-hidden">
        {/* Top Header Card */}
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Daftar Rekap</h2>
            <p className="text-xs text-slate-400 mt-1">
              Ringkasan tindak lanjut, pemohon, kategori, deskripsi, durasi, form, dan status.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input with Instant Filtering */}
            <div className="relative min-w-[280px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari No. Tindak Lanjut / Pemohon"
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>

            {/* Filter Toggle Button & Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                title="Filter Data Rekap"
                className={`p-2.5 rounded-xl border transition flex items-center justify-center relative ${
                  statusFilter !== "all" || kategoriFilter !== "all"
                    ? "border-blue-400 bg-blue-50 text-blue-600"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Filter className="w-4 h-4" />
                {(statusFilter !== "all" || kategoriFilter !== "all") && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600"></span>
                )}
              </button>

              {isFilterOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 z-40 animate-in fade-in zoom-in-95 duration-150 space-y-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-800">Filter Rekap</span>
                    <button
                      type="button"
                      onClick={() => setIsFilterOpen(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Filter Status */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Status Laporan
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { label: "Semua", val: "all" },
                        { label: "Selesai", val: "Selesai" },
                        { label: "Warning", val: "Warning" },
                        { label: "Belum selesai", val: "Proses" },
                      ].map((s) => (
                        <button
                          key={s.val}
                          type="button"
                          onClick={() => setStatusFilter(s.val)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition text-left truncate ${
                            statusFilter === s.val
                              ? "bg-blue-600 text-white shadow-xs"
                              : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reset Filter Button */}
                  {(statusFilter !== "all" || kategoriFilter !== "all") && (
                    <button
                      type="button"
                      onClick={() => {
                        setStatusFilter("all");
                        setKategoriFilter("all");
                        setIsFilterOpen(false);
                      }}
                      className="w-full py-1.5 text-center text-xs text-red-500 hover:bg-red-50 rounded-lg font-medium transition"
                    >
                      Reset Filter
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Export Button */}
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Ekspor</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/50">
                <th className="py-4 px-6 w-12 text-center">No</th>
                <th className="py-4 px-6">No. Tindak Lanjut</th>
                <th className="py-4 px-6">Pemohon</th>
                <th className="py-4 px-6">Kategori</th>
                <th className="py-4 px-6">Deskripsi</th>
                <th className="py-4 px-6 text-center">Durasi Repair<br /><span className="text-[10px] lowercase font-normal">(hari)</span></th>
                <th className="py-4 px-6 text-center">Durasi Laporan<br /><span className="text-[10px] lowercase font-normal">(hari)</span></th>
                <th className="py-4 px-6 text-center">Form</th>
                <th className="py-4 px-6 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Memuat data rekap...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Tidak ada data rekap yang sesuai
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-4 px-6 text-center text-slate-400 font-medium">{index + 1}</td>
                    <td className="py-4 px-6 font-mono font-medium text-slate-700">
                      {item.nomor_tindak_lanjut}
                    </td>
                    <td className="py-4 px-6 font-semibold text-slate-800">{item.pemohon}</td>
                    <td className="py-4 px-6 text-slate-600">{item.kategori}</td>
                    <td className="py-4 px-6 text-slate-600 max-w-xs truncate" title={item.deskripsi}>
                      {item.deskripsi}
                    </td>
                    <td className="py-4 px-6 text-center font-medium text-slate-800">
                      {item.durasi_repair}
                    </td>
                    <td className="py-4 px-6 text-center font-medium text-slate-800">
                      {item.durasi_laporan}
                    </td>
                    <td className="py-4 px-6 text-center whitespace-nowrap">
                      <button
                        onClick={() => {
                          setSelectedItem(item);
                          setIsModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold text-xs whitespace-nowrap transition"
                      >
                        <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="whitespace-nowrap">Lihat Form</span>
                      </button>
                    </td>
                    <td className="py-4 px-6 text-center whitespace-nowrap">{getStatusBadge(item.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detail Form */}
      <LihatFormModal
        isOpen={isModalOpen}
        item={selectedItem}
        onClose={() => setIsModalOpen(false)}
        onVerified={fetchRekap}
      />
    </AdminLayout>
  );
}

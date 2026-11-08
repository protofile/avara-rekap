"use client";

import React, { useState } from "react";
import { X, CheckCircle2, MapPin, Tag, User, Layers, Calendar, ExternalLink, Image as ImageIcon } from "lucide-react";

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

interface VerifikasiModalProps {
  isOpen: boolean;
  item: LaporanItem | null;
  onClose: () => void;
  onConfirmSelesai: (item: LaporanItem) => Promise<void>;
  isSubmitting?: boolean;
}

export default function VerifikasiModal({
  isOpen,
  item,
  onClose,
  onConfirmSelesai,
  isSubmitting = false,
}: VerifikasiModalProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#0084FF] font-bold text-sm flex items-center justify-center shadow-sm">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Verifikasi Laporan Teknisi</h3>
              <p className="text-xs text-slate-500 font-mono">
                No. Tindak Lanjut: <span className="font-semibold text-slate-700">{item.nomor_tindak_lanjut}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Ringkasan Informasi Laporan */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                <User className="w-3.5 h-3.5 text-blue-500" />
                <span>Pelaksana</span>
              </div>
              <p className="font-bold text-slate-800 text-xs truncate">{item.pemohon}</p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                <Tag className="w-3.5 h-3.5 text-blue-500" />
                <span>Kategori</span>
              </div>
              <p className="font-bold text-slate-800 text-xs truncate">{item.kategori}</p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                <MapPin className="w-3.5 h-3.5 text-blue-500" />
                <span>Region</span>
              </div>
              <p className="font-bold text-slate-800 text-xs truncate">{item.region}</p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-1">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                <span>Tanggal</span>
              </div>
              <p className="font-bold text-slate-800 text-xs truncate">
                {new Date(item.created_at).toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* Segmentasi & Deskripsi */}
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <Layers className="w-3.5 h-3.5 text-blue-500" />
                  <span>Segmen BB / Feeder / Access</span>
                </div>
                <a
                  href={
                    item.lokasi && item.lokasi.startsWith("http")
                      ? item.lokasi
                      : item.lokasi
                      ? `https://www.google.com/maps?q=${encodeURIComponent(item.lokasi)}`
                      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${item.segmentasi}, ${item.region}`)}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0084FF] hover:underline"
                >
                  <MapPin className="w-3 h-3" />
                  <span>Buka di Google Maps</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800">
                {item.segmentasi}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Deskripsi Pekerjaan Teknisi
              </label>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                {item.deskripsi}
              </div>
            </div>
          </div>

          {/* Lampiran Foto-foto */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                  Lampiran Foto Pekerjaan ({item.attachments?.length || 0})
                </h4>
              </div>
              {item.attachments && item.attachments.length > 0 && (
                <span className="text-[11px] text-slate-400">Klik foto untuk melihat ukuran penuh</span>
              )}
            </div>

            {item.attachments && item.attachments.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {item.attachments.map((photo, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedPhoto(photo)}
                    className="group relative aspect-video rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer shadow-sm hover:shadow-md transition"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo}
                      alt={`Foto Dokumentasi ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition gap-1">
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Perbesar</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-2xl border-2 border-dashed border-slate-200 text-center bg-slate-50/50">
                <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-500">Tidak ada lampiran foto</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Teknisi tidak menyertakan foto lampiran saat mengirimkan laporan ini.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/70">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={() => onConfirmSelesai(item)}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold bg-[#0084FF] hover:bg-blue-600 text-white shadow-md shadow-blue-500/20 transition disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? "Menyimpan..." : "Selesai"}</span>
          </button>
        </div>
      </div>

      {/* Lightbox / Preview Foto Besar */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedPhoto}
              alt="Preview Besar"
              className="max-h-[85vh] max-w-full rounded-2xl shadow-2xl object-contain"
            />
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


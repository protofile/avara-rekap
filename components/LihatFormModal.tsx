"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Calendar, MapPin, Tag, User, Layers, Clock, CheckCircle2, AlertTriangle, ExternalLink, Printer, FileDown } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

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

interface LihatFormModalProps {
  isOpen: boolean;
  item: LaporanItem | null;
  onClose: () => void;
  onVerified?: () => void;
  isAdmin?: boolean;
}

export default function LihatFormModal({
  isOpen,
  item,
  onClose,
  onVerified,
  isAdmin = true,
}: LihatFormModalProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [appLogoUrl, setAppLogoUrl] = useState<string>("");
  const pdfTemplateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch logo from settings when modal is opened
  useEffect(() => {
    if (isOpen) {
      fetch("/api/settings")
        .then((res) => res.json())
        .then((data) => {
          if (data && data.logo_url) {
            setAppLogoUrl(data.logo_url);
          }
        })
        .catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen || !item) return null;

  // Cetak Form: Memanggil native window.print() yang langsung mencetak #print-section formal
  const handlePrintForm = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    if (!pdfTemplateRef.current || !item) return;
    setIsGeneratingPDF(true);

    try {
      const element = pdfTemplateRef.current;

      // Pastikan semua gambar telah selesai dimuat dan terkonversi ke data URL
      const images = element.querySelectorAll("img");
      const loadPromises = Array.from(images).map(async (img) => {
        const src = img.getAttribute("src");
        if (src && src.startsWith("http")) {
          try {
            const resp = await fetch(src, { mode: "cors" });
            const blob = await resp.blob();
            await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                if (typeof reader.result === "string") {
                  img.src = reader.result;
                }
                resolve(true);
              };
              reader.onerror = resolve;
              reader.readAsDataURL(blob);
            });
          } catch (e) {
            console.warn("Could not convert image to base64:", e);
          }
        }
        if (img.complete) return true;
        return new Promise((resolve) => {
          img.onload = () => resolve(true);
          img.onerror = () => resolve(false);
        });
      });
      await Promise.all(loadPromises);

      const canvas = await html2canvas(element, {
        scale: 2, // 2x high resolution for crisp print
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: 794,
        onclone: (clonedDoc) => {
          const printEl = clonedDoc.getElementById("print-section");
          if (printEl) {
            printEl.style.setProperty("position", "static", "important");
            printEl.style.setProperty("left", "0", "important");
            printEl.style.setProperty("top", "0", "important");
            printEl.style.setProperty("display", "block", "important");
            printEl.style.setProperty("visibility", "visible", "important");
            printEl.style.setProperty("width", "794px", "important");
            printEl.style.setProperty("margin", "0", "important");
          }
        },
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight <= pageHeight) {
        pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      } else {
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
          position = position - pageHeight;
          pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }
      }

      pdf.save(`Laporan_Avara_${item.nomor_tindak_lanjut}.pdf`);
    } catch (err) {
      console.error("Gagal export PDF:", err);
      alert("Gagal mengunduh file PDF. Silakan coba kembali.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const newVerified = item.is_verified ? 0 : 1;
      const newStatus = newVerified === 1 ? "Selesai" : "Proses Lapangan";
      const res = await fetch("/api/laporan", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          is_verified: newVerified,
          status: newStatus,
        }),
      });
      if (res.ok) {
        if (onVerified) onVerified();
        onClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setVerifying(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Selesai":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Selesai
          </span>
        );
      case "Warning":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            Warning (50% Repair)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Proses Lapangan
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
              #{item.nomor_tindak_lanjut.slice(-3)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800 text-base">Detail Laporan Teknisi</h3>
                {getStatusBadge(item.status)}
              </div>
              <p className="text-xs text-slate-400 font-mono">No. Tindak Lanjut: {item.nomor_tindak_lanjut}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Key Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                <User className="w-3.5 h-3.5 text-blue-500" />
                <span>Pemohon / Teknisi</span>
              </div>
              <p className="font-semibold text-slate-800 text-sm">{item.pemohon}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                <Tag className="w-3.5 h-3.5 text-blue-500" />
                <span>Kategori</span>
              </div>
              <p className="font-semibold text-slate-800 text-sm">{item.kategori}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                <MapPin className="w-3.5 h-3.5 text-blue-500" />
                <span>Region</span>
              </div>
              <p className="font-semibold text-slate-800 text-sm">{item.region}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                <span>Tanggal Lapor</span>
              </div>
              <p className="font-semibold text-slate-800 text-sm">
                {new Date(item.created_at).toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                <span>Durasi Repair</span>
              </div>
              <p className="font-semibold text-slate-800 text-sm">{item.durasi_repair} Hari</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                <span>Durasi Laporan</span>
              </div>
              <p className="font-semibold text-slate-800 text-sm">{item.durasi_laporan} Hari</p>
            </div>
          </div>

          {/* Segmentasi & Lokasi Peta */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
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
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-800">
              {item.segmentasi}
            </div>
          </div>

          {/* Deskripsi */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Deskripsi Pekerjaan
            </label>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
              {item.deskripsi}
            </div>
          </div>

          {/* Lampiran Foto */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Lampiran Foto Lapangan ({item.attachments?.length || 0})
            </label>
            {item.attachments && item.attachments.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {item.attachments.map((photo, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedPhoto(photo)}
                    className="group relative aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer hover:shadow-md transition"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo}
                      alt={`Lampiran ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-medium transition">
                      <ExternalLink className="w-4 h-4 mr-1" /> Perbesar
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                Tidak ada lampiran foto untuk laporan ini
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-xl transition"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handlePrintForm}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Cetak Form</span>
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              disabled={isGeneratingPDF}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-xs transition disabled:opacity-50"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>{isGeneratingPDF ? "Mengunduh PDF..." : "Download PDF"}</span>
            </button>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={handleVerify}
              disabled={verifying}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-medium shadow-sm transition disabled:opacity-50 ${
                item.is_verified
                  ? "bg-amber-500 hover:bg-amber-600 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {verifying
                  ? "Memproses..."
                  : item.is_verified
                  ? "Batalkan Verifikasi"
                  : "Verifikasi & Selesai"}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Lightbox Photo Preview */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedPhoto}
              alt="Preview"
              className="max-h-[85vh] max-w-full rounded-xl shadow-2xl object-contain"
            />
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Formal Printable Document teleported directly to document.body via Portal */}
      {mounted &&
        createPortal(
          <div
            id="print-section"
            ref={pdfTemplateRef}
            style={{
              width: "794px",
              minHeight: "1123px",
              backgroundColor: "#ffffff",
              boxSizing: "border-box",
            }}
            className="p-12 text-slate-800 font-sans bg-white"
          >
            {/* Formal Header: Title & Logo */}
            <div className="flex items-start justify-between pb-4 border-b-2 border-slate-800 mb-6">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase">
                  Laporan Pekerjaan Teknisi
                </h1>
                <p className="text-[13.5px] font-medium text-slate-600 mt-1">
                  No. Tindak Lanjut:{" "}
                  <span className="font-semibold text-slate-900">{item.nomor_tindak_lanjut}</span>
                </p>
              </div>

              {/* Logo di kanan atas pdf: Logo yang sama dari settings jika ada */}
              <div className="flex items-center justify-end">
                {appLogoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={appLogoUrl}
                    alt="Logo Perusahaan"
                    className="max-h-12 max-w-[180px] object-contain"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <svg className="w-10 h-10" viewBox="0 0 40 40" fill="none">
                      <circle
                        cx="20"
                        cy="19"
                        r="13"
                        stroke="#1D68BD"
                        strokeWidth="4"
                        strokeDasharray="68 20"
                        strokeDashoffset="12"
                        strokeLinecap="round"
                        fill="none"
                      />
                      <polygon points="20,13 13,26 27,26" fill="#F05A28" />
                    </svg>
                    <div className="flex flex-col">
                      <span className="text-2xl font-extrabold tracking-tight text-slate-900 lowercase leading-none font-sans">
                        avara
                      </span>
                      <span className="text-[10px] italic text-slate-500 font-sans tracking-wide mt-0.5">
                        your trusted partner!
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              {/* Grup Data: Hapus border, background light grey (#f1f5f9), rounded-none, Nama Pemohon */}
              <div className="bg-[#f1f5f9] p-5 space-y-2.5 rounded-none">
                <div className="grid grid-cols-[180px_1fr] text-[13.5px] leading-relaxed">
                  <span className="font-semibold text-slate-700">Nama Pemohon</span>
                  <span className="text-slate-900 font-medium">: {item.pemohon}</span>
                </div>
                <div className="grid grid-cols-[180px_1fr] text-[13.5px] leading-relaxed">
                  <span className="font-semibold text-slate-700">Tanggal Pengajuan</span>
                  <span className="text-slate-900 font-medium">
                    :{" "}
                    {new Date(item.created_at).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="grid grid-cols-[180px_1fr] text-[13.5px] leading-relaxed">
                  <span className="font-semibold text-slate-700">Region</span>
                  <span className="text-slate-900 font-medium">: {item.region}</span>
                </div>
                <div className="grid grid-cols-[180px_1fr] text-[13.5px] leading-relaxed">
                  <span className="font-semibold text-slate-700">Segmen</span>
                  <span className="text-slate-900 font-medium">: {item.segmentasi}</span>
                </div>
                <div className="grid grid-cols-[180px_1fr] text-[13.5px] leading-relaxed">
                  <span className="font-semibold text-slate-700">Durasi Repair</span>
                  <span className="text-slate-900 font-medium">: {item.durasi_repair} Hari</span>
                </div>
              </div>

              {/* Foto Section: 3 kolom, hapus semua border & corner radius */}
              <div className="space-y-2.5">
                <h3 className="text-[13.5px] font-bold text-slate-900 uppercase tracking-wide">
                  Foto Dokumentasi Lapangan
                </h3>
                {item.attachments && item.attachments.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3.5">
                    {item.attachments.map((photo, idx) => (
                      <div
                        key={idx}
                        className="aspect-[4/3] overflow-hidden bg-[#f1f5f9] rounded-none flex items-center justify-center"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo}
                          alt={`Dokumentasi ${idx + 1}`}
                          className="w-full h-full object-cover"
                          crossOrigin="anonymous"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-28 bg-[#f1f5f9] flex items-center justify-center text-xs text-slate-500 rounded-none">
                    Tidak ada lampiran foto dokumentasi
                  </div>
                )}
              </div>

              {/* Deskripsi Section: Hapus border & corner radius, background light grey */}
              <div className="space-y-2">
                <h3 className="text-[13.5px] font-bold text-slate-900 uppercase tracking-wide">
                  Deskripsi Pekerjaan
                </h3>
                <div className="bg-[#f1f5f9] p-4 text-[13.5px] text-slate-800 leading-relaxed whitespace-pre-wrap rounded-none min-h-[90px]">
                  {item.deskripsi}
                </div>
              </div>
            </div>

            {/* Formal Footer */}
            <div className="pt-4 mt-8 border-t border-slate-300 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">PT AVARA TELEKOMUNIKASI</span>
                <span>&bull;</span>
                <span>Status Laporan: {item.status}</span>
              </div>
              <div className="text-[11px] text-slate-500">
                Dicetak:{" "}
                {new Date().toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

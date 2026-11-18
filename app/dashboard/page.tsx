"use client";

import React, { useEffect, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

interface DashboardData {
  tindakLanjut: {
    total: number;
    proses: number;
    selesai: number;
  };
  nonProject: {
    total: number;
    proses: number;
    selesai: number;
  };
  overall: {
    total: number;
    proses: number;
    selesai: number;
  };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = () => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then((resData) => {
        setData(resData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const selesaiCount = data?.overall?.selesai ?? 0;
  // Share of all reports that are finished; "-" while there are no reports yet.
  const overallTotal = data?.overall?.total ?? 0;
  const slaPct = overallTotal > 0 ? `${((selesaiCount / overallTotal) * 100).toFixed(1)}%` : "-";

  // Two groups (Tindak Lanjut, Non Project), each: total vs selesai. One shared scale so groups compare.
  const groups = [
    { label: "Tindak Lanjut", total: data?.tindakLanjut?.total ?? 0, selesai: data?.tindakLanjut?.selesai ?? 0 },
    { label: "Non Project", total: data?.nonProject?.total ?? 0, selesai: data?.nonProject?.selesai ?? 0 },
  ];
  const maxVal = Math.max(1, ...groups.flatMap((g) => [g.total, g.selesai]));
  // Bar height as % of the plot area; a zero count still shows a thin stub.
  const barPct = (n: number) => (n > 0 ? Math.max(4, Math.round((n / maxVal) * 100)) : 1);

  return (
    <AdminLayout pageTitle="Dashboard Monitoring" breadcrumb="">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: 2 Stat Cards (col-4) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card 1: Tindak Lanjut */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-md transition">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <span className="text-sm font-semibold text-slate-700">Tindak Lanjut</span>
              <span className="px-3.5 py-1 rounded-full text-lg font-extrabold bg-[#EBF5FF] text-[#0084FF] min-w-[42px] text-center">
                {loading ? "..." : (data?.tindakLanjut.total ?? 0)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-4">
              <span className="text-sm font-semibold text-slate-700">Selesai</span>
              <span className="px-3.5 py-1 rounded-full text-lg font-extrabold bg-[#ECFDF5] text-[#10B981] min-w-[42px] text-center">
                {loading ? "..." : (data?.tindakLanjut.selesai ?? 0)}
              </span>
            </div>
          </div>

          {/* Card 2: Non Project */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-md transition">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <span className="text-sm font-semibold text-slate-700">Non Project</span>
              <span className="px-3.5 py-1 rounded-full text-lg font-extrabold bg-[#EBF5FF] text-[#0084FF] min-w-[42px] text-center">
                {loading ? "..." : (data?.nonProject.total ?? 0)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-4">
              <span className="text-sm font-semibold text-slate-700">Selesai</span>
              <span className="px-3.5 py-1 rounded-full text-lg font-extrabold bg-[#ECFDF5] text-[#10B981] min-w-[42px] text-center">
                {loading ? "..." : (data?.nonProject.selesai ?? 0)}
              </span>
            </div>
          </div>

          {/* Quick Access Card */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-md">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium uppercase tracking-wider text-blue-100">Akses Cepat Verifikasi</span>
              <ArrowUpRight className="w-4 h-4 text-blue-200" />
            </div>
            <h4 className="font-bold text-lg mb-1">Periksa Laporan Masuk</h4>
            <p className="text-xs text-blue-100 mb-4 leading-relaxed">
              Terdapat laporan teknisi yang membutuhkan verifikasi agar statusnya tercatat Selesai.
            </p>
            <Link
              href="/laporan"
              className="inline-flex items-center justify-center px-4 py-2 bg-white text-blue-700 rounded-xl text-xs font-bold shadow-sm hover:bg-blue-50 transition"
            >
              Buka Halaman Laporan
            </Link>
          </div>
        </div>

        {/* Right Side: Chart Laporan (col-8) */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]">
            {/* Header Chart */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Chart Laporan</h3>
                <p className="text-xs text-slate-400 mt-0.5">Total laporan dan yang sudah selesai, per kategori</p>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-5 text-xs font-medium text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0084FF]"></span>
                  <span>Total</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00A86B]"></span>
                  <span>Selesai</span>
                </div>
              </div>
            </div>

            {/* Grouped Bar Chart: per group a Total bar and a Selesai bar side by side */}
            <div className="relative h-96 w-full rounded-2xl bg-slate-50/60 border border-slate-100/60 px-6 pt-8 pb-4">
              <div className="h-full grid grid-cols-2 gap-8 sm:gap-16">
                {groups.map((g) => (
                  <div key={g.label} className="h-full flex flex-col">
                    {/* Plot area */}
                    <div className="relative flex-1 min-h-0 flex items-end justify-center border-b border-slate-200">
                      {[
                        { value: g.total, color: "bg-[#0084FF]", text: "text-[#0084FF]", title: `${g.label}: ${g.total} laporan` },
                        { value: g.selesai, color: "bg-[#00A86B]", text: "text-[#00A86B]", title: `${g.label} selesai: ${g.selesai} laporan` },
                      ].map((bar, i) => (
                        <div key={i} className="h-full w-16 sm:w-24 flex items-end" title={bar.title}>
                          <div
                            style={{ height: `${loading ? 1 : barPct(bar.value)}%` }}
                            className={`relative w-full ${bar.color} rounded-t-lg transition-all duration-700 ease-out`}
                          >
                            {/* Value above the bar (absolute, so it doesn't change the bar's scale) */}
                            <span className={`absolute -top-6 inset-x-0 text-center text-sm font-bold ${bar.text}`}>
                              {loading ? "" : bar.value}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Labels under each bar */}
                    <div className="flex justify-center pt-3 text-xs sm:text-sm font-semibold text-slate-700 text-center leading-tight">
                      <span className="w-16 sm:w-24">{g.label}</span>
                      <span className="w-16 sm:w-24">Selesai</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Chart Stats Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100 text-center">
              <div>
                <p className="text-[11px] text-slate-400 font-medium">Total Rekap</p>
                <p className="text-base font-bold text-slate-800 mt-0.5">
                  {(data?.tindakLanjut.total || 0) + (data?.nonProject.total || 0)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-medium">Dalam Proses</p>
                <p className="text-base font-bold text-amber-600 mt-0.5">
                  {(data?.tindakLanjut.proses || 0) + (data?.nonProject.proses || 0)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-medium">Total Selesai</p>
                <p className="text-base font-bold text-emerald-600 mt-0.5">{selesaiCount}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-medium">SLA Resolution</p>
                <p className="text-base font-bold text-blue-600 mt-0.5">{slaPct}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

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

  // Calculate percentages for the chart bars
  const tindakLanjutCount = data?.tindakLanjut?.total || 23;
  const selesaiCount = data?.overall?.selesai || 102;
  const maxVal = Math.max(tindakLanjutCount, selesaiCount, 120);

  const tindakLanjutHeightPct = Math.round((tindakLanjutCount / maxVal) * 80) + 10;
  const selesaiHeightPct = Math.round((selesaiCount / maxVal) * 80) + 15;

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
                {loading ? "..." : data?.tindakLanjut.total || 23}
              </span>
            </div>
            <div className="flex items-center justify-between pt-4">
              <span className="text-sm font-semibold text-slate-700">Selesai</span>
              <span className="px-3.5 py-1 rounded-full text-lg font-extrabold bg-[#ECFDF5] text-[#10B981] min-w-[42px] text-center">
                {loading ? "..." : data?.tindakLanjut.selesai || 102}
              </span>
            </div>
          </div>

          {/* Card 2: Non Project */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-md transition">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <span className="text-sm font-semibold text-slate-700">Non Project</span>
              <span className="px-3.5 py-1 rounded-full text-lg font-extrabold bg-[#EBF5FF] text-[#0084FF] min-w-[42px] text-center">
                {loading ? "..." : data?.nonProject.total || 23}
              </span>
            </div>
            <div className="flex items-center justify-between pt-4">
              <span className="text-sm font-semibold text-slate-700">Selesai</span>
              <span className="px-3.5 py-1 rounded-full text-lg font-extrabold bg-[#ECFDF5] text-[#10B981] min-w-[42px] text-center">
                {loading ? "..." : data?.nonProject.selesai || 102}
              </span>
            </div>
          </div>

          {/* Quick Access Card */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-md">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium uppercase tracking-wider text-blue-100">
                Akses Cepat Verifikasi
              </span>
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
                <p className="text-xs text-slate-400 mt-0.5">Perbandingan Tindak Lanjut dan Selesai</p>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-5 text-xs font-medium text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0084FF]"></span>
                  <span>Tindak Lanjut</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00A86B]"></span>
                  <span>Selesai</span>
                </div>
              </div>
            </div>

            {/* Vertical Bar Chart Container */}
            <div className="h-96 w-full rounded-2xl bg-slate-50/60 p-6 flex flex-col justify-end relative overflow-hidden border border-slate-100/60">
              {/* Background Grid Lines */}
              <div className="absolute inset-0 flex flex-col justify-between p-6 pointer-events-none opacity-40">
                <div className="border-b border-dashed border-slate-200 w-full"></div>
                <div className="border-b border-dashed border-slate-200 w-full"></div>
                <div className="border-b border-dashed border-slate-200 w-full"></div>
                <div className="border-b border-dashed border-slate-200 w-full"></div>
              </div>

              {/* Bars Row */}
              <div className="relative z-10 h-72 flex items-end justify-center gap-16 sm:gap-24 px-8 pb-4">
                {/* Bar 1: Tindak Lanjut */}
                <div className="flex flex-col items-center group">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs font-bold text-[#0084FF] mb-2 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                    {tindakLanjutCount} laporan
                  </div>
                  <div
                    style={{ height: `${tindakLanjutHeightPct}%` }}
                    className="w-12 sm:w-16 bg-[#0084FF] rounded-2xl shadow-sm transition-all duration-700 ease-out hover:opacity-90 cursor-pointer"
                  ></div>
                  <div className="mt-4 text-xs font-semibold text-slate-700 whitespace-nowrap">
                    Tindak Lanjut · {tindakLanjutCount}
                  </div>
                </div>

                {/* Bar 2: Selesai */}
                <div className="flex flex-col items-center group">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-xs font-bold text-[#00A86B] mb-2 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    {selesaiCount} selesai
                  </div>
                  <div
                    style={{ height: `${selesaiHeightPct}%` }}
                    className="w-12 sm:w-16 bg-[#00A86B] rounded-2xl shadow-sm transition-all duration-700 ease-out hover:opacity-90 cursor-pointer"
                  ></div>
                  <div className="mt-4 text-xs font-semibold text-slate-700 whitespace-nowrap">
                    Selesai · {selesaiCount}
                  </div>
                </div>
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
                <p className="text-base font-bold text-emerald-600 mt-0.5">
                  {selesaiCount}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-medium">SLA Resolution</p>
                <p className="text-base font-bold text-blue-600 mt-0.5">94.8%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

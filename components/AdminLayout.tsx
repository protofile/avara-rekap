"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutGrid,
  ClipboardList,
  FileText,
  Users,
  Tag,
  MapPin,
  Network,
  Settings as SettingsIcon,
  LogOut,
  ChevronDown,
  Building2,
} from "lucide-react";
import SettingsModal from "./SettingsModal";

interface AdminLayoutProps {
  children: React.ReactNode;
  pageTitle: string;
  breadcrumb?: string;
}

export default function AdminLayout({
  children,
  pageTitle,
  breadcrumb = "Dashboard",
}: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [collapsed, setCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ name: string; username: string; role: string } | null>(null);
  const [settingsData, setSettingsData] = useState<{ app_name: string; logo_url: string } | null>(null);

  // Load user session
  const loadUser = () => {
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
          if (data.user.role !== "admin") {
            router.push("/pemohon");
          } else {
            setCurrentUser(data.user);
          }
        }
      })
      .catch(() => router.push("/login"));
  };

  // Load app settings
  const loadSettings = () => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          setSettingsData(data);
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    loadUser();
    loadSettings();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch {
      router.push("/login");
    }
  };

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutGrid },
    { name: "Rekap", href: "/rekap", icon: ClipboardList },
    { name: "Laporan", href: "/laporan", icon: FileText },
    { name: "Akun Pemohon", href: "/akun-pemohon", icon: Users },
    { name: "Kategori", href: "/kategori", icon: Tag },
    { name: "Region", href: "/region", icon: MapPin },
    { name: "Divisi", href: "/divisi", icon: Network },
  ];

  const userInitial = currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : "D";
  const userName = currentUser?.name || "Dedy";

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-30 bg-white border-r border-slate-100 flex flex-col transition-all duration-300 ease-in-out ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Toggle Button: 10x60 px with vertical ellipsis, outer right of sidebar, vertically centered */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Perluas Sidebar" : "Perkecil Sidebar"}
          aria-label={collapsed ? "Perluas Sidebar" : "Perkecil Sidebar"}
          className="absolute -right-[10px] top-1/2 -translate-y-1/2 w-[10px] h-[60px] cursor-pointer group z-40 focus:outline-none flex items-center justify-center select-none"
        >
          {/* Expanded click target for smooth interaction */}
          <span className="absolute -inset-x-2.5 -inset-y-2 cursor-pointer" />

          {/* SVG Shape matching exact design curve */}
          <svg
            className="w-[10px] h-[60px] overflow-visible drop-shadow-[1px_0_2px_rgba(0,0,0,0.04)]"
            viewBox="0 0 10 60"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* White tab background */}
            <path
              d="M0 0 C 1.5 6, 10 12, 10 22 L 10 38 C 10 48, 1.5 54, 0 60 Z"
              fill="#FFFFFF"
            />
            {/* Outer curved border stroke */}
            <path
              d="M0 0 C 1.5 6, 10 12, 10 22 L 10 38 C 10 48, 1.5 54, 0 60"
              stroke="#E2E8F0"
              strokeWidth="1"
              fill="none"
            />
            {/* Vertical Ellipsis (3 dots) */}
            <circle
              cx="5"
              cy="25"
              r="1.25"
              className="fill-slate-400 group-hover:fill-blue-600 transition-colors"
            />
            <circle
              cx="5"
              cy="30"
              r="1.25"
              className="fill-slate-400 group-hover:fill-blue-600 transition-colors"
            />
            <circle
              cx="5"
              cy="35"
              r="1.25"
              className="fill-slate-400 group-hover:fill-blue-600 transition-colors"
            />
          </svg>
        </button>

        {/* Sidebar Brand Header */}
        <div
          className={`h-20 flex items-center border-b border-slate-50 transition-all ${
            collapsed ? "justify-center px-0" : "justify-start px-5"
          }`}
        >
          <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-[#0084FF] text-white font-black flex items-center justify-center text-xl shadow-sm flex-shrink-0">
              {settingsData?.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={settingsData.logo_url}
                  alt="Avara Logo"
                  className="w-full h-full object-contain rounded-xl p-1"
                />
              ) : (
                "A"
              )}
            </div>
            {!collapsed && (
              <span className="font-extrabold text-xl tracking-wider text-slate-900 truncate">
                {settingsData?.app_name || "AVARA"}
              </span>
            )}
          </Link>
        </div>

        {/* Sidebar Menu Items */}
        <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-medium transition-all group ${
                  isActive
                    ? "bg-[#EBF5FF] text-[#0084FF] font-semibold"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                } ${collapsed ? "justify-center px-0" : ""}`}
                title={collapsed ? item.name : undefined}
              >
                <Icon
                  className={`w-5 h-5 flex-shrink-0 transition-colors ${
                    isActive ? "text-[#0084FF]" : "text-slate-400 group-hover:text-slate-600"
                  }`}
                />
                {!collapsed && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer info */}
        {!collapsed && (
          <div className="p-4 border-t border-slate-50">
            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Avara Portal v1.0</p>
              <p className="text-xs text-slate-600 mt-0.5 truncate">Monitoring Rekap & Laporan</p>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${
          collapsed ? "ml-20" : "ml-64"
        }`}
      >
        {/* Top Header (Sticky / Fixed when scrolled) */}
        <header className="sticky top-0 h-20 bg-[#F8FAFC]/95 backdrop-blur-md flex items-center justify-between px-8 z-20 border-b border-slate-100/80 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.03)] transition-all">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{pageTitle}</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Dashboard {breadcrumb ? `> ${breadcrumb}` : ""}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* User Info Badge */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white border border-slate-200/80 shadow-sm hover:border-slate-300 transition"
              >
                <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center">
                  {userInitial}
                </div>
                <span className="text-sm font-semibold text-slate-800">{userName}</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-800">{userName}</p>
                    <p className="text-[11px] text-slate-400">Administrator</p>
                  </div>
                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      setSettingsOpen(true);
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <SettingsIcon className="w-4 h-4 text-slate-400" />
                    <span>Pengaturan</span>
                  </button>
                  <Link
                    href="/pemohon"
                    className="w-full text-left px-4 py-2 text-xs text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <span>Tampilan Pemohon (Mobile)</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-slate-50 mt-1"
                  >
                    <LogOut className="w-4 h-4 text-red-500" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>

            {/* Settings Button */}
            <button
              onClick={() => setSettingsOpen(true)}
              title="Pengaturan Portal"
              className="p-2 rounded-xl bg-white border border-slate-200/80 text-slate-600 hover:text-blue-600 hover:border-blue-200 shadow-sm transition"
            >
              <SettingsIcon className="w-5 h-5" />
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200/80 text-slate-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 shadow-sm transition text-sm font-medium"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 px-8 pt-6 pb-10">{children}</main>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSaved={loadSettings}
      />
    </div>
  );
}


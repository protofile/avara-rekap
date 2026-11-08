"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Lock, ArrowRight, Eye, EyeOff, Quote } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [welcomeText, setWelcomeText] = useState("Selamat Datang di Sistem Rekap & Laporan Teknisi Avara");
  const [quoteText, setQuoteText] = useState(
    "Kecepatan penanganan jaringan dan akurasi pelaporan adalah wujud dedikasi kami untuk kehandalan layanan."
  );
  const [quoteAuthor, setQuoteAuthor] = useState("Avara Management");
  const [logoUrl, setLogoUrl] = useState("");

  // Load portal settings & check if already logged in
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.authenticated && data.user) {
          if (data.user.role === "admin") {
            router.push("/dashboard");
          } else {
            router.push("/pemohon");
          }
        }
      })
      .catch(() => {});

    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          if (data.welcome_text) setWelcomeText(data.welcome_text);
          if (data.quote_text) setQuoteText(data.quote_text);
          if (data.quote_author) setQuoteAuthor(data.quote_author);
          if (data.logo_url) setLogoUrl(data.logo_url);
        }
      })
      .catch(console.error);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Gagal masuk, periksa kembali username dan password.");
        setLoading(false);
        return;
      }

      if (data.user.role === "admin") {
        router.push("/dashboard");
      } else {
        router.push("/pemohon");
      }
    } catch {
      setError("Terjadi gangguan server");
      setLoading(false);
    }
  };

  const handleQuickLogin = (userType: "admin" | "pemohon") => {
    if (userType === "admin") {
      setUsername("admin");
      setPassword("admin123");
    } else {
      setUsername("sodik");
      setPassword("sodik123");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center p-4">
      {/* Container */}
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.06)] border border-slate-100 overflow-hidden grid grid-cols-1 md:grid-cols-12">
        {/* Left Side: Welcome Banner & Quote (col-5) */}
        <div className="md:col-span-5 bg-gradient-to-br from-[#0084FF] to-blue-700 p-8 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Subtle decoration circles */}
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 blur-xl pointer-events-none"></div>
          <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-blue-900/20 blur-xl pointer-events-none"></div>

          <div>
            {/* Logo */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-white text-[#0084FF] font-black flex items-center justify-center text-2xl shadow-lg">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-contain rounded-2xl p-1" />
                ) : (
                  "A"
                )}
              </div>
              <div>
                <span className="font-extrabold text-2xl tracking-widest block leading-tight">AVARA</span>
                <span className="text-[11px] text-blue-100 font-medium tracking-wide">Monitoring System</span>
              </div>
            </div>

            {/* Welcome Text */}
            <h2 className="text-xl font-bold leading-snug mb-3">Selamat Datang</h2>
            <p className="text-xs text-blue-100/90 leading-relaxed font-normal">
              {welcomeText}
            </p>
          </div>

          {/* Quote Block */}
          <div className="mt-8 pt-6 border-t border-white/15">
            <div className="flex items-start gap-2.5">
              <Quote className="w-5 h-5 text-blue-200 flex-shrink-0 mt-0.5 opacity-80" />
              <div>
                <p className="text-xs italic text-blue-50 leading-relaxed font-serif">
                  &ldquo;{quoteText}&rdquo;
                </p>
                {quoteAuthor && (
                  <p className="text-[11px] font-semibold text-blue-200 mt-2 font-sans tracking-wide">
                    — {quoteAuthor}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form (col-7) */}
        <div className="md:col-span-7 p-8 sm:p-10 flex flex-col justify-center">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-slate-900">Masuk Akun</h3>
            <p className="text-xs text-slate-400 mt-1">
              Silakan masukkan kredensial Anda untuk mengakses dashboard
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Input Username */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  required
                />
              </div>
            </div>

            {/* Input Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-[#0084FF] hover:bg-blue-600 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50 mt-2"
            >
              {loading ? (
                <span>Memverifikasi...</span>
              ) : (
                <>
                  <span>Masuk ke Sistem</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Login Switcher */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5 text-center">
              Akses Cepat Demo Akun
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleQuickLogin("admin")}
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-blue-50 hover:border-blue-200 text-left transition group"
              >
                <div className="text-xs font-bold text-slate-800 group-hover:text-blue-600">
                  Admin (Dedy)
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">admin / admin123</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin("pemohon")}
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-blue-50 hover:border-blue-200 text-left transition group"
              >
                <div className="text-xs font-bold text-slate-800 group-hover:text-blue-600">
                  Pemohon (Sodik)
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">sodik / sodik123</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

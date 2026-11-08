import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AVARA - Sistem Rekap & Laporan Teknisi",
  description: "Web apps untuk mengatur rekap dan laporan dari teknisi Avara",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-[#F8FAFC] antialiased">
        {children}
      </body>
    </html>
  );
}

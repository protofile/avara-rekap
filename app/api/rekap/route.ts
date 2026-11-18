import { NextResponse } from "next/server";
import { requireAdmin, serverError } from "@/lib/auth";
import { listLaporan } from "@/lib/laporan";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const search = (new URL(request.url).searchParams.get("search") || "").trim();
    const where: string[] = [];
    const params: string[] = [];
    if (search) {
      where.push("(u.name LIKE ? OR l.nomor_tindak_lanjut LIKE ? OR l.deskripsi LIKE ?)");
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    return NextResponse.json(await listLaporan(where, params));
  } catch (error) {
    return serverError(error);
  }
}

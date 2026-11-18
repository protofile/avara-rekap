import { NextResponse } from "next/server";
import { requireUser, serverError } from "@/lib/auth";
import { parsePhotoName, readPhoto } from "@/lib/uploads";

export const dynamic = "force-dynamic";

/** Serve a report photo. Admins see all photos; a pemohon only their own. */
export async function GET(_request: Request, { params }: { params: { name: string } }) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;

    const info = parsePhotoName(params.name);
    if (!info || (user.role !== "admin" && info.ownerId !== user.id)) {
      return NextResponse.json({ error: "Foto tidak ditemukan" }, { status: 404 });
    }

    const data = await readPhoto(params.name);
    if (!data) {
      return NextResponse.json({ error: "Foto tidak ditemukan" }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": info.contentType,
        "Content-Length": String(data.length),
        // File names are random and never reused, so the browser may cache them for good.
        "Cache-Control": "private, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return serverError(error);
  }
}

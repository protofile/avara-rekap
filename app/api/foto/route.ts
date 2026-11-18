import { NextResponse } from "next/server";
import { requireUser, serverError } from "@/lib/auth";
import { savePhoto, UploadError } from "@/lib/uploads";

export const dynamic = "force-dynamic";

/** Upload one photo (multipart field "file"). Returns { url } to put in a laporan's attachments. */
export async function POST(request: Request) {
  try {
    const { user, error } = await requireUser();
    if (error) return error;

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "File foto diperlukan" }, { status: 400 });
    }

    const url = await savePhoto(user.id, Buffer.from(await file.arrayBuffer()));
    return NextResponse.json({ success: true, url });
  } catch (error) {
    if (error instanceof UploadError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return serverError(error);
  }
}

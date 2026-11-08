import { NextResponse } from "next/server";
import db from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = db.prepare("SELECT * FROM settings WHERE id = 1").get();
    return NextResponse.json(settings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { logo_url, welcome_text, quote_text, quote_author } = await request.json();

    db.prepare(`
      UPDATE settings 
      SET logo_url = COALESCE(?, logo_url),
          welcome_text = COALESCE(?, welcome_text),
          quote_text = COALESCE(?, quote_text),
          quote_author = COALESCE(?, quote_author)
      WHERE id = 1
    `).run(
      logo_url !== undefined ? logo_url : null,
      welcome_text !== undefined ? welcome_text : null,
      quote_text !== undefined ? quote_text : null,
      quote_author !== undefined ? quote_author : null
    );

    const updated = db.prepare("SELECT * FROM settings WHERE id = 1").get();
    return NextResponse.json({ success: true, settings: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { execute, queryOne } from "@/lib/db";
import { requireAdmin, serverError } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Public: the login page shows the logo, welcome text and quote.
export async function GET() {
  try {
    const settings = await queryOne("SELECT * FROM settings WHERE id = 1");
    return NextResponse.json(settings || {});
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const { logo_url, welcome_text, quote_text, quote_author } = await request.json();
    const v = (x: unknown) => (x !== undefined ? (x as string) : null);

    await execute(
      `UPDATE settings
       SET logo_url = COALESCE(?, logo_url),
           welcome_text = COALESCE(?, welcome_text),
           quote_text = COALESCE(?, quote_text),
           quote_author = COALESCE(?, quote_author)
       WHERE id = 1`,
      [v(logo_url), v(welcome_text), v(quote_text), v(quote_author)]
    );

    const updated = await queryOne("SELECT * FROM settings WHERE id = 1");
    return NextResponse.json({ success: true, settings: updated });
  } catch (error) {
    return serverError(error);
  }
}

import { createServerClientWithCookies } from "../../../supabase-server";
import { redirect } from "next/navigation";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as
    | "signup"
    | "magiclink"
    | "recovery"
    | "invite"
    | "email_change";
  const next = url.searchParams.get("next") || "/";

  if (!token_hash || !type) return redirect("/error");

  const supabase = createServerClientWithCookies();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash });

  if (error) return redirect("/error");

  return redirect(next);
}

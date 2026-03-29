import { AppError, handleRouteError, ok } from "@/lib/http";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new AppError(400, error.message);
    }

    return ok({ success: true });
  } catch (error) {
    return handleRouteError(error);
  }
}

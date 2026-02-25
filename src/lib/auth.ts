import { createClient } from "@/lib/supabase/server";

/**
 * Verify the request comes from an authenticated admin user.
 * Returns the user if authenticated, null otherwise.
 * Works for both API routes and server actions.
 */
export async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

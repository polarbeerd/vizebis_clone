import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { AdminLocaleProvider } from "@/components/layout/admin-locale-provider";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const userName =
    user.user_metadata?.full_name || user.email || "User";

  return (
    <AdminLocaleProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex min-h-0 flex-1 flex-col">
          <Header userName={userName} />
          <main className="min-h-0 flex-1 overflow-y-auto bg-muted/40 p-3 sm:p-6">
            {children}
          </main>
        </div>
      </div>
    </AdminLocaleProvider>
  );
}

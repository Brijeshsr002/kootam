import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { homeForRole } from "@/lib/auth/roles";

export async function SiteHeader() {
  const user = await getSessionUser();

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Koo<span className="text-brand">tam</span>
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/discover/coimbatore" className="hidden text-muted hover:text-foreground sm:inline">
            Discover
          </Link>
          {user ? (
            <>
              <Link href="/me" className="font-medium">
                My tickets
              </Link>
              {user.role !== "MEMBER" && (
                <Link href={homeForRole(user.role)} className="font-medium">
                  {user.role === "ADMIN" ? "Admin" : "Host"}
                </Link>
              )}
              <form action="/auth/signout" method="post">
                <button type="submit" className="text-muted hover:text-foreground">
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="font-medium">
                Log in
              </Link>
              <Link href="/signup" className="rounded-full bg-brand px-3 py-1.5 font-medium text-brand-foreground">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

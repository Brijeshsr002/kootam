import { ProfileForm } from "@/components/profile-form";
import { getSessionUser } from "@/lib/auth/session";
import { safeNextPath } from "@/lib/auth/roles";

export default async function ProfilePage({ searchParams }: PageProps<"/me/profile">) {
  const sp = await searchParams;
  const user = await getSessionUser();
  if (!user) return null;
  const next = typeof sp.next === "string" ? safeNextPath(sp.next, "") : "";

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Profile</h1>
      {sp.need === "name" && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Add your name first. The organiser sees it on the guest list. Then tap &ldquo;Count me in&rdquo; again.
        </p>
      )}
      <ProfileForm name={user.name ?? ""} next={next || undefined} />
      <p className="text-sm text-muted">
        Signed in as {user.email ?? user.phone}. To delete your account and data, email the Kootam team (see Privacy).
      </p>
    </div>
  );
}

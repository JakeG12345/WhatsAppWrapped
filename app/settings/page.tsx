import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import SettingsForm from "@/components/SettingsForm";

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/sign-in");
  return (
    <SettingsForm userName={session.user.name} userEmail={session.user.email} />
  );
}

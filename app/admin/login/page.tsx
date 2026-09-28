import { isAdminConfigured } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Log in" };

export default function LoginPage() {
  const configured = isAdminConfigured();
  return (
    <div className="mx-auto max-w-sm py-10">
      <h1 className="text-3xl font-bold">Owner login</h1>
      {!configured ? (
        <p className="bg-amber/15 mt-4 rounded-lg p-4">
          Admin login isn&apos;t set up yet. Add <code>ADMIN_EMAIL</code>, <code>ADMIN_PASSWORD_HASH</code> and <code>SESSION_SECRET</code>{" "}
          to the environment variables (see README).
        </p>
      ) : (
        <LoginForm />
      )}
    </div>
  );
}

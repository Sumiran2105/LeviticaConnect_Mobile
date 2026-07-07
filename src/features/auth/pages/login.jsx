import { Link, Navigate, useLocation, useSearchParams } from "react-router-dom";

import { LoginForm } from "@/features/auth/components/login-form";
import { useAuthStore } from "@/store/auth-store";

const workspaceUserRoles = ["USER", "CLIENT", "GUEST"];

function getSafeRedirectPath(value) {
  if (!value || typeof value !== "string") {
    return "";
  }

  try {
    const decoded = decodeURIComponent(value);
    return decoded.startsWith("/") && !decoded.startsWith("//") ? decoded : "";
  } catch {
    return value.startsWith("/") && !value.startsWith("//") ? value : "";
  }
}

export function LoginPage() {
  const session = useAuthStore((state) => state.session);
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const redirectPath = getSafeRedirectPath(searchParams.get("redirect"));
  const mode =
    location.pathname === "/login/super-admin" || searchParams.get("mode") === "super-admin"
      ? "super-admin"
      : "workspace";

  if (session?.accessToken) {
    if (redirectPath && session.role !== "SUPER_ADMIN") {
      return <Navigate to={redirectPath} replace />;
    }

    if (session.role === "SUPER_ADMIN") {
      return <Navigate to="/super-admin/dashboard" replace />;
    }

    if (workspaceUserRoles.includes(session.role)) {
      return <Navigate to="/user/dashboard" replace />;
    }

    return <Navigate to="/admin/dashboard" replace />;
  }

  return (
    <main className="relative flex min-h-dvh w-full items-start justify-center overflow-x-hidden overflow-y-auto bg-gradient-to-tr from-[#E0ECF8] via-[#F3F7FA] to-[#E8ECE9] px-3 py-6 sm:items-center sm:p-6 lg:p-8">
      {/* Glowing blur blobs in background */}
      <div className="pointer-events-none absolute left-[-35%] top-[-12%] size-64 rounded-full bg-[#82AEFF]/20 blur-[80px] sm:left-[-10%] sm:size-96 sm:blur-[100px]" />
      <div className="pointer-events-none absolute bottom-[-12%] right-[-35%] size-64 rounded-full bg-[#A3E3FF]/25 blur-[80px] sm:right-[-10%] sm:size-96 sm:blur-[100px]" />
      <div className="pointer-events-none absolute right-[-18%] top-[30%] size-56 rounded-full bg-[#D6C5FF]/15 blur-[70px] sm:right-[10%] sm:size-80 sm:blur-[80px]" />

      {/* Glassmorphic Card Container */}
      <div className="relative z-10 flex w-full max-w-[440px] flex-col items-stretch rounded-[1.5rem] border border-white/60 bg-white/45 p-5 shadow-[0_24px_60px_rgba(71,94,156,0.12)] backdrop-blur-xl sm:rounded-[2rem] sm:p-8 lg:p-10">
        {/* Logo (Bigger size, no white bg container, with Powered by Levitica Technologies chip close underneath) */}
        <div className="mb-5 flex flex-col items-center select-none sm:mb-6">
          <Link to="/" className="inline-flex h-32 items-center overflow-hidden transition-opacity hover:opacity-90 sm:h-44 lg:h-52">
            <img
              src="/assets/logo.png"
              alt="Conectio"
              className="h-44 w-auto object-contain sm:h-64 lg:h-72"
            />
          </Link>
          <div className="-mt-8 inline-flex max-w-full items-center rounded-full border border-slate-200 bg-white/70 px-3 py-0.5 text-center text-[9px] font-bold text-slate-500 shadow-sm backdrop-blur-sm sm:-mt-10 lg:-mt-12">
            Powered by Levitica Technologies
          </div>
        </div>

        <LoginForm audience={mode} redirectPath={redirectPath} />
      </div>
    </main>
  );
}

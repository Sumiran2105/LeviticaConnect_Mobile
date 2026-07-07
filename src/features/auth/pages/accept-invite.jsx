import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Eye,
  EyeOff,
  LoaderCircle,
  MailCheck,
} from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AUTH_ACCEPT_INVITE } from "@/config/api";
import { apiClient } from "@/lib/client";
import { useAuthStore } from "@/store/auth-store";

const defaultForm = {
  fullName: "",
  mobileNumber: "",
  password: "",
  confirmPassword: "",
};

const workspaceUserRoles = ["USER", "CLIENT", "GUEST"];

function isValidName(value) {
  return /^[a-zA-Z\s'-]+$/.test(value.trim());
}

function isValidPhone(value) {
  return /^\d{10}$/.test(value.trim());
}

function isValidPassword(value) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(value);
}

function PasswordRequirements({ password }) {
  const rules = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "One uppercase letter (A-Z)", met: /[A-Z]/.test(password) },
    { label: "One lowercase letter (a-z)", met: /[a-z]/.test(password) },
    { label: "One number (0-9)", met: /\d/.test(password) },
    { label: "One special character (@$!%*?&)", met: /[@$!%*?&]/.test(password) },
  ];

  return (
    <div className="mt-2 grid grid-cols-1 gap-1">
      {rules.map((rule) => (
        <div key={rule.label} className="flex items-center gap-1.5">
          {rule.met ? (
            <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />
          ) : (
            <Circle className="size-3.5 shrink-0 text-brand-secondary/40" />
          )}
          <span className={`text-[11px] leading-tight ${rule.met ? "font-medium text-emerald-600" : "text-brand-secondary/70"}`}>
            {rule.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function AcceptInvitePage() {
  const session = useAuthStore((state) => state.session);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";
  const [form, setForm] = useState(defaultForm);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

  const isFormValid =
    token &&
    isValidName(form.fullName) &&
    isValidPhone(form.mobileNumber) &&
    isValidPassword(form.password) &&
    form.password === form.confirmPassword;

  const acceptInviteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post(AUTH_ACCEPT_INVITE, null, {
        params: {
          token,
          full_name: form.fullName.trim(),
          mobile_number: form.mobileNumber.trim(),
          password: form.password,
        },
      });

      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || "Invite accepted successfully. You can sign in now.");
      setForm(defaultForm);
      window.setTimeout(() => {
        navigate("/login?mode=workspace", { replace: true });
      }, 900);
    },
    onError: (error) => {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        "Unable to accept this invite right now.";

      toast.error(message);
    },
  });

  if (session?.accessToken) {
    if (session.role === "SUPER_ADMIN") {
      return <Navigate to="/super-admin/dashboard" replace />;
    }

    return <Navigate to={workspaceUserRoles.includes(session.role) ? "/user/dashboard" : "/admin/dashboard"} replace />;
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!token) {
      toast.error("Invite token is missing from the link.");
      return;
    }

    if (!form.fullName.trim() || !form.mobileNumber.trim() || !form.password || !form.confirmPassword) {
      toast.error("Complete all invite activation fields.");
      return;
    }

    if (!isValidName(form.fullName)) {
      toast.error("Enter a valid full name.");
      return;
    }

    if (!isValidPhone(form.mobileNumber)) {
      toast.error("Enter a valid mobile number with exactly 10 digits.");
      return;
    }

    if (!isValidPassword(form.password)) {
      toast.error("Password must contain upper, lower, number, special character, and at least 8 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error("Password and confirm password must match.");
      return;
    }

    acceptInviteMutation.mutate();
  }

  const fieldClass =
    "h-12 rounded-2xl border-brand-line bg-brand-neutral px-4 text-sm text-brand-ink placeholder:text-brand-secondary/70 focus-visible:border-brand-primary focus-visible:ring-brand-primary/[0.15]";
  const iconButtonClass =
    "absolute right-2 top-1/2 size-8 -translate-y-1/2 rounded-lg text-brand-secondary hover:bg-white hover:text-brand-ink";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,_#edf6ff_0%,_#f8fbff_44%,_#edf1ee_100%)] px-5 py-10">
      <section className="w-full max-w-lg rounded-lg border border-brand-line bg-white p-6 shadow-[0_28px_90px_rgba(68,83,74,0.14)] sm:p-8">
        <Link to="/" className="mb-8 inline-flex transition-opacity hover:opacity-90">
          <img src="/assets/logo.png" alt="Conectio" className="h-16 w-32 object-contain" />
        </Link>

        <div className="inline-flex items-center gap-2 rounded-full border border-brand-line bg-brand-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-brand-secondary">
          <MailCheck className="size-3.5 text-brand-primary" />
          Invite
        </div>

        <div className="mt-5 space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-brand-ink">Activate your account.</h1>
          <p className="text-sm leading-6 text-brand-secondary">
            Complete your profile to accept the workspace invite and create your login password.
          </p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-brand-ink" htmlFor="invite-full-name">
              Full name <span className="text-red-500">*</span>
            </label>
            <Input
              id="invite-full-name"
              value={form.fullName}
              onChange={(event) => updateField("fullName", event.target.value)}
              placeholder="Enter your full name"
              autoComplete="name"
              className={fieldClass}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-brand-ink" htmlFor="invite-mobile-number">
              Mobile number <span className="text-red-500">*</span>
            </label>
            <Input
              id="invite-mobile-number"
              value={form.mobileNumber}
              onChange={(event) => updateField("mobileNumber", event.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="Enter mobile number"
              inputMode="numeric"
              autoComplete="tel"
              className={fieldClass}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-brand-ink" htmlFor="invite-password">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Input
                id="invite-password"
                type={isPasswordVisible ? "text" : "password"}
                value={form.password}
                onChange={(event) => updateField("password", event.target.value)}
                placeholder="Create password"
                autoComplete="new-password"
                className={`${fieldClass} pr-12`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={iconButtonClass}
                onClick={() => setIsPasswordVisible((current) => !current)}
              >
                {isPasswordVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                <span className="sr-only">{isPasswordVisible ? "Hide password" : "Show password"}</span>
              </Button>
            </div>
            <PasswordRequirements password={form.password} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-brand-ink" htmlFor="invite-confirm-password">
              Confirm password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Input
                id="invite-confirm-password"
                type={isConfirmPasswordVisible ? "text" : "password"}
                value={form.confirmPassword}
                onChange={(event) => updateField("confirmPassword", event.target.value)}
                placeholder="Confirm password"
                autoComplete="new-password"
                className={`${fieldClass} pr-12`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={iconButtonClass}
                onClick={() => setIsConfirmPasswordVisible((current) => !current)}
              >
                {isConfirmPasswordVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                <span className="sr-only">
                  {isConfirmPasswordVisible ? "Hide confirm password" : "Show confirm password"}
                </span>
              </Button>
            </div>
          </div>

          {!token ? <p className="text-sm text-rose-600">Invite token is missing. Open the activation link from your email.</p> : null}

          <Button
            type="submit"
            className="h-12 w-full rounded-2xl bg-brand-primary text-white hover:bg-brand-primary/90"
            disabled={!isFormValid || acceptInviteMutation.isPending}
          >
            {acceptInviteMutation.isPending ? (
              <>
                <LoaderCircle className="size-4 animate-spin" />
                Activating
              </>
            ) : (
              "Accept invite"
            )}
          </Button>

          <Button
            asChild
            type="button"
            variant="ghost"
            className="h-11 w-full rounded-2xl text-brand-secondary hover:bg-brand-soft hover:text-brand-ink"
          >
            <Link to="/login?mode=workspace">
              <ArrowLeft className="size-4" />
              Back to login
            </Link>
          </Button>
        </form>
      </section>
    </main>
  );
}

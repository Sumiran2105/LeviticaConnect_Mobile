import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AUTH_RESET_PASSWORD } from "@/config/api";
import { apiClient } from "@/lib/client";

function isValidPassword(value) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(
    value
  );
}

function PasswordRequirements({ password }) {
  const rules = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "One uppercase letter (A–Z)", met: /[A-Z]/.test(password) },
    { label: "One lowercase letter (a–z)", met: /[a-z]/.test(password) },
    { label: "One number (0–9)", met: /\d/.test(password) },
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
          <span
            className={`text-[11px] leading-tight ${rule.met
              ? "text-emerald-600 font-medium"
              : "text-brand-secondary/70"
              }`}
          >
            {rule.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    getValues,
    formState: { errors },
  } = useForm({
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
    mode: "onBlur",
  });

  const newPasswordValue = useWatch({ control, name: "newPassword" }) || "";
  const confirmPasswordValue = useWatch({ control, name: "confirmPassword" }) || "";

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ newPassword, confirmPassword }) => {
      const response = await apiClient.post(AUTH_RESET_PASSWORD, null, {
        params: {
          token,
          new_password: newPassword,
          confirm_password: confirmPassword,
        },
      });

      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || "Password updated successfully.");
      setIsSuccess(true);
      window.setTimeout(() => {
        navigate("/login?mode=workspace", { replace: true });
      }, 2000);
    },
    onError: (error) => {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        "Unable to reset password right now.";

      toast.error(message);
    },
  });

  const onSubmit = handleSubmit((values) => {
    if (!isValidPassword(values.newPassword)) {
      toast.error(
        "Password must contain at least 8 characters, including upper, lower, number, and special character."
      );
      return;
    }
    resetPasswordMutation.mutate(values);
  });

  /* ── Success state ── */
  if (isSuccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,_#f6f6ff_0%,_#eef3ef_100%)] px-6 py-10">
        <section className="w-full max-w-md rounded-[32px] border border-brand-line bg-white p-7 shadow-[0_24px_80px_rgba(68,83,74,0.12)] sm:p-10 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-50 ring-8 ring-emerald-50/50">
            <ShieldCheck className="size-8 text-emerald-500" />
          </div>

          <div className="mt-6 space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-brand-ink">
              Password updated!
            </h1>
            <p className="text-sm leading-6 text-brand-secondary">
              Your password has been reset successfully. You can now sign in
              with your new password.
            </p>
          </div>

          <Button
            asChild
            className="mt-8 h-12 w-full rounded-2xl bg-brand-primary text-white hover:bg-brand-primary/90 shadow-lg shadow-brand-primary/20"
          >
            <Link to="/login?mode=workspace">Continue to login</Link>
          </Button>
        </section>
      </main>
    );
  }

  /* ── Missing token state ── */
  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,_#f6f6ff_0%,_#eef3ef_100%)] px-6 py-10">
        <section className="w-full max-w-md rounded-[32px] border border-brand-line bg-white p-7 shadow-[0_24px_80px_rgba(68,83,74,0.12)] sm:p-10 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-amber-50 ring-8 ring-amber-50/50">
            <AlertTriangle className="size-8 text-amber-500" />
          </div>

          <div className="mt-6 space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-brand-ink">
              Invalid reset link
            </h1>
            <p className="text-sm leading-6 text-brand-secondary">
              This password reset link is missing a valid token. It may have
              expired or been used already. Please request a new link.
            </p>
          </div>

          <div className="mt-8 space-y-3">
            <Button
              asChild
              className="h-12 w-full rounded-2xl bg-brand-primary text-white hover:bg-brand-primary/90 shadow-lg shadow-brand-primary/20"
            >
              <Link to="/forgot-password">Request new link</Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              className="h-11 w-full rounded-2xl text-brand-secondary hover:bg-brand-soft hover:text-brand-ink"
            >
              <Link to="/login?mode=workspace">
                <ArrowLeft className="size-4" />
                Back to login
              </Link>
            </Button>
          </div>
        </section>
      </main>
    );
  }

  /* ── Form state ── */
  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,_#f6f6ff_0%,_#eef3ef_100%)] px-6 py-10">
      <section className="w-full max-w-md rounded-[32px] border border-brand-line bg-white p-7 shadow-[0_24px_80px_rgba(68,83,74,0.12)] sm:p-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-line bg-brand-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-brand-secondary">
          <LockKeyhole className="size-3.5 text-brand-primary" />
          Reset Password
        </div>

        <div className="mt-6 space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-brand-ink">
            Create a new password.
          </h1>
          <p className="text-sm leading-6 text-brand-secondary">
            Your new password must be different from the previous one and meet
            the requirements below.
          </p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={onSubmit}>
          {/* New Password */}
          <div className="space-y-2">
            <label
              className="text-sm font-medium text-brand-ink"
              htmlFor="reset-password-new"
            >
              New Password
            </label>
            <div className="relative">
              <Input
                id="reset-password-new"
                type={showNewPassword ? "text" : "password"}
                placeholder="Enter new password"
                autoComplete="new-password"
                className="h-12 rounded-2xl border-brand-line bg-brand-neutral px-4 pr-12 text-sm text-brand-ink placeholder:text-brand-secondary/70 focus-visible:border-brand-primary focus-visible:ring-brand-primary/[0.15]"
                aria-invalid={Boolean(errors.newPassword)}
                {...register("newPassword", {
                  required: "New password is required",
                  minLength: {
                    value: 8,
                    message: "Password must be at least 8 characters",
                  },
                })}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-secondary/50 hover:text-brand-primary transition-colors"
              >
                {showNewPassword ? (
                  <EyeOff className="size-4.5" />
                ) : (
                  <Eye className="size-4.5" />
                )}
              </button>
            </div>
            {errors.newPassword ? (
              <p className="text-sm text-rose-600">
                {errors.newPassword.message}
              </p>
            ) : null}
            <PasswordRequirements password={newPasswordValue} />
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <label
              className="text-sm font-medium text-brand-ink"
              htmlFor="reset-password-confirm"
            >
              Confirm Password
            </label>
            <div className="relative">
              <Input
                id="reset-password-confirm"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm new password"
                autoComplete="new-password"
                className="h-12 rounded-2xl border-brand-line bg-brand-neutral px-4 pr-12 text-sm text-brand-ink placeholder:text-brand-secondary/70 focus-visible:border-brand-primary focus-visible:ring-brand-primary/[0.15]"
                aria-invalid={Boolean(errors.confirmPassword)}
                {...register("confirmPassword", {
                  required: "Confirm password is required",
                  validate: (value) =>
                    value === getValues("newPassword") || "Passwords do not match",
                })}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-secondary/50 hover:text-brand-primary transition-colors"
              >
                {showConfirmPassword ? (
                  <EyeOff className="size-4.5" />
                ) : (
                  <Eye className="size-4.5" />
                )}
              </button>
            </div>
            {errors.confirmPassword ? (
              <p className="text-sm text-rose-600">
                {errors.confirmPassword.message}
              </p>
            ) : null}
            {newPasswordValue &&
              confirmPasswordValue &&
              newPasswordValue === confirmPasswordValue && (
                <p className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                  <CheckCircle2 className="size-3.5" />
                  Passwords match
                </p>
              )}
          </div>

          <Button
            type="submit"
            className="h-12 w-full rounded-2xl bg-brand-primary text-white hover:bg-brand-primary/90 shadow-lg shadow-brand-primary/20 transition-all"
            disabled={resetPasswordMutation.isPending}
          >
            {resetPasswordMutation.isPending ? (
              <>
                <LoaderCircle className="size-4 animate-spin" />
                <span className="ml-2">Updating password…</span>
              </>
            ) : (
              "Update password"
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

import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Check, LoaderCircle, MailCheck, RefreshCw, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AUTH_MFA_REQUEST_RESET_OTP,
  AUTH_MFA_SELF_RESET,
} from "@/config/api";
import { apiClient } from "@/lib/client";

export function ResetMfaPage() {
  const navigate = useNavigate();
  const [otpRequested, setOtpRequested] = useState(false);
  const activeStep = otpRequested ? 2 : 1;

  const {
    register,
    getValues,
    setValue,
    trigger,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: "",
      password: "",
      verifyEmail: "",
      otp: "",
    },
    mode: "onBlur",
  });

  const requestOtpMutation = useMutation({
    mutationFn: async ({ email, password }) => {
      const response = await apiClient.post(AUTH_MFA_REQUEST_RESET_OTP, null, {
        params: { email, password },
      });

      return response.data;
    },
    onSuccess: (data) => {
      setOtpRequested(true);
      setValue("verifyEmail", getValues("email"));
      toast.success(data?.message || "MFA reset OTP sent.");
    },
    onError: (error) => {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        "Unable to request MFA reset OTP right now.";

      toast.error(message);
    },
  });

  const selfResetMutation = useMutation({
    mutationFn: async ({ verifyEmail, otp }) => {
      const response = await apiClient.post(AUTH_MFA_SELF_RESET, null, {
        params: { email: verifyEmail, otp },
      });

      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || "MFA reset successfully. Please sign in again.");
      navigate("/login?mode=workspace", { replace: true });
    },
    onError: (error) => {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        "Unable to reset MFA right now.";

      toast.error(message);
    },
  });

  async function handleRequestOtp() {
    const isRequestValid = await trigger(["email", "password"]);

    if (!isRequestValid) {
      return;
    }

    requestOtpMutation.mutate({
      email: getValues("email"),
      password: getValues("password"),
    });
  }

  async function handleVerifyOtp() {
    const isVerifyValid = await trigger(["verifyEmail", "otp"]);

    if (!isVerifyValid) {
      return;
    }

    selfResetMutation.mutate({
      verifyEmail: getValues("verifyEmail"),
      otp: getValues("otp"),
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,_#f6f6ff_0%,_#eef3ef_100%)] px-6 py-10">
      <section className="w-full max-w-lg rounded-[32px] border border-brand-line bg-white p-7 shadow-[0_24px_80px_rgba(68,83,74,0.12)] sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-line bg-brand-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-brand-secondary">
          <ShieldCheck className="size-3.5 text-brand-primary" />
          MFA Reset
        </div>

        <div className="mt-5 space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-brand-ink">
            Reset your authenticator.
          </h1>
          <p className="text-sm leading-6 text-brand-secondary">
            Enter your email and password to receive an OTP, then verify the OTP to reset MFA.
          </p>
        </div>

        <div className="mt-7 grid grid-cols-[auto_1fr_auto] items-center gap-3">
          <div
            className={`flex size-9 items-center justify-center rounded-full text-sm font-bold ${
              activeStep === 1 ? "bg-brand-primary text-white" : "bg-emerald-500 text-white"
            }`}
          >
            {otpRequested ? <Check className="size-4" /> : "1"}
          </div>
          <div className="h-1 rounded-full bg-brand-line">
            <div
              className={`h-full rounded-full bg-brand-primary transition-all duration-500 ${
                otpRequested ? "w-full" : "w-1/2"
              }`}
            />
          </div>
          <div
            className={`flex size-9 items-center justify-center rounded-full text-sm font-bold ${
              activeStep === 2 ? "bg-brand-primary text-white" : "bg-brand-soft text-brand-secondary"
            }`}
          >
            2
          </div>
        </div>

        <form className="mt-6 space-y-5" onSubmit={(event) => event.preventDefault()}>
          {!otpRequested ? (
            <div className="animate-fade-in-up rounded-[28px] border border-brand-line bg-brand-neutral/50 p-5">
              <div className="mb-5">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-secondary">Step 1 of 2</p>
                <h2 className="mt-2 text-xl font-semibold text-brand-ink">Send reset OTP</h2>
                <p className="mt-1 text-sm leading-6 text-brand-secondary">
                  Confirm your account credentials and we will email a reset code.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-brand-ink" htmlFor="mfa-reset-email">
                    Email
                  </label>
                  <Input
                    id="mfa-reset-email"
                    type="email"
                    placeholder="user@company.com"
                    autoComplete="email"
                    className="h-12 rounded-2xl border-brand-line bg-white px-4 text-sm text-brand-ink placeholder:text-brand-secondary/70 focus-visible:border-brand-primary focus-visible:ring-brand-primary/[0.15]"
                    aria-invalid={Boolean(errors.email)}
                    {...register("email", {
                      required: "Email is required",
                      pattern: {
                        value: /\S+@\S+\.\S+/,
                        message: "Enter a valid email address",
                      },
                    })}
                  />
                  {errors.email ? <p className="text-sm text-rose-600">{errors.email.message}</p> : null}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-brand-ink" htmlFor="mfa-reset-password">
                    Password
                  </label>
                  <Input
                    id="mfa-reset-password"
                    type="password"
                    placeholder="Enter password"
                    autoComplete="current-password"
                    className="h-12 rounded-2xl border-brand-line bg-white px-4 text-sm text-brand-ink placeholder:text-brand-secondary/70 focus-visible:border-brand-primary focus-visible:ring-brand-primary/[0.15]"
                    aria-invalid={Boolean(errors.password)}
                    {...register("password", {
                      required: "Password is required",
                      minLength: {
                        value: 8,
                        message: "Password must be at least 8 characters",
                      },
                    })}
                  />
                  {errors.password ? (
                    <p className="text-sm text-rose-600">{errors.password.message}</p>
                  ) : null}
                </div>

                <Button
                  type="button"
                  className="h-12 w-full rounded-2xl bg-brand-primary px-5 text-white hover:bg-brand-primary/90"
                  disabled={requestOtpMutation.isPending}
                  onClick={handleRequestOtp}
                >
                  {requestOtpMutation.isPending ? (
                    <>
                      <LoaderCircle className="size-4 animate-spin" />
                      Sending OTP
                    </>
                  ) : (
                    <>
                      <RefreshCw className="size-4" />
                      Send OTP
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="animate-fade-in-up rounded-[28px] border border-brand-line bg-white p-5">
              <div className="mb-5">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-secondary">Step 2 of 2</p>
                <h2 className="mt-2 text-xl font-semibold text-brand-ink">Verify OTP and reset MFA</h2>
                <p className="mt-1 text-sm leading-6 text-brand-secondary">
                  Enter the email address and reset code sent to your inbox.
                </p>
              </div>

              <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                <MailCheck className="size-4" />
                OTP sent to your email.
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-brand-ink" htmlFor="mfa-reset-verify-email">
                    Email
                  </label>
                  <Input
                    id="mfa-reset-verify-email"
                    type="email"
                    placeholder="user@company.com"
                    autoComplete="email"
                    className="h-12 rounded-2xl border-brand-line bg-brand-neutral px-4 text-sm text-brand-ink placeholder:text-brand-secondary/70 focus-visible:border-brand-primary focus-visible:ring-brand-primary/[0.15]"
                    aria-invalid={Boolean(errors.verifyEmail)}
                    {...register("verifyEmail", {
                      required: "Email is required",
                      pattern: {
                        value: /\S+@\S+\.\S+/,
                        message: "Enter a valid email address",
                      },
                    })}
                  />
                  {errors.verifyEmail ? <p className="text-sm text-rose-600">{errors.verifyEmail.message}</p> : null}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-brand-ink" htmlFor="mfa-reset-otp">
                    OTP
                  </label>
                  <Input
                    id="mfa-reset-otp"
                    type="text"
                    inputMode="numeric"
                    placeholder="Enter reset OTP"
                    className="h-12 rounded-2xl border-brand-line bg-brand-neutral px-4 text-sm text-brand-ink placeholder:text-brand-secondary/70 focus-visible:border-brand-primary focus-visible:ring-brand-primary/[0.15]"
                    aria-invalid={Boolean(errors.otp)}
                    {...register("otp", {
                      required: "OTP is required",
                      minLength: {
                        value: 4,
                        message: "OTP looks too short",
                      },
                    })}
                  />
                  {errors.otp ? <p className="text-sm text-rose-600">{errors.otp.message}</p> : null}
                </div>

                <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 rounded-2xl border-brand-line bg-white px-5 text-brand-ink hover:bg-brand-soft"
                    disabled={selfResetMutation.isPending}
                    onClick={() => setOtpRequested(false)}
                  >
                    <ArrowLeft className="size-4" />
                    Edit email
                  </Button>
                  <Button
                    type="button"
                    className="h-12 rounded-2xl bg-brand-primary text-white hover:bg-brand-primary/90"
                    disabled={selfResetMutation.isPending}
                    onClick={handleVerifyOtp}
                  >
                    {selfResetMutation.isPending ? (
                      <>
                        <LoaderCircle className="size-4 animate-spin" />
                        Verifying
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="size-4" />
                        Verify and reset MFA
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

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

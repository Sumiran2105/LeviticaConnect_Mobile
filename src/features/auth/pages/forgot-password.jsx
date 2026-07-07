import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, LoaderCircle, Mail, Send } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AUTH_FORGOT_PASSWORD } from "@/config/api";
import { apiClient } from "@/lib/client";

export function ForgotPasswordPage() {
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: "",
    },
    mode: "onBlur",
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async ({ email, reset_url }) => {
      const response = await apiClient.post(AUTH_FORGOT_PASSWORD, null, {
        params: { email, reset_url },
      });

      return response.data;
    },
    onSuccess: () => {
      setIsSuccess(true);
    },
    onError: (error) => {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        "Unable to request a password reset right now.";

      toast.error(message);
    },
  });

  const onSubmit = handleSubmit((values) => {
      setSubmittedEmail(values.email);
      forgotPasswordMutation.mutate({
        ...values,
        reset_url: "https://leviticaconnect.com/reset-password",
      });
  });

  if (isSuccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,_#f6f6ff_0%,_#eef3ef_100%)] px-6 py-10">
        <section className="w-full max-w-md rounded-[32px] border border-brand-line bg-white p-7 shadow-[0_24px_80px_rgba(68,83,74,0.12)] sm:p-10 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-brand-soft ring-8 ring-brand-soft/50">
            <Send className="size-8 text-brand-primary ml-1" />
          </div>

          <div className="mt-6 space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-brand-ink">
              Check your email
            </h1>
            <p className="text-sm leading-6 text-brand-secondary">
              We've sent a password reset link to <span className="font-semibold text-brand-ink">{submittedEmail}</span>. Please check your inbox and spam folder.
            </p>
          </div>

          <div className="mt-8 space-y-3">
            <Button
              asChild
              className="h-12 w-full rounded-2xl bg-brand-primary text-white hover:bg-brand-primary/90 shadow-lg shadow-brand-primary/20"
            >
              <Link to="/login?mode=workspace">Return to login</Link>
            </Button>
            <p className="text-xs text-brand-secondary pt-2">
              Didn't receive the email?{" "}
              <button 
                type="button" 
                onClick={() => forgotPasswordMutation.mutate({ email: submittedEmail })}
                className="font-semibold text-brand-primary hover:underline"
                disabled={forgotPasswordMutation.isPending}
              >
                Click to resend
              </button>
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,_#f6f6ff_0%,_#eef3ef_100%)] px-6 py-10">
      <section className="w-full max-w-md rounded-[32px] border border-brand-line bg-white p-7 shadow-[0_24px_80px_rgba(68,83,74,0.12)] sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-line bg-brand-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-brand-secondary">
          <Mail className="size-3.5 text-brand-primary" />
          Password Reset
        </div>

        <div className="mt-5 space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-brand-ink">
            Request a reset link.
          </h1>
          <p className="text-sm leading-6 text-brand-secondary">
            Enter your workspace email and we will send the password reset link.
          </p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={onSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-brand-ink" htmlFor="forgot-password-email">
              Email
            </label>
            <Input
              id="forgot-password-email"
              type="email"
              placeholder="user@company.com"
              autoComplete="email"
              className="h-12 rounded-2xl border-brand-line bg-brand-neutral px-4 text-sm text-brand-ink placeholder:text-brand-secondary/70 focus-visible:border-brand-primary focus-visible:ring-brand-primary/[0.15]"
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

          <Button
            type="submit"
            className="h-12 w-full rounded-2xl bg-brand-primary text-white hover:bg-brand-primary/90"
            disabled={forgotPasswordMutation.isPending}
          >
            {forgotPasswordMutation.isPending ? (
              <>
                <LoaderCircle className="size-4 animate-spin" />
                Sending link
              </>
            ) : (
              "Send reset link"
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

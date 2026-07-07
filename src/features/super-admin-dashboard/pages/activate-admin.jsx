import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, KeyRound, LoaderCircle, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { SUPERADMIN_ACTIVATE_COMPANY_ADMIN } from "@/config/api";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/client";

export function ActivateAdminPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      full_name: "",
      password: "",
    },
    mode: "onBlur",
  });

  const activateMutation = useMutation({
    mutationFn: async (values) => {
      const response = await apiClient.post(SUPERADMIN_ACTIVATE_COMPANY_ADMIN, null, {
        params: {
          token,
          full_name: values.full_name,
          password: values.password,
        },
      });

      return response.data;
    },
    onSuccess: () => {
      toast.success("Company admin activated successfully.");
      navigate("/admin/auth", { replace: true });
    },
    onError: (error) => {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        "Unable to activate this invitation.";

      toast.error(message);
    },
  });

  const onSubmit = handleSubmit((values) => {
    activateMutation.mutate(values);
  });

  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,_#f6f6ff_0%,_#eef3ef_100%)] px-6 py-10">
      <section className="w-full max-w-2xl rounded-[32px] border border-brand-line bg-white p-7 shadow-[0_24px_80px_rgba(68,83,74,0.12)] sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-line bg-brand-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-brand-secondary">
          <ShieldCheck className="size-3.5 text-brand-primary" />
          Company Admin Activation
        </div>

        <div className="mt-5 flex items-start justify-between gap-4">
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight text-brand-ink">
              Activate your company admin account
            </h1>
            <p className="text-sm leading-7 text-brand-secondary">
              Complete the invitation setup using the activation token from the email
              link. After this, you can log in and continue to MFA.
            </p>
          </div>
          <div className="flex size-14 shrink-0 items-center justify-center rounded-3xl bg-brand-primary text-white shadow-lg shadow-brand-primary/20">
            <KeyRound className="size-6" />
          </div>
        </div>

        {token ? (
          <div className="mt-6 rounded-[28px] border border-brand-line bg-brand-neutral p-5">
            <p className="text-sm font-medium text-brand-ink">Invitation token</p>
            <p className="mt-2 break-all text-sm text-brand-secondary">{token}</p>
          </div>
        ) : (
          <div className="mt-6 rounded-[28px] border border-brand-tertiary/20 bg-brand-tertiary/5 p-5 text-sm text-brand-tertiary">
            No activation token was found in the URL. Open this page from the invite
            link or append <code>?token=...</code> to the address.
          </div>
        )}

        <form className="mt-8 space-y-5" onSubmit={onSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-brand-ink" htmlFor="full_name">
              Full name
            </label>
            <input
              id="full_name"
              className="h-12 w-full rounded-2xl border border-brand-line bg-white px-4 text-sm text-brand-ink placeholder:text-brand-secondary/70 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/10"
              placeholder="Enter your full name"
              {...register("full_name", {
                required: "Full name is required.",
              })}
            />
            {errors.full_name ? (
              <p className="text-sm text-brand-tertiary">{errors.full_name.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-brand-ink" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="h-12 w-full rounded-2xl border border-brand-line bg-white px-4 text-sm text-brand-ink placeholder:text-brand-secondary/70 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/10"
              placeholder="Create your password"
              {...register("password", {
                required: "Password is required.",
                minLength: {
                  value: 8,
                  message: "Password must be at least 8 characters.",
                },
              })}
            />
            {errors.password ? (
              <p className="text-sm text-brand-tertiary">{errors.password.message}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Button
              type="submit"
              disabled={activateMutation.isPending || !token}
              className="h-12 rounded-2xl bg-brand-primary px-5 text-white hover:bg-brand-primary/90"
            >
              {activateMutation.isPending ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  Activating
                </>
              ) : (
                "Activate account"
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="h-12 rounded-2xl border-brand-line bg-white px-5 text-brand-ink hover:bg-brand-soft"
              asChild
            >
              <Link to="/admin/auth">
                <ArrowLeft className="size-4" />
                Back to admin login
              </Link>
            </Button>
          </div>
        </form>
      </section>
    </main>
  );
}

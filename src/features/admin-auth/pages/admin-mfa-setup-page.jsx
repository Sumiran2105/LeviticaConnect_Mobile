import { useMutation } from "@tanstack/react-query";
import { LoaderCircle, QrCode, ShieldCheck } from "lucide-react";
import { useMemo } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { AUTH_MFA_SETUP } from "@/config/api";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/client";
import { useAuthStore } from "@/store/auth-store";

export function AdminMfaSetupPage() {
  const navigate = useNavigate();
  const pendingMfaSession = useAuthStore((state) => state.pendingMfaSession);
  const clearPendingMfaSession = useAuthStore((state) => state.clearPendingMfaSession);
  const isUserFlow = pendingMfaSession?.role === "USER";

  const setupMutation = useMutation({
    mutationFn: async (mfaToken) => {
      const response = await apiClient.post(AUTH_MFA_SETUP, null, {
        headers: {
          Authorization: `Bearer ${mfaToken}`,
        },
      });

      return response.data;
    },
    onError: (error) => {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        "Unable to start MFA setup right now.";

      toast.error(message);
    },
  });

  const setupPayload = useMemo(() => setupMutation.data || null, [setupMutation.data]);
  const qrCodeSrc = setupPayload?.qr_code_base64
    ? `data:image/png;base64,${setupPayload.qr_code_base64}`
    : null;
  const fallbackFields = useMemo(() => {
    if (!setupPayload) {
      return [];
    }

    return Object.entries(setupPayload).filter(
      ([key, value]) => key !== "qr_code_base64" && key !== "secret" && Boolean(value)
    );
  }, [setupPayload]);

  if (!pendingMfaSession?.mfaToken) {
    return <Navigate to="/login?mode=workspace" replace />;
  }

  function handleStartSetup() {
    if (!setupMutation.isPending) {
      setupMutation.mutate(pendingMfaSession.mfaToken);
    }
  }

  function handleBack() {
    clearPendingMfaSession();
    navigate("/login?mode=workspace", { replace: true });
  }

  return (
    <main className="flex  items-center justify-center bg-[linear-gradient(180deg,_#f6f6ff_0%,_#eef3ef_100%)] px-6 py-10">
      <section className=" rounded-[32px] border border-brand-line bg-white p-7 shadow-[0_24px_80px_rgba(68,83,74,0.12)] sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-line bg-brand-soft px-3 py-1 text-xs font-semibold  tracking-[0.28em] text-brand-secondary">
          <ShieldCheck className="size-3.5 text-brand-primary" />
          MFA Setup
        </div>

        <div className="mt-5 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xl space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight text-brand-ink">
              {isUserFlow
                ? "Register this device for secure user access."
                : "Register this device for secure admin access."}
            </h1>
          
          </div>

          <div className="flex size-14 shrink-0 items-center justify-center rounded-3xl bg-brand-primary text-white shadow-lg shadow-brand-primary/20">
            <QrCode className="size-6" />
          </div>
        </div>

        <div className="mt-8 rounded-[28px] border border-brand-line bg-brand-neutral p-5">
          <p className="text-sm font-medium text-brand-ink">Signed in as</p>
          <p className="mt-2 text-lg font-semibold text-brand-ink">
            {pendingMfaSession.email}
          </p>
          <p className="mt-1 text-sm text-brand-secondary">
            Role detected: {pendingMfaSession.role?.replaceAll("_", " ")}
          </p>
          <p className="mt-1 text-sm text-brand-secondary">
            MFA setup required: {pendingMfaSession.mfaSetupRequired ? "Yes" : "No"}
          </p>
        </div>

        {setupPayload ? (
          <div className="mt-6 grid gap-5 rounded-[28px] border border-brand-line bg-white p-5 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[24px] border border-brand-line bg-brand-neutral p-5">
              <p className="text-sm font-semibold  tracking-[0.2em] text-brand-secondary">
                Scan QR code
              </p>
              <div className="mt-4 flex min-h-[280px] items-center justify-center rounded-[24px] border border-dashed border-brand-line bg-white p-4">
                {qrCodeSrc ? (
                  <img
                    src={qrCodeSrc}
                    alt="MFA QR code"
                    className="h-auto w-full max-w-[240px] rounded-2xl"
                  />
                ) : (
                  <div className="space-y-2 text-center text-sm text-brand-secondary">
                    <p>No QR code returned by backend.</p>
                    <p>Use the secret key manually in your authenticator app.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[24px] border border-brand-line bg-brand-neutral p-5">
                <p className="text-sm font-semibold  tracking-[0.2em] text-brand-secondary">
                  Secret key
                </p>
                <div className="mt-4 rounded-2xl border border-brand-line bg-white px-4 py-4">
                  <p className="break-all font-mono text-sm tracking-[0.18em] text-brand-ink">
                    {setupPayload.secret || "Secret not returned"}
                  </p>
                </div>
                <p className="mt-3 text-sm leading-6 text-brand-secondary">
                  If scanning is not available, add this code manually in Google
                  Authenticator, Microsoft Authenticator, or a similar app.
                </p>
              </div>

              <div className="rounded-[24px] border border-brand-line bg-brand-neutral p-5">
                <p className="text-sm font-semibold  tracking-[0.2em] text-brand-secondary">
                  Next steps
                </p>
                <div className="mt-4 space-y-3 text-sm leading-6 text-brand-ink">
                  <p>1. Scan the QR code with your authenticator app.</p>
                  <p>2. Enter the generated OTP on the next screen.</p>
                  <p>3. After scanning the QR click on continue and enter otp.</p>
                </div>
              </div>

              {fallbackFields.length ? (
                <div className="rounded-[24px] border border-brand-line bg-brand-neutral p-5">
                  <p className="text-sm font-semibold  tracking-[0.2em] text-brand-secondary">
                    Additional response data
                  </p>
                  <div className="mt-4 space-y-3">
                    {fallbackFields.map(([key, value]) => (
                      <div key={key} className="rounded-2xl border border-brand-line bg-white px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-secondary">
                          {key}
                        </p>
                        <p className="mt-2 break-all text-sm text-brand-ink">
                          {typeof value === "object" ? JSON.stringify(value) : String(value)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {setupPayload ? (
            <Button
              type="button"
              className="h-12 rounded-2xl bg-brand-primary px-5 text-white hover:bg-brand-primary/90"
              onClick={() => navigate(isUserFlow ? "/user/mfa/verify" : "/admin/mfa/verify")}
            >
              Continue
            </Button>
          ) : (
            <Button
              type="button"
              className="h-12 rounded-2xl bg-brand-primary px-5 text-white hover:bg-brand-primary/90"
              onClick={handleStartSetup}
              disabled={setupMutation.isPending}
            >
              {setupMutation.isPending ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  Starting MFA
                </>
              ) : (
                "Start MFA setup"
              )}
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            className="h-12 rounded-2xl text-brand-secondary hover:bg-brand-soft hover:text-brand-ink"
            onClick={handleBack}
          >
            Back to login
          </Button>
        </div>
      </section>
    </main>
  );
}

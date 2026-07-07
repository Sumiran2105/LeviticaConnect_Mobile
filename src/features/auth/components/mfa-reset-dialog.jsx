import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { KeyRound, LoaderCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import {
  AUTH_MFA_REQUEST_RESET_OTP,
  AUTH_MFA_SELF_RESET,
} from "@/config/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/client";

export function MfaResetDialog({
  session,
  triggerLabel = "Reset MFA",
  triggerVariant = "outline",
  triggerClassName = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [otpRequested, setOtpRequested] = useState(false);
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");

  const requestResetOtpMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post(AUTH_MFA_REQUEST_RESET_OTP, null, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });

      return response.data;
    },
    onSuccess: () => {
      setOtpRequested(true);
      toast.success("Reset OTP sent. Check your registered contact method.");
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
    mutationFn: async () => {
      const response = await apiClient.post(AUTH_MFA_SELF_RESET, null, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
        params: {
          password,
          otp,
        },
      });

      return response.data;
    },
    onSuccess: () => {
      toast.success("MFA has been reset successfully.");
      setIsOpen(false);
      setOtpRequested(false);
      setPassword("");
      setOtp("");
    },
    onError: (error) => {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        "Unable to reset MFA right now.";

      toast.error(message);
    },
  });

  function handleOpenChange(nextOpen) {
    setIsOpen(nextOpen);

    if (!nextOpen) {
      setOtpRequested(false);
      setPassword("");
      setOtp("");
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} className={triggerClassName}>
          <ShieldCheck className="size-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg rounded-[28px] border border-brand-line bg-white p-0">
        <DialogHeader className="border-b border-brand-line px-6 py-5">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-brand-line bg-brand-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-brand-secondary">
            <KeyRound className="size-3.5 text-brand-primary" />
            MFA Reset
          </div>
          <DialogTitle className="pt-3 text-2xl font-semibold tracking-tight text-brand-ink">
            Reset multi-factor authentication
          </DialogTitle>
          <DialogDescription className="text-sm leading-6 text-brand-secondary">
            Request a reset OTP first, then confirm the reset using your current password
            and the OTP you receive.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 px-6 py-6">
          <div className="rounded-2xl border border-brand-line bg-brand-neutral p-4">
            <p className="text-sm font-medium text-brand-ink">Account</p>
            <p className="mt-1 text-sm text-brand-secondary">{session?.email}</p>
          </div>

          <div className="space-y-3">
            <Button
              type="button"
              className="h-11 rounded-2xl bg-brand-primary px-5 text-white hover:bg-brand-primary/90"
              disabled={requestResetOtpMutation.isPending}
              onClick={() => requestResetOtpMutation.mutate()}
            >
              {requestResetOtpMutation.isPending ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  Requesting OTP
                </>
              ) : (
                <>
                  <RefreshCw className="size-4" />
                  Request reset OTP
                </>
              )}
            </Button>
            <p className="text-xs leading-5 text-brand-secondary">
              This calls <code>/auth/mfa/request-reset-otp</code> for the signed-in user.
            </p>
          </div>

          {otpRequested ? (
            <div className="space-y-4 rounded-2xl border border-brand-line bg-white p-4">
              <div className="space-y-2">
                <Label className="text-brand-ink font-medium" htmlFor="mfa-reset-password">
                  Current password
                </Label>
                <Input
                  id="mfa-reset-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter current password"
                  className="h-11 rounded-2xl border-brand-line bg-brand-neutral"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-brand-ink font-medium" htmlFor="mfa-reset-otp">
                  OTP
                </Label>
                <Input
                  id="mfa-reset-otp"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  placeholder="Enter reset OTP"
                  className="h-11 rounded-2xl border-brand-line bg-brand-neutral"
                />
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="rounded-b-[28px] border-t border-brand-line bg-brand-soft/30 px-6 py-4 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            className="rounded-2xl text-brand-secondary hover:bg-brand-soft hover:text-brand-ink"
            onClick={() => setIsOpen(false)}
          >
            Close
          </Button>

          <Button
            type="button"
            className="h-11 rounded-2xl bg-brand-primary px-5 text-white hover:bg-brand-primary/90"
            disabled={!otpRequested || !password || !otp || selfResetMutation.isPending}
            onClick={() => selfResetMutation.mutate()}
          >
            {selfResetMutation.isPending ? (
              <>
                <LoaderCircle className="size-4 animate-spin" />
                Resetting MFA
              </>
            ) : (
              "Confirm MFA reset"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

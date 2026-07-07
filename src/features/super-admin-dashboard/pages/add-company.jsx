import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Globe,
  Mail,
  Phone,
  UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SUPERADMIN_CREATE_COMPANY,
  SUPERADMIN_RESEND_COMPANY_OTP,
  SUPERADMIN_VERIFY_COMPANY_OTP,
} from "@/config/api";
import { apiClient } from "@/lib/client";
import { useAuthStore } from "@/store/auth-store";
import { SuperAdminLayout } from "@/layouts/super-admin-layout";

const defaultForm = {
  fullName: "",
  companyName: "",
  domain: "",
  email: "",
  phoneNumber: "",
  address: "",
  password: "",
  confirmPassword: "",
};

function isValidName(value) {
  return /^[a-zA-Z\s'-]+$/.test(value.trim());
}

function isValidCompanyName(value) {
  return /[a-zA-Z]/.test(value);
}

function isValidDomain(value) {
  return /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(value.trim());
}

function isValidEmail(value) {
  return /\S+@\S+\.\S+/.test(value.trim());
}

function isValidPhone(value) {
  return /^[6-9]\d{9}$/.test(value.trim());
}

function isValidAddress(value) {
  return value.trim().length >= 5 && /[a-zA-Z]/.test(value);
}

function isValidPassword(value) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(value);
}

export function AddCompanyPage() {
  const navigate = useNavigate();
  const session = useAuthStore((state) => state.session);
  const [form, setForm] = useState(defaultForm);
  const [companyOtp, setCompanyOtp] = useState("");
  const [createdCompanyId, setCreatedCompanyId] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isDomainVerified, setIsDomainVerified] = useState(false);
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

  const requestConfig = useMemo(
    () => ({
      headers: {
        Authorization: `Bearer ${session?.accessToken}`,
      },
    }),
    [session?.accessToken]
  );

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));

    if (field === "domain" || field === "email" || field === "password" || field === "confirmPassword") {
      setIsOtpSent(false);
      setIsDomainVerified(false);
      setCompanyOtp("");
      setCreatedCompanyId("");
    }
  }

  function validateBaseForm() {
    if (
      !form.fullName.trim() ||
      !form.companyName.trim() ||
      !form.domain.trim() ||
      !form.email.trim() ||
      !form.phoneNumber.trim() ||
      !form.address.trim() ||
      !form.password ||
      !form.confirmPassword
    ) {
      toast.error("Complete all company registration fields.");
      return false;
    }

    if (!isValidName(form.fullName)) {
      toast.error("Enter a valid full name (letters only).");
      return false;
    }

    if (!isValidCompanyName(form.companyName)) {
      toast.error("Company name must contain letters.");
      return false;
    }

    if (!isValidDomain(form.domain)) {
      toast.error("Enter a valid domain like levitica.com");
      return false;
    }

    if (!isValidEmail(form.email)) {
      toast.error("Enter a valid admin email address.");
      return false;
    }

    if (!isValidPhone(form.phoneNumber)) {
      toast.error("Enter a valid phone number (exactly 10 digits).");
      return false;
    }

    if (!isValidAddress(form.address)) {
      toast.error("Enter a valid company address.");
      return false;
    }

    if (!isValidPassword(form.password)) {
      toast.error("Password must contain at least 8 characters, including upper, lower, number, and special character.");
      return false;
    }

    if (form.password !== form.confirmPassword) {
      toast.error("Password and confirm password must match.");
      return false;
    }

    return true;
  }

  async function handleCreateCompany(event) {
    event.preventDefault();

    if (!validateBaseForm()) {
      return;
    }

    try {
      setIsCreatingCompany(true);

      const response = await apiClient.post(SUPERADMIN_CREATE_COMPANY, null, {
        ...requestConfig,
        params: {
          full_name: form.fullName.trim(),
          company_name: form.companyName.trim(),
          domain: form.domain.trim().toLowerCase().replace(/^@/, ""),
          email: form.email.trim().toLowerCase(),
          phone_number: form.phoneNumber.trim(),
          address: form.address.trim(),
          password: form.password,
          confirm_password: form.confirmPassword,
          remember_me: false,
        },
      });

      setCreatedCompanyId(response.data?.company_id || "");
      setIsOtpSent(true);
      toast.success(response.data?.message || `OTP sent to ${form.email.trim().toLowerCase()}.`);
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        "Unable to create the company right now.";

      toast.error(message);
    } finally {
      setIsCreatingCompany(false);
    }
  }

  async function handleVerifyOtp() {
    if (!companyOtp.trim()) {
      toast.error("Enter the OTP sent to the admin email.");
      return;
    }

    if (!createdCompanyId) {
      toast.error("Company reference is missing. Create the company again.");
      return;
    }

    try {
      setIsVerifyingOtp(true);

      const response = await apiClient.post(SUPERADMIN_VERIFY_COMPANY_OTP(createdCompanyId), null, {
        ...requestConfig,
        params: {
          otp: companyOtp.trim(),
        },
      });

      setIsDomainVerified(true);
      toast.success(response.data?.message || "Company domain verified successfully.");
      window.setTimeout(() => {
        navigate("/super-admin/dashboard/pending-companies", { replace: true });
      }, 700);
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        "Unable to verify OTP right now.";

      toast.error(message);
    } finally {
      setIsVerifyingOtp(false);
    }
  }

  async function handleResendOtp() {
    if (!createdCompanyId) {
      toast.error("Company reference is missing. Create the company again.");
      return;
    }

    try {
      setIsResendingOtp(true);

      const response = await apiClient.post(
        SUPERADMIN_RESEND_COMPANY_OTP(createdCompanyId),
        null,
        requestConfig
      );

      toast.success(response.data?.message || "OTP resent successfully.");
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        "Unable to resend OTP right now.";

      toast.error(message);
    } finally {
      setIsResendingOtp(false);
    }
  }

  return (
    <SuperAdminLayout>
      <div className="mx-auto max-w-3xl text-brand-ink">
        <div className="mb-8 flex items-center justify-between">
          <div className="space-y-1">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-sm font-medium text-brand-secondary transition hover:text-brand-primary"
            >
              <ArrowLeft className="size-4" />
              Back
            </button>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Add company
            </h1>
            <p className="text-sm text-brand-secondary">
              Create the company with the admin password, verify its domain with OTP, and move it into the pending approval queue.
            </p>
          </div>
        </div>

        <div className="rounded-[32px] border border-brand-line bg-white p-8 shadow-[0_16px_50px_rgba(68,83,74,0.06)] md:p-10">
          <form onSubmit={handleCreateCompany} className="space-y-6">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="full_name" className="flex items-center gap-2 text-brand-ink">
                  <UserRound className="size-4 text-brand-primary" />
                  <span>Full name <span className="text-red-500">*</span></span>
                </Label>
                <Input
                  id="full_name"
                  value={form.fullName}
                  onChange={(event) => {
                    let value = event.target.value;
                    if (/[^a-zA-Z\s'-]/.test(value)) {
                      toast.error("Special characters and numbers are not allowed in full name.");
                    }
                    value = value.replace(/[^a-zA-Z\s'-]/g, "").trimStart();
                    if (value.length > 0) {
                      value = value.charAt(0).toUpperCase() + value.slice(1);
                    }
                    updateField("fullName", value);
                  }}
                  placeholder="Enter admin full name"
                  className="h-12 rounded-2xl border-brand-line bg-brand-neutral"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_name" className="flex items-center gap-2 text-brand-ink">
                  <Building2 className="size-4 text-brand-primary" />
                  <span>Company name <span className="text-red-500">*</span></span>
                </Label>
                <Input
                  id="company_name"
                  value={form.companyName}
                  onChange={(event) => updateField("companyName", event.target.value.replace(/[0-9]/g, "").trimStart())}
                  placeholder="Enter company name"
                  className="h-12 rounded-2xl border-brand-line bg-brand-neutral"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="domain" className="flex items-center gap-2 text-brand-ink">
                  <Globe className="size-4 text-brand-primary" />
                  <span>Company domain <span className="text-red-500">*</span></span>
                </Label>
                <Input
                  id="domain"
                  value={form.domain}
                  onChange={(event) => updateField("domain", event.target.value)}
                  placeholder="Enter company domain"
                  className="h-12 rounded-2xl border-brand-line bg-brand-neutral"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2 text-brand-ink">
                  <Mail className="size-4 text-brand-primary" />
                  <span>Admin email <span className="text-red-500">*</span></span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value.replace(/\s/g, ""))}
                  placeholder="Enter admin email"
                  className="h-12 rounded-2xl border-brand-line bg-brand-neutral"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2 text-brand-ink">
                  <Phone className="size-4 text-brand-primary" />
                  <span>Phone number <span className="text-red-500">*</span></span>
                </Label>
                <Input
                  id="phone"
                  value={form.phoneNumber}
                  onChange={(event) => {
                    let val = event.target.value.replace(/\D/g, '');
                    if (val.length > 0 && !/^[6-9]/.test(val)) {
                      toast.error("Phone number must start with 6, 7, 8, or 9.");
                      val = "";
                    }
                    updateField("phoneNumber", val.slice(0, 10));
                  }}
                  placeholder="Enter phone number"
                  className="h-12 rounded-2xl border-brand-line bg-brand-neutral"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="flex items-center gap-2 text-brand-ink">
                  <span>Company address <span className="text-red-500">*</span></span>
                </Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(event) => updateField("address", event.target.value)}
                  placeholder="Enter company address"
                  className="h-12 rounded-2xl border-brand-line bg-brand-neutral"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2 text-brand-ink">
                  <span>Password <span className="text-red-500">*</span></span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={isPasswordVisible ? "text" : "password"}
                    value={form.password}
                    onChange={(event) => updateField("password", event.target.value)}
                    placeholder="Create password"
                    className="h-12 rounded-2xl border-brand-line bg-brand-neutral pr-12"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 size-8 -translate-y-1/2 rounded-full text-brand-secondary hover:bg-white hover:text-brand-ink"
                    onClick={() => setIsPasswordVisible((current) => !current)}
                  >
                    {isPasswordVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
                </div>
                <p className="text-xs text-brand-secondary">
                  Must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm_password" className="flex items-center gap-2 text-brand-ink">
                  <span>Confirm password <span className="text-red-500">*</span></span>
                </Label>
                <div className="relative">
                  <Input
                    id="confirm_password"
                    type={isConfirmPasswordVisible ? "text" : "password"}
                    value={form.confirmPassword}
                    onChange={(event) => updateField("confirmPassword", event.target.value)}
                    placeholder="Confirm password"
                    className="h-12 rounded-2xl border-brand-line bg-brand-neutral pr-12"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 size-8 -translate-y-1/2 rounded-full text-brand-secondary hover:bg-white hover:text-brand-ink"
                    onClick={() => setIsConfirmPasswordVisible((current) => !current)}
                  >
                    {isConfirmPasswordVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
                </div>
              </div>
            </div>

            {!isOtpSent ? (
              <div className="flex justify-center pt-2">
                <Button
                  type="submit"
                  disabled={isCreatingCompany}
                  className="h-12 rounded-2xl bg-brand-primary px-10 text-white hover:bg-brand-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCreatingCompany ? "Creating and sending OTP..." : "Create company and send OTP"}
                </Button>
              </div>
            ) : null}

            {isOtpSent ? (
              <div className="space-y-4 rounded-[24px] border border-brand-line bg-brand-neutral p-5">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-brand-soft text-brand-primary">
                    <Mail className="size-4.5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-brand-ink">Verify company domain</p>
                    <p className="mt-1 text-sm leading-6 text-brand-secondary">
                      We sent an OTP to <span className="font-medium text-brand-ink">{form.email}</span>.
                      Once verified, the company will move into the pending approval list.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
                  <Input
                    value={companyOtp}
                    onChange={(event) => setCompanyOtp(event.target.value)}
                    placeholder="Enter OTP"
                    className="h-12 rounded-2xl border-brand-line bg-white"
                  />
                  <Button
                    type="button"
                    className="h-12 rounded-2xl bg-brand-primary px-5 text-white hover:bg-brand-primary/90"
                    disabled={isVerifyingOtp}
                    onClick={handleVerifyOtp}
                  >
                    {isVerifyingOtp ? "Verifying..." : "Verify OTP"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-12 rounded-2xl px-4 text-brand-secondary hover:bg-white hover:text-brand-ink"
                    disabled={isResendingOtp}
                    onClick={handleResendOtp}
                  >
                    {isResendingOtp ? "Resending..." : "Resend OTP"}
                  </Button>
                </div>

                {isDomainVerified ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                    <CheckCircle2 className="size-3.5" />
                    Domain verified
                  </div>
                ) : null}
              </div>
            ) : null}

            {isDomainVerified ? (
              <div className="space-y-4 rounded-[24px] border border-brand-primary/10 bg-brand-primary/5 p-5">
                <p className="text-sm leading-6 text-brand-primary">
                  Company domain verified successfully. This company is being moved to the pending approval queue.
                </p>
                <div className="flex justify-center">
                  <Button
                    type="button"
                    className="h-12 rounded-2xl bg-brand-primary px-8 text-white hover:bg-brand-primary/90"
                    onClick={() => navigate("/super-admin/dashboard/pending-companies")}
                  >
                    Open pending companies
                  </Button>
                </div>
              </div>
            ) : null}
          </form>
        </div>
      </div>
    </SuperAdminLayout>
  );
}

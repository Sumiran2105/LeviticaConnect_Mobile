import {
  CheckCircle2,
  Circle,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Building2,
  Globe,
  Phone,
  MapPin,
} from "lucide-react";
import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AUTH_ADMIN_REGISTER,
  AUTH_REGISTER,
  AUTH_RESEND_OTP,
  AUTH_VERIFY_OTP,
} from "@/config/api";
import { apiClient } from "@/lib/client";
import { useAuthStore } from "@/store/auth-store";

const defaultAdminForm = {
  full_name: "",
  companyName: "",
  companyDomain: "",
  adminEmail: "",
  phoneNumber: "",
  address: "",
  password: "",
  confirm_password: "",
};

const defaultUserForm = {
  full_name: "",
  email: "",
  mobile_number: "",
  password: "",
  confirm_password: "",
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

export function RegisterPage() {
  const session = useAuthStore((state) => state.session);
  const [mode, setMode] = useState("admin");
  const [adminForm, setAdminForm] = useState(defaultAdminForm);
  const [userForm, setUserForm] = useState(defaultUserForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [adminOtp, setAdminOtp] = useState("");
  const [isDomainVerified, setIsDomainVerified] = useState(false);
  const [registeredCompanyId, setRegisteredCompanyId] = useState("");
  const [isAdminPasswordVisible, setIsAdminPasswordVisible] = useState(false);
  const [isAdminConfirmPasswordVisible, setIsAdminConfirmPasswordVisible] = useState(false);
  const [isUserPasswordVisible, setIsUserPasswordVisible] = useState(false);
  const [isUserConfirmPasswordVisible, setIsUserConfirmPasswordVisible] = useState(false);

  if (session?.accessToken) {
    if (session.role === "SUPER_ADMIN") {
      return <Navigate to="/super-admin/dashboard" replace />;
    }

    return <Navigate to="/admin/dashboard" replace />;
  }

  function updateAdminField(field, value) {
    setAdminForm((current) => ({ ...current, [field]: value }));

    if (
      field === "companyDomain" ||
      field === "adminEmail" ||
      field === "password" ||
      field === "confirm_password"
    ) {
      setIsDomainVerified(false);
      setIsOtpSent(false);
      setAdminOtp("");
      setRegisteredCompanyId("");
    }
  }

  function updateUserField(field, value) {
    setUserForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSendDomainOtp(event) {
    event.preventDefault();

    if (
      !adminForm.full_name.trim() ||
      !adminForm.companyName.trim() ||
      !adminForm.companyDomain.trim() ||
      !adminForm.adminEmail.trim() ||
      !adminForm.phoneNumber.trim() ||
      !adminForm.address.trim() ||
      !adminForm.password ||
      !adminForm.confirm_password
    ) {
      toast.error("Complete all company registration fields before sending OTP.");
      return;
    }

    if (!isValidName(adminForm.full_name)) {
      toast.error("Enter a valid full name (letters only).");
      return;
    }

    if (!isValidCompanyName(adminForm.companyName)) {
      toast.error("Company name must contain letters.");
      return;
    }

    if (!isValidDomain(adminForm.companyDomain)) {
      toast.error("Enter a valid company domain like levitica.com");
      return;
    }

    if (!isValidEmail(adminForm.adminEmail)) {
      toast.error("Enter a valid company email address.");
      return;
    }

    if (!isValidPhone(adminForm.phoneNumber)) {
      toast.error("Enter a valid phone number (exactly 10 digits).");
      return;
    }

    if (!isValidAddress(adminForm.address)) {
      toast.error("Enter a valid company address.");
      return;
    }

    if (!isValidPassword(adminForm.password)) {
      toast.error("Password must contain at least 8 characters, including upper, lower, number, and special character.");
      return;
    }

    if (adminForm.password !== adminForm.confirm_password) {
      toast.error("Password and confirm password must match.");
      return;
    }

    try {
      setIsSendingOtp(true);

      const response = await apiClient.post(AUTH_ADMIN_REGISTER, null, {
        params: {
          full_name: adminForm.full_name.trim(),
          company_name: adminForm.companyName.trim(),
          domain: adminForm.companyDomain.trim().toLowerCase().replace(/^@/, ""),
          email: adminForm.adminEmail.trim().toLowerCase(),
          phone_number: adminForm.phoneNumber.trim(),
          address: adminForm.address.trim(),
          password: adminForm.password,
          confirm_password: adminForm.confirm_password,
        },
      });

      setRegisteredCompanyId(response.data?.company_id || "");
      setIsOtpSent(true);
      toast.success(response.data?.message || `OTP sent to ${adminForm.adminEmail.trim().toLowerCase()}.`);
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        "Unable to send OTP right now.";

      toast.error(message);
    } finally {
      setIsSendingOtp(false);
    }
  }

  async function handleVerifyAdminOtp() {
    if (!adminOtp.trim()) {
      toast.error("Enter the OTP sent to the company email.");
      return;
    }

    if (adminOtp.trim().length < 4) {
      toast.error("Enter a valid OTP.");
      return;
    }

    if (!registeredCompanyId) {
      toast.error("Company registration reference is missing. Send OTP again.");
      return;
    }

    try {
      setIsVerifyingOtp(true);

      const response = await apiClient.post(AUTH_VERIFY_OTP(registeredCompanyId), null, {
        params: {
          otp: adminOtp.trim(),
        },
      });

      setIsDomainVerified(true);
      toast.success(response.data?.message || "Verified domain. Your account will be activated soon.");
      setIsSubmitting(true);
      window.setTimeout(() => {
        setAdminForm(defaultAdminForm);
        setIsDomainVerified(false);
        setIsOtpSent(false);
        setAdminOtp("");
        setRegisteredCompanyId("");
        setIsSubmitting(false);
      }, 900);
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
    if (!registeredCompanyId) {
      toast.error("Company registration reference is missing. Submit again.");
      return;
    }

    try {
      setIsResendingOtp(true);

      const response = await apiClient.post(AUTH_RESEND_OTP(registeredCompanyId));

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

  async function handleUserSubmit(event) {
    event.preventDefault();

    if (
      !userForm.full_name.trim() ||
      !userForm.email.trim() ||
      !userForm.mobile_number.trim() ||
      !userForm.password ||
      !userForm.confirm_password
    ) {
      toast.error("Complete all user registration fields.");
      return;
    }

    if (!isValidName(userForm.full_name)) {
      toast.error("Enter a valid full name (letters only).");
      return;
    }

    if (!isValidEmail(userForm.email)) {
      toast.error("Enter a valid email address.");
      return;
    }

    if (!isValidPhone(userForm.mobile_number)) {
      toast.error("Enter a valid mobile number (exactly 10 digits).");
      return;
    }

    if (!isValidPassword(userForm.password)) {
      toast.error("Password must contain at least 8 characters, including upper, lower, number, and special character.");
      return;
    }

    if (userForm.password !== userForm.confirm_password) {
      toast.error("Password and confirm password must match.");
      return;
    }

    setIsSubmitting(true);
    const payload = {
      full_name: userForm.full_name.trim(),
      email: userForm.email.trim().toLowerCase(),
      mobile_number: userForm.mobile_number.trim(),
      password: userForm.password,
      confirm_password: userForm.confirm_password,
    };

    try {
      const response = await apiClient.post(AUTH_REGISTER, payload, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      toast.success(response.data?.message || "User registration request submitted successfully.");
      setUserForm(defaultUserForm);
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        "Unable to register the user right now.";

      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass = "h-11 w-full pl-10 pr-4 rounded-xl border-0 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus-visible:ring-0 focus-visible:outline-none focus:outline-none focus:ring-0 focus:border-0 shadow-none";
  const wrapperClass = "relative rounded-xl border border-slate-200 bg-white/85 focus-within:bg-white focus-within:border-[#3B5BFC] focus-within:ring-2 focus-within:ring-[#3B5BFC]/15 transition-all duration-200 shadow-sm";
  const labelClass = "text-xs font-semibold text-slate-600 text-left block pl-0.5";
  const inputClassPassword = "h-11 w-full pl-10 pr-10 rounded-xl border-0 bg-transparent text-sm text-slate-800 placeholder:text-slate-300 focus-visible:ring-0 focus-visible:outline-none focus:outline-none focus:ring-0 focus:border-0 shadow-none";
  const iconButtonClass = "absolute right-2.5 top-1/2 -translate-y-1/2 flex size-7 items-center justify-center text-slate-400 hover:text-[#3B5BFC] transition-colors";

  return (
    <main className="relative flex min-h-dvh w-full items-start justify-center overflow-x-hidden overflow-y-auto bg-gradient-to-tr from-[#E0ECF8] via-[#F3F7FA] to-[#E8ECE9] px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
      {/* Glowing blur blobs in background */}
      <div className="pointer-events-none absolute left-[-35%] top-[-12%] size-64 rounded-full bg-[#82AEFF]/20 blur-[80px] sm:left-[-10%] sm:size-96 sm:blur-[100px]" />
      <div className="pointer-events-none absolute bottom-[-12%] right-[-35%] size-64 rounded-full bg-[#A3E3FF]/25 blur-[80px] sm:right-[-10%] sm:size-96 sm:blur-[100px]" />
      <div className="pointer-events-none absolute right-[-18%] top-[30%] size-56 rounded-full bg-[#D6C5FF]/15 blur-[70px] sm:right-[10%] sm:size-80 sm:blur-[80px]" />

      {/* Glassmorphic Card Container */}
      <div className="relative z-10 mx-auto flex w-full max-w-[760px] flex-col items-stretch rounded-[1.5rem] border border-white/60 bg-white/45 p-4 shadow-[0_24px_60px_rgba(71,94,156,0.12)] backdrop-blur-xl sm:rounded-[2rem] sm:p-6 lg:max-w-[820px] lg:p-7 xl:max-w-[860px]">
        
        {/* Logo (Bigger size, no white bg container, with Powered by Levitica Technologies chip close underneath) */}
        <div className="mb-4 flex flex-col items-center select-none sm:mb-5">
          <Link to="/" className="inline-flex h-24 items-center overflow-hidden transition-opacity hover:opacity-90 sm:h-32 lg:h-36">
            <img
              src="/assets/logo.png"
              alt="Conectio"
              className="h-36 w-auto object-contain sm:h-48 lg:h-52"
            />
          </Link>
          <div className="-mt-5 inline-flex max-w-full items-center rounded-full border border-slate-200 bg-white/70 px-3 py-0.5 text-center text-[9px] font-bold text-slate-500 shadow-sm backdrop-blur-sm sm:-mt-6">
            Powered by Levitica Technologies
          </div>
        </div>

        <h1 className="mb-4 text-center text-lg font-bold tracking-tight text-slate-800 sm:text-xl">
          {mode === "admin" ? "Company registration" : "User registration"}
        </h1>

        {/* Tab Selector */}
        <div className="mx-auto mb-5 w-full max-w-[260px] rounded-xl border border-slate-200/50 bg-white/60 p-1 sm:mb-6">
          <div className="grid grid-cols-2 gap-1">
            <Button
              type="button"
              variant="ghost"
              className={`h-9 rounded-lg text-xs font-bold ${mode === "admin" ? "bg-[#3B5BFC] text-white hover:bg-[#3B5BFC]/90 hover:text-white" : "text-slate-600 hover:bg-slate-200/50"}`}
              onClick={() => setMode("admin")}
            >
              Company
            </Button>
            <Button
              type="button"
              variant="ghost"
              className={`h-9 rounded-lg text-xs font-bold ${mode === "user" ? "bg-[#3B5BFC] text-white hover:bg-[#3B5BFC]/90 hover:text-white" : "text-slate-600 hover:bg-slate-200/50"}`}
              onClick={() => setMode("user")}
            >
              User
            </Button>
          </div>
        </div>

        <div>
          {mode === "admin" ? (
            <form className="space-y-4" onSubmit={handleSendDomainOtp}>
              <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                <div className="space-y-1.5 text-left">
                  <label className={labelClass}>Full name <span className="text-red-500">*</span></label>
                  <div className={wrapperClass}>
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input
                      value={adminForm.full_name}
                      onChange={(event) => {
                        let value = event.target.value;
                        if (/[^a-zA-Z\s'-]/.test(value)) {
                          toast.error("Special characters and numbers are not allowed in full name.");
                        }
                        value = value.replace(/[^a-zA-Z\s'-]/g, "").trimStart();
                        if (value.length > 0) {
                          value = value.charAt(0).toUpperCase() + value.slice(1);
                        }
                        updateAdminField("full_name", value);
                      }}
                      placeholder="Enter your full name"
                      className={inputClass}
                    />
                  </div>
                  {adminForm.full_name && !isValidName(adminForm.full_name) && (
                    <p className="text-xs text-red-500 pl-0.5">Please enter a valid name (letters only).</p>
                  )}
                </div>

                <div className="space-y-1.5 text-left">
                  <label className={labelClass}>Company name <span className="text-red-500">*</span></label>
                  <div className={wrapperClass}>
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input
                      value={adminForm.companyName}
                      onChange={(event) => updateAdminField("companyName", event.target.value.replace(/[0-9]/g, "").trimStart())}
                      placeholder="Enter company name"
                      className={inputClass}
                    />
                  </div>
                  {adminForm.companyName && !isValidCompanyName(adminForm.companyName) && (
                    <p className="text-xs text-red-500 pl-0.5">Company name must contain at least one letter.</p>
                  )}
                </div>

                <div className="space-y-1.5 text-left">
                  <label className={labelClass}>Company domain <span className="text-red-500">*</span></label>
                  <div className={wrapperClass}>
                    <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input
                      value={adminForm.companyDomain}
                      onChange={(event) => updateAdminField("companyDomain", event.target.value)}
                      placeholder="Enter company domain"
                      className={inputClass}
                    />
                  </div>
                  {adminForm.companyDomain && !isValidDomain(adminForm.companyDomain) && (
                    <p className="text-xs text-red-500 pl-0.5">Enter a valid domain (e.g. example.com).</p>
                  )}
                </div>

                <div className="space-y-1.5 text-left">
                  <label className={labelClass}>Phone no <span className="text-red-500">*</span></label>
                  <div className={wrapperClass}>
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input
                      value={adminForm.phoneNumber}
                      onChange={(event) => {
                        let val = event.target.value.replace(/\D/g, '');
                        if (val.length > 0 && !/^[6-9]/.test(val)) {
                          toast.error("Phone number must start with 6, 7, 8, or 9.");
                          val = "";
                        }
                        updateAdminField("phoneNumber", val.slice(0, 10));
                      }}
                      placeholder="Enter phone number"
                      className={inputClass}
                    />
                  </div>
                  {adminForm.phoneNumber && !isValidPhone(adminForm.phoneNumber) && (
                    <p className="text-xs text-red-500 pl-0.5">Enter a valid 10-digit number starting with 6-9.</p>
                  )}
                </div>

                <div className="space-y-1.5 text-left">
                  <label className={labelClass}>Company address <span className="text-red-500">*</span></label>
                  <div className={wrapperClass}>
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input
                      value={adminForm.address}
                      onChange={(event) => updateAdminField("address", event.target.value)}
                      placeholder="Enter company address"
                      className={inputClass}
                    />
                  </div>
                  {adminForm.address && !isValidAddress(adminForm.address) && (
                    <p className="text-xs text-red-500 pl-0.5">Address must be at least 5 characters.</p>
                  )}
                </div>

                <div className="space-y-1.5 text-left">
                  <label className={labelClass}>Company email ID <span className="text-red-500">*</span></label>
                  <div className={wrapperClass}>
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input
                      type="email"
                      value={adminForm.adminEmail}
                      onChange={(event) => updateAdminField("adminEmail", event.target.value.replace(/\s/g, ""))}
                      placeholder="Enter company email"
                      className={inputClass}
                    />
                  </div>
                  {adminForm.adminEmail && !isValidEmail(adminForm.adminEmail) && (
                    <p className="text-xs text-red-500 pl-0.5">Enter a valid email address.</p>
                  )}
                </div>

                <div className="space-y-1.5 text-left">
                  <label className={labelClass}>Password <span className="text-red-500">*</span></label>
                  <div className={wrapperClass}>
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input
                      type={isAdminPasswordVisible ? "text" : "password"}
                      value={adminForm.password}
                      onChange={(event) => updateAdminField("password", event.target.value)}
                      placeholder="Create password"
                      className={inputClassPassword}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={iconButtonClass}
                      onClick={() => setIsAdminPasswordVisible((current) => !current)}
                    >
                      {isAdminPasswordVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      <span className="sr-only">
                        {isAdminPasswordVisible ? "Hide password" : "Show password"}
                      </span>
                    </Button>
                  </div>
                  <PasswordRequirements password={adminForm.password} />
                </div>

                <div className="space-y-1.5 text-left">
                  <label className={labelClass}>Confirm password <span className="text-red-500">*</span></label>
                  <div className={wrapperClass}>
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input
                      type={isAdminConfirmPasswordVisible ? "text" : "password"}
                      value={adminForm.confirm_password}
                      onChange={(event) => updateAdminField("confirm_password", event.target.value)}
                      placeholder="Confirm password"
                      className={inputClassPassword}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={iconButtonClass}
                      onClick={() => setIsAdminConfirmPasswordVisible((current) => !current)}
                    >
                      {isAdminConfirmPasswordVisible ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                      <span className="sr-only">
                        {isAdminConfirmPasswordVisible ? "Hide confirm password" : "Show confirm password"}
                      </span>
                    </Button>
                  </div>
                  {adminForm.confirm_password && adminForm.password !== adminForm.confirm_password && (
                    <p className="text-xs text-red-500 pl-0.5">Passwords do not match.</p>
                  )}
                </div>
              </div>

              {!isOtpSent ? (
                <div className="pt-4">
                  <Button
                    type="submit"
                    className="h-11 w-full rounded-xl bg-[#3B5BFC] hover:bg-[#3B5BFC]/95 text-white text-sm font-semibold tracking-wide shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                    disabled={isSendingOtp}
                  >
                    {isSendingOtp ? "Sending OTP..." : "Continue"}
                  </Button>
                </div>
              ) : null}

              {isOtpSent ? (
                <div className="mt-4 space-y-4 rounded-2xl border border-slate-200/60 bg-white/50 p-4 text-left shadow-sm backdrop-blur-sm sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-brand-soft text-brand-primary shrink-0">
                      <Mail className="size-4.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-brand-ink">OTP verification</p>
                      <p className="mt-1 text-xs leading-relaxed text-brand-secondary">
                        We sent an OTP to the company email{" "}
                        <span className="break-all font-semibold text-brand-ink">{adminForm.adminEmail}</span>. Enter it
                        below to verify the domain and activate the registration request.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
                    <Input
                      value={adminOtp}
                      onChange={(event) => setAdminOtp(event.target.value)}
                      placeholder="Enter OTP"
                      className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-800"
                    />
                    <Button
                      type="button"
                      className="h-11 w-full rounded-xl bg-[#3B5BFC] px-5 font-bold text-white shadow-md shadow-blue-500/10 hover:bg-[#3B5BFC]/95 md:w-auto"
                      disabled={isVerifyingOtp}
                      onClick={handleVerifyAdminOtp}
                    >
                      {isVerifyingOtp ? "Verifying..." : "Verify OTP"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-11 w-full rounded-xl px-4 font-semibold text-slate-500 hover:bg-slate-200/50 hover:text-slate-800 md:w-auto"
                      disabled={isResendingOtp}
                      onClick={handleResendOtp}
                    >
                      {isResendingOtp ? "Resending..." : "Resend OTP"}
                    </Button>
                  </div>

                  {isDomainVerified ? (
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                      <CheckCircle2 className="size-3.5" />
                      Verified domain
                    </div>
                  ) : null}
                </div>
              ) : null}

              {isDomainVerified ? (
                <p className="rounded-xl border border-brand-primary/10 bg-brand-primary/5 px-4 py-3 text-sm leading-6 text-brand-primary">
                  Domain verified successfully. Your account will be activated soon.
                </p>
              ) : null}
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleUserSubmit}>
              <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                <div className="space-y-1.5 text-left">
                  <label className={labelClass}>Full name <span className="text-red-500">*</span></label>
                  <div className={wrapperClass}>
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input
                      value={userForm.full_name}
                      onChange={(event) => {
                        let value = event.target.value;
                        if (/[^a-zA-Z\s'-]/.test(value)) {
                          toast.error("Special characters and numbers are not allowed in full name.");
                        }
                        value = value.replace(/[^a-zA-Z\s'-]/g, "").trimStart();
                        if (value.length > 0) {
                          value = value.charAt(0).toUpperCase() + value.slice(1);
                        }
                        updateUserField("full_name", value);
                      }}
                      placeholder="Enter your full name"
                      className={inputClass}
                    />
                  </div>
                  {userForm.full_name && !isValidName(userForm.full_name) && (
                    <p className="text-xs text-red-500 pl-0.5">Please enter a valid name (letters only).</p>
                  )}
                </div>

                <div className="space-y-1.5 text-left">
                  <label className={labelClass}>Email <span className="text-red-500">*</span></label>
                  <div className={wrapperClass}>
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input
                      type="email"
                      value={userForm.email}
                      onChange={(event) => updateUserField("email", event.target.value.replace(/\s/g, ""))}
                      placeholder="user@example.com"
                      className={inputClass}
                    />
                  </div>
                  {userForm.email && !isValidEmail(userForm.email) && (
                    <p className="text-xs text-red-500 pl-0.5">Enter a valid email address.</p>
                  )}
                </div>

                <div className="space-y-1.5 text-left">
                  <label className={labelClass}>Mobile number <span className="text-red-500">*</span></label>
                  <div className={wrapperClass}>
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input
                      value={userForm.mobile_number}
                      onChange={(event) => {
                        let val = event.target.value.replace(/\D/g, '');
                        if (val.length > 0 && !/^[6-9]/.test(val)) {
                          toast.error("Mobile number must start with 6, 7, 8, or 9.");
                          val = "";
                        }
                        updateUserField("mobile_number", val.slice(0, 10));
                      }}
                      placeholder="Enter mobile number"
                      className={inputClass}
                    />
                  </div>
                  {userForm.mobile_number && !isValidPhone(userForm.mobile_number) && (
                    <p className="text-xs text-red-500 pl-0.5">Enter a 10-digit number starting with 6-9.</p>
                  )}
                </div>

                <div className="space-y-1.5 text-left md:col-start-2 md:row-start-2">
                  <label className={labelClass}>Password <span className="text-red-500">*</span></label>
                  <div className={wrapperClass}>
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input
                      type={isUserPasswordVisible ? "text" : "password"}
                      value={userForm.password}
                      onChange={(event) => updateUserField("password", event.target.value)}
                      placeholder="Enter password"
                      className={inputClassPassword}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={iconButtonClass}
                      onClick={() => setIsUserPasswordVisible((current) => !current)}
                    >
                      {isUserPasswordVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      <span className="sr-only">
                        {isUserPasswordVisible ? "Hide password" : "Show password"}
                      </span>
                    </Button>
                  </div>
                  <PasswordRequirements password={userForm.password} />
                </div>

                <div className="space-y-1.5 text-left md:col-start-1 md:row-start-3">
                  <label className={labelClass}>Confirm password <span className="text-red-500">*</span></label>
                  <div className={wrapperClass}>
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input
                      type={isUserConfirmPasswordVisible ? "text" : "password"}
                      value={userForm.confirm_password}
                      onChange={(event) => updateUserField("confirm_password", event.target.value)}
                      placeholder="Confirm password"
                      className={inputClassPassword}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={iconButtonClass}
                      onClick={() => setIsUserConfirmPasswordVisible((current) => !current)}
                    >
                      {isUserConfirmPasswordVisible ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                      <span className="sr-only">
                        {isUserConfirmPasswordVisible ? "Hide confirm password" : "Show confirm password"}
                      </span>
                    </Button>
                  </div>
                  {userForm.confirm_password && userForm.password !== userForm.confirm_password && (
                    <p className="text-xs text-red-500 pl-0.5">Passwords do not match.</p>
                  )}
                </div>
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  className="h-11 w-full rounded-xl bg-[#3B5BFC] hover:bg-[#3B5BFC]/95 text-white text-sm font-semibold tracking-wide shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Continue"}
                </Button>
              </div>
            </form>
          )}
        </div>

        <p className="text-xs text-slate-500 text-center select-none pt-4 border-t border-slate-200/50 mt-6">
          Already have an account?{" "}
          <Link to="/login" className="font-extrabold text-[#3B5BFC] hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </main>
  );
}

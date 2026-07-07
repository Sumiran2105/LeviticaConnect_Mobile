import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff, LoaderCircle, Mail, Lock } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { AUTH_LOGIN } from "@/config/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/client";
import { useAuthStore } from "@/store/auth-store";

const defaultValues = {
  email: "",
  password: "",
};

const workspaceUserRoles = ["USER", "CLIENT", "GUEST"];

const getUserIdFromMfaToken = (token) => {
  if (!token) return null;

  try {
    const [, payload] = token.split(".");
    if (!payload) return null;

    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
      "="
    );
    const decodedPayload = JSON.parse(atob(paddedPayload));
    return decodedPayload.user_id || null;
  } catch {
    return null;
  }
};

export function LoginForm({ audience = "workspace", redirectPath = "" }) {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const setPendingMfaSession = useAuthStore((state) => state.setPendingMfaSession);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues,
    mode: "onBlur",
  });

  const loginMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await apiClient.post(AUTH_LOGIN, null, {
        params: {
          email: payload.email,
          password: payload.password,
        },
      });

      return response.data;
    },
    onSuccess: (data, variables) => {
      const role = data.user_role;

      if (role === "SUPER_ADMIN") {
        if (audience === "workspace") {
          clearSession({ broadcast: false });
          toast.error("This is a super admin account. Switch to the Super Admin tab.");
          return;
        }

        setSession({
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresIn: data.expires_in,
          role,
          email: variables.email,
          userId: data.user_id || data.id || null,
        });

        toast.success("Super admin signed in successfully.");
        navigate("/super-admin/dashboard", { replace: true });
        return;
      }

      if (audience === "super-admin") {
        clearSession({ broadcast: false });
        toast.error("This account belongs to the admin or user flow. Use the Admin/User tab.");
        return;
      }

      if (data.access_token) {
        setSession({
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresIn: data.expires_in,
          role,
          email: variables.email,
          userId: data.user_id || data.id || null,
          mfaVerified: true,
        });

        toast.success("Signed in successfully.");
        navigate(redirectPath || (workspaceUserRoles.includes(role) ? "/user/dashboard" : "/admin/dashboard"), { replace: true });
        return;
      }

      const requiresSetup = Boolean(data.mfa_setup_required);
      const mfaUserId = data.user_id || getUserIdFromMfaToken(data.mfa_token);

      setPendingMfaSession({
        mfaToken: data.mfa_token || null,
        userId: mfaUserId || null,
        mfaSetupRequired: requiresSetup,
        role,
        email: variables.email,
      });

      if (requiresSetup) {
        toast.success("Credentials accepted. Continue with MFA setup.");
        navigate(workspaceUserRoles.includes(role) ? "/user/mfa/setup" : "/admin/mfa/setup", { replace: true });
        return;
      }

      if (mfaUserId) {
        toast.success("Credentials accepted. Continue with OTP login.");
        navigate(workspaceUserRoles.includes(role) ? "/user/mfa/verify" : "/admin/mfa/verify", { replace: true });
        return;
      }

      toast.error("Login response is missing the data needed to continue.");
    },
    onError: (error) => {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.detail ||
        "Unable to sign in right now. Please check your credentials.";

      toast.error(message);
    },
  });

  const onSubmit = handleSubmit((values) => {
    loginMutation.mutate({
      ...values,
      email: values.email.replace(/\s/g, ""),
    });
  });

  const isSuperAdmin = audience === "super-admin";

  return (
    <div className="w-full">
      <h1 className="mb-6 text-center text-lg font-bold tracking-tight text-slate-800 sm:mb-8 sm:text-xl">
        {isSuperAdmin ? "Hello ! Super Admin" : "Hello ! Welcome back"}
      </h1>

      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-1.5 text-left">
          <label className="text-xs font-semibold text-slate-600 pl-0.5" htmlFor={`login-email-${audience}`}>
            Email
          </label>
          <div className="relative rounded-xl border border-slate-200 bg-white/85 focus-within:bg-white focus-within:border-[#3B5BFC] focus-within:ring-2 focus-within:ring-[#3B5BFC]/15 transition-all duration-200 shadow-sm">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              id={`login-email-${audience}`}
              type="email"
              placeholder="Enter your email address"
              autoComplete="email"
              className="h-11 w-full pl-10 pr-4 rounded-xl border-0 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus-visible:ring-0 focus-visible:outline-none focus:outline-none focus:ring-0 focus:border-0 shadow-none"
              aria-invalid={Boolean(errors.email)}
              {...register("email", {
                required: "Email is required",
                pattern: {
                  value: /\S+@\S+\.\S+/,
                  message: "Enter a valid email address",
                },
                onChange: (e) => {
                  e.target.value = e.target.value.replace(/\s/g, "");
                },
              })}
            />
          </div>
          {errors.email ? <p className="text-xs text-rose-600 mt-1 pl-0.5">{errors.email.message}</p> : null}
        </div>

        <div className="space-y-1.5 text-left">
          <label className="text-xs font-semibold text-slate-600 pl-0.5" htmlFor={`login-password-${audience}`}>
            Password
          </label>
          <div className="relative rounded-xl border border-slate-200 bg-white/85 focus-within:bg-white focus-within:border-[#3B5BFC] focus-within:ring-2 focus-within:ring-[#3B5BFC]/15 transition-all duration-200 shadow-sm">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              id={`login-password-${audience}`}
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              autoComplete="current-password"
              className="h-11 w-full pl-10 pr-10 rounded-xl border-0 bg-transparent text-sm text-slate-800 placeholder:text-slate-300 focus-visible:ring-0 focus-visible:outline-none focus:outline-none focus:ring-0 focus:border-0 shadow-none"
              aria-invalid={Boolean(errors.password)}
              {...register("password", {
                required: "Password is required",
                minLength: {
                  value: 8,
                  message: "Password must be at least 8 characters",
                },
              })}
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 flex size-7 items-center justify-center text-slate-400 hover:text-[#3B5BFC] transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.password ? (
            <p className="text-xs text-rose-600 mt-1 pl-0.5">{errors.password.message}</p>
          ) : null}
        </div>

        {!isSuperAdmin ? (
          <div className="flex flex-wrap items-center justify-between gap-2 px-0.5 pt-1 text-xs select-none">
            <Link to="/forgot-password" className="font-semibold text-[#3B5BFC] hover:underline transition-colors">
              Forgot password?
            </Link>
            <Link to="/reset-mfa" className="font-semibold text-[#3B5BFC] hover:underline transition-colors">
              Reset MFA
            </Link>
          </div>
        ) : null}

        <div className="pt-2">
          <Button
            type="submit"
            className="h-11 w-full rounded-xl bg-[#3B5BFC] hover:bg-[#3B5BFC]/95 text-white text-sm font-semibold tracking-wide shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? (
              <>
                <LoaderCircle className="size-4 animate-spin" />
                Logging in...
              </>
            ) : (
              "Login"
            )}
          </Button>
        </div>

        {!isSuperAdmin ? (
          <p className="text-xs text-slate-500 text-center select-none pt-4 border-t border-slate-200/50 mt-5">
            Don't have an account?{" "}
            <Link to="/register" className="font-extrabold text-[#3B5BFC] hover:underline">
              Sign up
            </Link>
          </p>
        ) : null}
      </form>
    </div>
  );
}

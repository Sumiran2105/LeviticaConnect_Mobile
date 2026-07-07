import { Mail, UserPlus, ArrowLeft, ShieldCheck, Info } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";

const Motion = motion;

import { COMPANY_INVITE_USER } from "@/config/api";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiClient } from "@/lib/client";
import { useAuthStore } from "@/store/auth-store";
import { AdminLayout } from "@/layouts/admin-layout";

const inviteRoles = ["CLIENT", "GUEST", "USER"];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 16,
    },
  },
};

const toUserCamelCase = (str) => {
  if (!str) return "";
  const clean = str.replace(/[^a-zA-Z0-9\s]/g, "");
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join("");
};

function toToastMessage(value, fallback) {
  if (!value) {
    return fallback;
  }

  if (typeof value === "string") {
    return value.trim() || fallback;
  }

  if (Array.isArray(value)) {
    const message = value
      .map((item) => toToastMessage(item, ""))
      .filter(Boolean)
      .join(", ");

    return message || fallback;
  }

  if (typeof value === "object") {
    const message =
      value.message ??
      value.detail ??
      value.msg ??
      value.error ??
      value.data?.message ??
      value.data?.detail;

    if (message) {
      return toToastMessage(message, fallback);
    }

    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }

  return String(value);
}

export function InviteUser() {
  const navigate = useNavigate();
  const session = useAuthStore((state) => state.session);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    defaultValues: {
      email: "",
      role: "",
    },
  });

  const onSubmit = async (data) => {
    try {
      const response = await apiClient.post(COMPANY_INVITE_USER, null, {
        params: {
          email: data.email.trim(),
          role: data.role,
        },
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      });

      toast.success(toToastMessage(response.data, "User invited successfully."));
      reset();
    } catch (error) {
      toast.error(
        toToastMessage(error?.response?.data || error?.message, "Unable to invite user right now.")
      );
    }
  };

  return (
    <AdminLayout>

      <Motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="w-full space-y-6 pb-12"
      >

        <Motion.div variants={itemVariants} className="flex flex-col gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-line/60 bg-brand-soft px-3 py-1 text-[10px] font-bold text-brand-secondary w-fit">
            <UserPlus className="size-3.5 text-brand-primary" />
            <span>{toUserCamelCase("secure invitation")}</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-ink">
            {toUserCamelCase("invite new user")}
          </h1>
          <p className="max-w-2xl text-xs font-medium leading-relaxed text-brand-secondary ">
            Add a new member to your company workspace by sending them a verified invitation link.
          </p>
        </Motion.div>


        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          <Motion.div
            variants={itemVariants}
            className="lg:col-span-2 overflow-hidden rounded-[32px] border border-brand-line/45 bg-white shadow-[0_4px_12px_rgba(68,83,74,0.01)] p-6 md:p-8"
          >
            <div className="mb-6 flex items-center gap-4 border-b border-brand-line/30 pb-5">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-brand-primary/10 text-brand-primary shadow-sm border border-brand-primary/10 transition-transform hover:scale-105">
                <UserPlus className="size-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-brand-ink">{toUserCamelCase("member invitation")}</h2>
                <p className="text-[10px] font-semibold text-brand-secondary/70 lowercase">
                  secure invitation system
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                <div className="md:col-span-2 space-y-2">
                  <label
                    htmlFor="email"
                    className="flex items-center gap-2 text-xs font-bold text-brand-ink"
                  >
                    <Mail className="size-4 text-brand-primary" />
                    <span>{toUserCamelCase("user email address")}</span> <span className="text-brand-tertiary">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="email"
                      type="email"
                      {...register("email", {
                        required: "email is required.",
                        pattern: {
                          value: /^[A-Z][A-Z0-9._%+-]*@[A-Z][A-Z0-9.-]*\.[A-Z]{2,}$/i,
                          message: "please enter a valid email address.",
                        },
                      })}
                      placeholder="name@company.com"
                      className={`h-12 w-full rounded-xl border bg-[#ebf1f2]/20 px-4 text-xs font-medium transition-all focus:outline-none focus:ring-2 ${errors.email
                        ? "border-brand-tertiary/50 focus:ring-brand-tertiary/10"
                        : "border-brand-line/60 focus:border-brand-primary/30 focus:ring-brand-primary/10"
                        }`}
                    />
                    {errors.email && (
                      <p className="mt-2 text-[10px] font-bold text-brand-danger animate-in fade-in slide-in-from-top-1 lowercase">
                        {errors.email.message}
                      </p>
                    )}
                  </div>
                  {/* <p className="text-[10px] font-semibold leading-relaxed text-brand-secondary/60 lowercase">
                    the user will receive a secure link to complete their account setup.
                  </p> */}
                </div>


                <div className="md:col-span-1 space-y-2">
                  <label
                    htmlFor="role"
                    className="flex items-center gap-2 text-xs font-bold text-brand-ink"
                  >
                    <ShieldCheck className="size-4 text-brand-primary" />
                    <span>{toUserCamelCase("role")}</span> <span className="text-brand-tertiary">*</span>
                  </label>
                  <Controller
                    name="role"
                    control={control}
                    rules={{ required: "role is required." }}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger
                          id="role"
                          className={`h-12 w-full rounded-xl border bg-[#ebf1f2]/20 px-4 text-xs font-medium transition-all focus:ring-2 focus:outline-none ${errors.role
                            ? "border-brand-tertiary/50 focus:ring-brand-tertiary/10"
                            : "border-brand-line/60 focus:border-brand-primary/30 focus:ring-brand-primary/10"
                            }`}
                        >
                          <SelectValue placeholder={toUserCamelCase("select role")} />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-brand-line/60 bg-white">
                          {inviteRoles.map((role) => (
                            <SelectItem key={role} value={role} className="py-2.5 text-xs font-medium text-brand-ink focus:bg-brand-soft focus:text-brand-ink cursor-pointer">
                              {toUserCamelCase(role)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.role && (
                    <p className="mt-2 text-[10px] font-bold text-brand-tertiary animate-in fade-in slide-in-from-top-1 lowercase">
                      {errors.role.message}
                    </p>
                  )}
                  {/* <p className="text-[10px] font-semibold leading-relaxed text-brand-secondary/60 lowercase">
                    the backend accepts roles in uppercase client, guest, or user.
                  </p> */}
                </div>
              </div>


              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 rounded-xl border-brand-line px-5 text-xs font-extrabold text-brand-secondary hover:bg-brand-soft active:scale-[0.98] transition-all duration-200"
                  onClick={() => navigate("/admin/dashboard")}
                >
                  {toUserCamelCase("cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-11 rounded-xl bg-gradient-to-r from-[#1094EB] to-[#3B5BFC] hover:from-[#0082f4] hover:to-[#2563EB] text-white shadow-md border-none px-6 text-xs font-extrabold transition-all duration-200 active:scale-[0.98] disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="size-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                      <span>{toUserCamelCase("sending")}...</span>
                    </span>
                  ) : (
                    toUserCamelCase("send invitation")
                  )}
                </Button>
              </div>
            </form>
          </Motion.div>


          <div className="space-y-4 lg:col-span-1">
            <Motion.div
              variants={itemVariants}
              className="rounded-[28px] border border-brand-line/45 bg-white/50 p-6 backdrop-blur-sm shadow-[0_4px_12px_rgba(68,83,74,0.01)] hover:shadow-[0_8px_24px_rgba(68,83,74,0.03)] transition-all duration-200"
            >
              <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-white shadow-sm border border-brand-line/20">
                <ShieldCheck className="size-5 text-brand-primary" />
              </div>
              <h3 className="text-sm font-bold text-brand-ink">{toUserCamelCase("secure access")}</h3>
              <p className="mt-2 text-xs leading-relaxed text-brand-secondary font-medium lowercase">
                invited users must verify their identity and can only access their assigned company resources.
              </p>
            </Motion.div>

            <Motion.div
              variants={itemVariants}
              className="rounded-[28px] border border-brand-line/45 bg-[#EBF1F2]/20 p-6 backdrop-blur-sm shadow-[0_4px_12px_rgba(68,83,74,0.01)] hover:shadow-[0_8px_24px_rgba(68,83,74,0.03)] transition-all duration-200"
            >
              <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-white shadow-sm border border-brand-line/20">
                <Info className="size-5 text-brand-secondary" />
              </div>
              <h3 className="text-sm font-bold text-brand-ink">{toUserCamelCase("invitation expiry")}</h3>
              <p className="mt-2 text-xs leading-relaxed text-brand-secondary font-medium lowercase">
                links are single-use and expire after 24 hours for enhanced security.
              </p>
            </Motion.div>
          </div>
        </div>
      </Motion.div>
    </AdminLayout>
  );
}


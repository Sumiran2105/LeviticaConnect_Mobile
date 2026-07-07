import {
  User,
  Mail,
  Lock,
  Globe,
  LogOut,
  Camera,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { SuperAdminLayout } from "@/layouts/super-admin-layout";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function SettingsPage() {
  const [formData, setFormData] = useState({
    name: "Administrator",
    email: "superadmin@levitica.com",
    secondaryEmail: "backup@levitica.com",
    timezone: "(GMT+05:30) Mumbai, Kolkata",
    language: "English (US)",
  });

  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    setIsEditing(false);


    console.log("Saving settings:", formData);
    toast.success("Settings updated successfully!");
  };

  return (
    <SuperAdminLayout>
      <div className="mx-auto max-w-7xl space-y-8 pb-12">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-brand-ink">
              Settings & Preferences
            </h1>
            <p className="text-sm text-brand-secondary">
              Update your personal details and platform-wide configuration.
            </p>
          </div>
          <div className="flex gap-3">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  className="rounded-2xl border-brand-line px-6 h-11"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  className="rounded-2xl bg-brand-primary px-8 text-white h-11 hover:bg-brand-primary/90"
                >
                  Save Changes
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setIsEditing(true)}
                className="rounded-2xl bg-brand-primary px-8 text-white h-11 hover:bg-brand-primary/90 shadow-lg shadow-brand-primary/20"
              >
                Edit Profile
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">

          <div className="lg:col-span-2 space-y-6">
            <section className="rounded-[40px] border border-brand-line bg-white p-8 md:p-10 shadow-[0_16px_50px_rgba(68,83,74,0.06)] overflow-hidden relative">
              <div className="flex flex-col md:flex-row md:items-center gap-8 mb-10">
                <div className="relative group self-start md:self-center">
                  <Avatar className="size-24 border-4 border-brand-neutral ring-2 ring-brand-primary/20">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-brand-soft text-brand-primary text-2xl font-bold">
                      {formData.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <button className="absolute -bottom-2 -right-2 flex size-8 items-center justify-center rounded-full bg-brand-primary text-white shadow-lg transition-transform hover:scale-110 active:scale-95">
                    <Camera className="size-4" />
                  </button>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-brand-ink">Personal Information</h2>
                  <p className="text-sm text-brand-secondary mt-1">
                    Manage your identity and contact details on the platform.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-brand-secondary/60 px-1 flex items-center gap-2">
                    <User className="size-3.5 text-brand-primary" />
                    Full Name
                  </label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.name}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^a-zA-Z\s]/g, "");
                      setFormData({ ...formData, name: val });
                    }}
                    className={`h-12 w-full rounded-2xl border px-4 text-sm font-medium transition-all outline-none ${isEditing
                      ? "border-brand-primary bg-white ring-4 ring-brand-primary/5 focus:border-brand-primary"
                      : "border-brand-line bg-brand-neutral/40 text-brand-secondary"
                      }`}
                  />
                </div>


                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-brand-secondary/60 px-1 flex items-center gap-2">
                    <Mail className="size-3.5 text-brand-primary" />
                    Email Address
                  </label>
                  <input
                    type="email"
                    disabled={!isEditing}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`h-12 w-full rounded-2xl border px-4 text-sm font-medium transition-all outline-none ${isEditing
                      ? "border-brand-primary bg-white ring-4 ring-brand-primary/5 focus:border-brand-primary"
                      : "border-brand-line bg-brand-neutral/40 text-brand-secondary"
                      }`}
                  />
                </div>



                <div className={`space-y-2 ${isEditing ? "md:col-span-1" : ""}`}>
                  <label className="text-xs font-bold uppercase tracking-widest text-brand-secondary/60 px-1 flex items-center gap-2">
                    <Mail className="size-3.5 text-brand-primary/60" />
                    Backup Email
                  </label>
                  <input
                    type="email"
                    disabled={!isEditing}
                    value={formData.secondaryEmail}
                    onChange={(e) => setFormData({ ...formData, secondaryEmail: e.target.value })}
                    className={`h-12 w-full rounded-2xl border px-4 text-sm font-medium transition-all outline-none ${isEditing
                      ? "border-brand-primary bg-white ring-4 ring-brand-primary/5 focus:border-brand-primary"
                      : "border-brand-line bg-brand-neutral/40 text-brand-secondary"
                      }`}
                  />
                </div>


                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-brand-secondary/60 px-1 flex items-center gap-2">
                    <Globe className="size-3.5 text-brand-primary" />
                    Timezone
                  </label>
                  <select
                    disabled={!isEditing}
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className={`h-12 w-full rounded-2xl border px-4 text-sm font-medium transition-all outline-none appearance-none ${isEditing
                      ? "border-brand-primary bg-white ring-4 ring-brand-primary/5 focus:border-brand-primary"
                      : "border-brand-line bg-brand-neutral/40 text-brand-secondary"
                      }`}
                  >
                    <option>(GMT+05:30) Mumbai, Kolkata</option>
                    <option>(GMT+00:00) UTC</option>
                    <option>(GMT-05:00) Eastern Time</option>
                  </select>
                </div>



              </div>
            </section>

            {/* List for 5 items (Mobile view list / Desktop alternative) */}
            {/* <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-[32px] border border-emerald-100 bg-emerald-50/30 p-6 flex items-start gap-4">
                <CheckCircle2 className="size-5 text-emerald-600 mt-1 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-emerald-900 uppercase tracking-wide">Multi-factor Authentication</p>
                  <p className="text-xs text-emerald-800/70 mt-1">Your account is currently secured with biometric 2FA via mobile app.</p>
                </div>
              </div>
              <div className="rounded-[32px] border border-orange-100 bg-orange-50/30 p-6 flex items-start gap-4">
                <AlertCircle className="size-5 text-orange-600 mt-1 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-orange-900 uppercase tracking-wide">Pending Verifications</p>
                  <p className="text-xs text-orange-800/70 mt-1">Backup email verification link was sent, but not yet clicked.</p>
                </div>
              </div>
            </div> */}
          </div>

          {/* Settings Categories List (5 Cards) */}
          {/* <div className="space-y-4">
            <h3 className="px-1 text-[11px] font-bold uppercase tracking-[0.2em] text-brand-secondary/60">
              Account Categories
            </h3>
            {settingCards.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.title}
                  className="w-full group rounded-[28px] border border-brand-line bg-white p-5 text-left transition-all hover:border-brand-primary/30 hover:shadow-md hover:bg-brand-neutral/20"
                >
                  <div className="flex items-center gap-4">
                    <div className={`flex size-11 items-center justify-center rounded-2xl ${card.bg} ${card.color} transition-transform group-hover:scale-105`}>
                      <Icon className="size-5" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-brand-ink truncate">{card.title}</p>
                        <ChevronRight className="size-4 text-brand-secondary/40" />
                      </div>
                      <p className="text-xs text-brand-secondary mt-0.5 line-clamp-1">{card.description}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-end">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-primary/60">
                      {card.status}
                    </span>
                  </div>
                </button>
              );
            })}
            
            <button className="w-full flex items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50/30 py-4 text-xs font-bold text-red-600 transition-all hover:bg-red-50">
              <LogOut className="size-4" />
              Sign out from all devices
            </button>
          </div> */}
        </div>
      </div>
    </SuperAdminLayout>
  );
}

import { useMutation } from "@tanstack/react-query";
import { CalendarCheck, Menu } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { LANDING_DEMO_REQUEST } from "@/config/api";
import { apiClient } from "@/lib/client";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Features", href: "/features" },
  { label: "Plans & Pricing", href: "/plans" },
  { label: "Contact", href: "/contact" },
];

export function Header() {
  const demoRequestMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await apiClient.post(LANDING_DEMO_REQUEST, payload);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || "Demo request submitted successfully.");
    },
    onError: (error) => {
      toast.error(error?.userMessage || error?.message || "Unable to submit demo request right now.");
    },
  });

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-brand-line/70 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-10">
        <Link to="/" className="relative flex h-10 w-40 items-center transition-opacity hover:opacity-90">
          <img
            src="/assets/logo.png"
            alt="Levitica Connect"
            className="absolute left-0 top-1/2 w-36 max-w-none -translate-y-1/2 object-contain"
          />
        </Link>

        <nav className="hidden items-center gap-9 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className="text-sm font-semibold text-brand-ink/78 transition hover:text-brand-primary"
            >
              {item.label}
            </Link>
          ))}
          <RequestDemoDialog mutation={demoRequestMutation}>
            <Button
              variant="outline"
              className="h-10 rounded-full border-brand-primary/25 bg-brand-soft/60 px-5 text-sm font-semibold text-brand-primary shadow-sm hover:border-brand-primary/40 hover:bg-brand-soft"
            >
              Request Demo
            </Button>
          </RequestDemoDialog>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Button variant="ghost" className="h-11 rounded-full px-5 text-sm font-semibold text-brand-ink" asChild>
            <Link to="/login">Sign In</Link>
          </Button>
          <Button className="h-11 rounded-full bg-brand-primary px-6 text-sm font-semibold text-white shadow-lg shadow-brand-primary/20 hover:bg-brand-primary/90" asChild>
            <Link to="/register">Get Started</Link>
          </Button>
        </div>

        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full text-brand-ink hover:bg-brand-soft">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="z-50 border-l border-brand-line bg-white/95 backdrop-blur p-6 w-[300px] sm:w-[400px]">
              <SheetHeader className="mb-8 p-0">
                <SheetTitle className="text-left text-brand-ink">Levitica Connect</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-5">
                {navItems.map((item) => (
                  <Link key={item.href} to={item.href} className="text-lg font-semibold text-brand-ink">
                    {item.label}
                  </Link>
                ))}
                <RequestDemoDialog mutation={demoRequestMutation}>
                  <Button
                    variant="outline"
                    className="h-12 w-full justify-center rounded-full border-brand-primary/25 bg-brand-soft/60 px-5 font-semibold text-brand-primary hover:bg-brand-soft"
                  >
                    Request Demo
                  </Button>
                </RequestDemoDialog>
                <div className="my-2 h-px bg-brand-line" />
                <Button className="h-12 w-full justify-center rounded-full bg-brand-primary px-5 text-white" asChild>
                  <Link to="/register">Get Started</Link>
                </Button>
                <Button variant="outline" className="h-12 w-full justify-center rounded-full border-brand-line bg-white px-5" asChild>
                  <Link to="/login">Sign In</Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

function RequestDemoDialog({ children, mutation }) {
  const [open, setOpen] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    const payload = {
      name: String(formData.get("name") || "").trim(),
      company_name: String(formData.get("company_name") || "").trim(),
      employee_count: Number(formData.get("employee_count")),
      mobile_number: String(formData.get("mobile_number") || "").trim(),
      message: String(formData.get("message") || "").trim(),
    };

    try {
      await mutation.mutateAsync(payload);
      form.reset();
      setOpen(false);
    } catch {
      // The mutation toast already explains the failure; keep the form open for retry.
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[88vh] w-[calc(100vw-2rem)] overflow-y-auto rounded-[24px] border border-brand-line bg-white p-0 shadow-2xl sm:max-w-2xl">
        <DialogHeader className="border-b border-brand-line bg-brand-soft/30 px-5 py-5 text-left sm:px-8">
          <div className="mb-1 flex size-11 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
            <CalendarCheck className="size-5" />
          </div>
          <DialogTitle className="text-2xl font-bold tracking-tight text-brand-ink">Request Demo</DialogTitle>
          <DialogDescription className="text-sm leading-6 text-brand-secondary">
            Share a few details and our team will help you explore Levitica Connect for your workspace.
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-5 px-5 py-5 sm:grid-cols-2 sm:px-8 sm:py-6" onSubmit={handleSubmit}>
          <FormField id="demo-name" label="Name" placeholder="Enter your name" required />
          <FormField id="demo-company" label="Company name" placeholder="Enter company name" required />
          <FormField
            id="demo-employees"
            label="No. of employees"
            min="1"
            placeholder="How many employees?"
            required
            type="number"
          />
          <FormField id="demo-mobile" label="Mobile number" placeholder="Enter mobile number" required type="tel" />

          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="demo-message" className="text-brand-ink">
              Message
            </Label>
            <Textarea
              id="demo-message"
              name="message"
              className="min-h-28 rounded-2xl border-brand-line bg-white px-4 py-3 text-brand-ink focus-visible:ring-brand-primary"
              placeholder="Tell us what your team wants to use the application for"
              required
            />
          </div>

          <div className="flex flex-col gap-3 border-t border-brand-line pt-5 sm:col-span-2 sm:flex-row sm:items-center sm:justify-end">
            <Button
              disabled={mutation.isPending}
              type="submit"
              className="h-12 w-full rounded-full bg-brand-primary px-7 text-sm font-semibold text-white shadow-lg shadow-brand-primary/20 hover:bg-brand-primary/90 sm:w-auto"
            >
              {mutation.isPending ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FormField({ id, label, ...props }) {
  const fieldName = {
    "demo-company": "company_name",
    "demo-employees": "employee_count",
    "demo-mobile": "mobile_number",
  }[id] || id.replace("demo-", "");

  return (
    <div className="grid gap-2">
      <Label htmlFor={id} className="text-brand-ink">
        {label}
      </Label>
      <Input
        id={id}
        name={fieldName}
        className="h-12 rounded-2xl border-brand-line bg-white px-4 text-brand-ink placeholder:text-brand-secondary/50 focus-visible:border-brand-primary focus-visible:ring-brand-primary/25"
        {...props}
      />
    </div>
  );
}

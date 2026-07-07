import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Sparkles, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/config/api";
import { apiClient } from "@/lib/client";
import { motion } from "framer-motion";
import {
  fallbackPlans,
  formatPlanName,
  formatPlanPrice,
  isPopularPlan,
  normalizePlans,
  planFeatures,
} from "@/lib/billing";

const MotionDiv = motion.div;

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const itemVariants = {
  hidden: { y: 25, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 90,
      damping: 14,
    },
  },
};

export function PlansPricingSection() {
  const plansQuery = useQuery({
    queryKey: ["public-plans"],
    queryFn: async () => {
      const response = await apiClient.get(PLANS);
      return response.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const plans = normalizePlans(plansQuery.data || fallbackPlans);

  return (
    <section id="plans" className="relative overflow-hidden pt-12 lg:pt-16 pb-20 lg:pb-24 bg-white">

      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute left-[-10%] top-1/4 h-[400px] w-[400px] rounded-full bg-brand-primary/5 blur-3xl" />
        <div className="absolute right-[-10%] bottom-1/4 h-[500px] w-[500px] rounded-full bg-[#dde7ff]/70 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-10">

        <MotionDiv
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ type: "spring", stiffness: 100 }}
          className="mb-8 text-center space-y-4 max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-100 bg-white/80 px-4 py-1.5 shadow-sm backdrop-blur">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#4f46e5]">
              Pricing Strategy
            </p>
          </div>
          <h2 className="text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-[52px]">
            Simple, transparent pricing<br />for teams of all sizes.
          </h2>
          <p className="text-base text-slate-500 max-w-2xl mx-auto font-medium">
            Empower your organization with enterprise-grade collaboration tools. Start for free and scale as you grow with flexible monthly or annual plans.
          </p>
        </MotionDiv>

        <MotionDiv
          initial={{ y: 15, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="mb-10 flex items-center justify-center gap-2"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#4f46e5] shadow-sm">
            Live Plans
          </span>
        </MotionDiv>

        <MotionDiv
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid gap-8 lg:grid-cols-3 mb-16 items-stretch"
        >
          {plans.map((plan) => {
            const popular = isPopularPlan(plan, plans);

            return (
              <MotionDiv
                key={plan.id}
                variants={itemVariants}
                whileHover={{ y: -8 }}
                className={`relative flex flex-col justify-between rounded-[32px] bg-white p-8 shadow-sm transition duration-300 hover:shadow-xl md:p-10 ${
                  popular ? "border-2 border-[#4f46e5] shadow-xl" : "border border-slate-200/60 bg-white/90 backdrop-blur-sm"
                }`}
              >
                {popular ? (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#4f46e5] px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow-sm">
                    Most Popular
                  </div>
                ) : null}

                <div>
                  <p className="text-xl font-bold text-slate-900">{formatPlanName(plan.name)}</p>
                  <p className="mt-2 text-sm font-medium text-slate-500">
                    Scale with {formatPlanName(plan.name)} capacity managed directly by the platform team.
                  </p>

                  <div className="mt-6 flex items-baseline">
                    <span className="text-4xl font-extrabold text-slate-900">{formatPlanPrice(plan)}</span>
                    <span className="ml-1 text-sm font-semibold text-slate-400">/{plan.duration_days} days</span>
                  </div>
                  <p className={`mt-1.5 text-xs font-bold uppercase tracking-wide ${popular ? "text-[#4f46e5]" : "text-slate-400"}`}>
                    {plan.price === 0 ? "Free plan" : `Billed in ${plan.currency}`}
                  </p>

                  <div className="mt-8 space-y-4">
                    {planFeatures(plan).map((feature) => (
                      <div key={feature} className="flex items-start gap-3 text-sm font-semibold text-slate-700">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#4f46e5]" />
                        <span>{feature}</span>
                      </div>
                    ))}
                    {popular ? (
                      <div className="flex items-start gap-3 text-sm font-bold text-slate-800">
                        <Sparkles className="mt-0.5 size-4 shrink-0 text-[#4f46e5]" />
                        <span>Priority collaboration capacity</span>
                      </div>
                    ) : null}
                  </div>
                </div>

                <Button
                  className={`mt-10 h-12 w-full rounded-full font-bold ${
                    popular
                      ? "bg-[#4f46e5] text-white shadow-lg shadow-indigo-600/10 hover:bg-[#4338ca]"
                      : "border border-slate-200 bg-white text-[#4f46e5] shadow-none hover:bg-slate-50"
                  }`}
                  asChild
                >
                  <Link to="/register">{plan.price === 0 ? "Get Started" : "Choose Plan"}</Link>
                </Button>
              </MotionDiv>
            );
          })}

        </MotionDiv>

        {/* <MotionDiv
          initial={{ y: 30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ type: "spring", stiffness: 80, damping: 15 }}
          className="mt-16 space-y-8"
        >

          <div className="text-center space-y-2.5 max-w-2xl mx-auto">
            <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">Compare Features</h3>
            <p className="text-sm text-slate-500 font-semibold leading-relaxed">
              A deep dive into everything you get with Levitica.
            </p>
          </div>

          <div className="overflow-x-auto rounded-[24px] border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[640px] text-left border-collapse text-xs select-none">

              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50 text-slate-500 font-bold">
                  <th className="py-4 px-6 w-[40%] text-slate-900 font-extrabold">Features</th>
                  <th className="py-4 px-6 w-[20%] text-slate-900 font-extrabold text-center">Starter</th>
                  <th className="py-4 px-6 w-[20%] text-[#4f46e5] font-extrabold text-center">Pro</th>
                  <th className="py-4 px-6 w-[20%] text-slate-900 font-extrabold text-center">Enterprise</th>
                </tr>
              </thead>

              <tbody>

                <tr className="bg-slate-50/50 text-[#4f46e5] font-extrabold text-[9px] uppercase tracking-widest border-b border-slate-100">
                  <td colSpan={4} className="py-3 px-6">Messaging & Collaboration</td>
                </tr>
                <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors duration-250">
                  <td className="py-3.5 px-6 font-semibold text-slate-900">Message History</td>
                  <td className="py-3.5 px-6 text-slate-500 text-center font-semibold">90 Days</td>
                  <td className="py-3.5 px-6 text-slate-900 text-center font-bold">Unlimited</td>
                  <td className="py-3.5 px-6 text-slate-900 text-center font-bold">Unlimited</td>
                </tr>
                <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors duration-250">
                  <td className="py-3.5 px-6 font-semibold text-slate-900">File Storage</td>
                  <td className="py-3.5 px-6 text-slate-500 text-center font-semibold">5GB total</td>
                  <td className="py-3.5 px-6 text-slate-900 text-center font-bold">50GB / user</td>
                  <td className="py-3.5 px-6 text-slate-900 text-center font-bold">Unlimited</td>
                </tr>

                <tr className="bg-slate-50/50 text-[#4f46e5] font-extrabold text-[9px] uppercase tracking-widest border-b border-slate-100">
                  <td colSpan={4} className="py-3 px-6 mt-4">Meetings</td>
                </tr>
                <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors duration-250">
                  <td className="py-3.5 px-6 font-semibold text-slate-900">Max Participants</td>
                  <td className="py-3.5 px-6 text-slate-500 text-center font-semibold">2 participants</td>
                  <td className="py-3.5 px-6 text-slate-900 text-center font-bold">Up to 100</td>
                  <td className="py-3.5 px-6 text-slate-900 text-center font-bold">Up to 1,000</td>
                </tr>
                <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors duration-250">
                  <td className="py-3.5 px-6 font-semibold text-slate-900">Screen Sharing</td>
                  <td className="py-3.5 px-6 text-center">
                    <Check className="size-4 text-[#4f46e5] mx-auto stroke-[2.5]" />
                  </td>
                  <td className="py-3.5 px-6 text-center">
                    <Check className="size-4 text-[#4f46e5] mx-auto stroke-[2.5]" />
                  </td>
                  <td className="py-3.5 px-6 text-center">
                    <Check className="size-4 text-[#4f46e5] mx-auto stroke-[2.5]" />
                  </td>
                </tr>

                <tr className="bg-slate-50/50 text-[#4f46e5] font-extrabold text-[9px] uppercase tracking-widest border-b border-slate-100">
                  <td colSpan={4} className="py-3 px-6 mt-4">AI-Driven Features</td>
                </tr>
                <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors duration-250">
                  <td className="py-3.5 px-6 font-semibold text-slate-900">Meeting Summaries</td>
                  <td className="py-3.5 px-6 text-slate-350 text-center font-bold">—</td>
                  <td className="py-3.5 px-6 text-center">
                    <Check className="size-4 text-[#4f46e5] mx-auto stroke-[2.5]" />
                  </td>
                  <td className="py-3.5 px-6 text-center">
                    <Check className="size-4 text-[#4f46e5] mx-auto stroke-[2.5]" />
                  </td>
                </tr>
                <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors duration-250">
                  <td className="py-3.5 px-6 font-semibold text-slate-900">Workflow Automation</td>
                  <td className="py-3.5 px-6 text-slate-350 text-center font-bold">—</td>
                  <td className="py-3.5 px-6 text-slate-700 text-center font-bold">Basic</td>
                  <td className="py-3.5 px-6 text-[#4f46e5] text-center font-bold">Advanced AI</td>
                </tr>

                <tr className="bg-slate-50/50 text-[#4f46e5] font-extrabold text-[9px] uppercase tracking-widest border-b border-slate-100">
                  <td colSpan={4} className="py-3 px-6 mt-4">Security & Admin</td>
                </tr>
                <tr className="hover:bg-slate-50/50 transition-colors duration-250">
                  <td className="py-3.5 px-6 font-semibold text-slate-900">SSO (SAML/OIDC)</td>
                  <td className="py-3.5 px-6 text-slate-350 text-center font-bold">—</td>
                  <td className="py-3.5 px-6 text-slate-350 text-center font-bold">—</td>
                  <td className="py-3.5 px-6 text-center">
                    <Check className="size-4 text-[#4f46e5] mx-auto stroke-[2.5]" />
                  </td>
                </tr>

              </tbody>

            </table>
          </div>

        </MotionDiv> */}

      </div>
    </section>
  );
}

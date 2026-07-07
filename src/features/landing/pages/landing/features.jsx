import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  FolderLock,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Users,
  Video,
} from "lucide-react";

const Motion = motion;
const MotionLink = motion(Link);

const featuresList = [
  {
    slug: "intelligent-messaging",
    title: "Intelligent Messaging",
    description: "Stay connected with real-time chat, structured threads, and AI-suggested quick replies designed to keep work flowing.",
    icon: MessageSquareText,
    colorClass: "bg-indigo-50/80 text-indigo-600 border border-indigo-100/50",
    glowBg: "bg-indigo-500/10",
    borderColor: "group-hover:border-indigo-500/30",
    linkColor: "text-indigo-600 hover:text-indigo-700",
  },
  {
    slug: "enterprise-mfa",
    title: "Enterprise MFA",
    description: "Secure your entire organization with multi-factor authentication, including SMS, authenticator apps, and biometric login.",
    icon: ShieldCheck,
    colorClass: "bg-emerald-50/80 text-emerald-600 border border-emerald-100/50",
    glowBg: "bg-emerald-500/10",
    borderColor: "group-hover:border-emerald-500/30",
    linkColor: "text-emerald-600 hover:text-emerald-700",
  },
  {
    slug: "ai-powered-tools",
    title: "AI-Powered Tools",
    description: "Instantly translate messages, auto-summarize long threads, and find answers quickly with a powerful AI search engine.",
    icon: Sparkles,
    colorClass: "bg-purple-50/80 text-purple-600 border border-purple-100/50",
    glowBg: "bg-purple-500/10",
    borderColor: "group-hover:border-purple-500/30",
    linkColor: "text-purple-600 hover:text-purple-700",
  },
  {
    slug: "teams-and-communities",
    title: "Teams & Communities",
    description: "Create public or private spaces for teams and divisions, fostering aligned collaboration and connected workforces.",
    icon: Users,
    colorClass: "bg-rose-50/80 text-rose-600 border border-rose-100/50",
    glowBg: "bg-rose-500/10",
    borderColor: "group-hover:border-rose-500/30",
    linkColor: "text-rose-600 hover:text-rose-700",
  },
  {
    slug: "secure-file-sharing",
    title: "Secure File Sharing",
    description: "Share large files seamlessly across chats and spaces under real-time automated protection from malware and viruses.",
    icon: FolderLock,
    colorClass: "bg-amber-50/80 text-amber-600 border border-amber-100/50",
    glowBg: "bg-amber-500/10",
    borderColor: "group-hover:border-amber-500/30",
    linkColor: "text-amber-600 hover:text-amber-700",
  },
  {
    slug: "hd-collaborative-video",
    title: "HD Collaborative Video",
    description: "Host zero-lag, crystal-clear meetings with real-time meetings, interactive screen sharing, and automatic transcripts.",
    icon: Video,
    colorClass: "bg-cyan-50/80 text-cyan-600 border border-cyan-100/50",
    glowBg: "bg-cyan-500/10",
    borderColor: "group-hover:border-cyan-500/30",
    linkColor: "text-cyan-600 hover:text-cyan-700",
  },
];

export function FeaturesSection() {
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30, filter: "blur(2px)" },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: {
        type: "spring",
        stiffness: 85,
        damping: 14,
      },
    },
    hover: {
      y: -8,
      scale: 1.015,
      transition: {
        type: "spring",
        stiffness: 120,
        damping: 15,
      },
    },
  };

  const iconVariants = {
    hover: {
      scale: 1.1,
      rotate: [0, -6, 6, 0],
      transition: {
        duration: 0.45,
        ease: "easeInOut",
      },
    },
  };

  const arrowVariants = {
    hover: {
      x: 4,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 8,
      },
    },
  };

  const headerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.7,
        ease: "easeOut",
      },
    },
  };

  return (
    <section id="features" className="relative overflow-hidden pt-8 lg:pt-12 pb-20 lg:pb-24 bg-white">

      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-brand-primary/5 blur-3xl" />
        <div className="absolute -right-24 top-16 h-96 w-96 rounded-full bg-indigo-500/5 blur-3xl" />
        <div className="absolute left-8 bottom-16 h-96 w-96 rounded-full bg-blue-500/5 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-10">
        {/* Section Header */}
        <Motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={headerVariants}
          className="mb-16 text-center space-y-4 max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/70 px-4 py-1.5 shadow-sm backdrop-blur">
            <div className="size-2 rounded-full bg-indigo-600 animate-pulse" />
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-indigo-600">
              Core Capabilities
            </p>
          </div>
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Everything you need to scale.
          </h2>
          <p className="text-base text-slate-500 max-w-2xl mx-auto font-medium sm:text-lg">
            A suite of intelligent tools designed to remove friction from your daily operations.
          </p>
        </Motion.div>

        {/* 3x2 Grid for 6 cards */}
        <Motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10"
        >
          {featuresList.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <MotionLink
                key={idx}
                to={`/features/${feature.slug}`}
                variants={cardVariants}
                whileHover="hover"
                whileTap={{ scale: 0.985 }}
                className="group relative flex flex-col justify-between overflow-hidden rounded-[32px] border border-slate-200/50 bg-white/95 p-8 md:p-10 shadow-sm backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:border-transparent cursor-pointer"
              >
                {/* Colored Glow on Hover */}
                <div className={`absolute -right-20 -bottom-20 size-48 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none ${feature.glowBg}`} />

                <div className="relative z-10">
                  {/* Icon */}
                  <Motion.div
                    variants={iconVariants}
                    className={`mb-8 flex size-12 items-center justify-center rounded-[18px] ${feature.colorClass} shadow-sm`}
                  >
                    <Icon className="size-5" />
                  </Motion.div>

                  {/* Title */}
                  <h3 className="mb-3 text-xl font-bold text-slate-900 tracking-tight transition-colors duration-300 group-hover:text-indigo-600">
                    {feature.title}
                  </h3>

                  {/* Description */}
                  <p className="mb-8 text-sm leading-relaxed text-slate-500 font-medium">
                    {feature.description}
                  </p>
                </div>

                {/* Link */}
                <div className="relative z-10">
                  <div
                    className={`inline-flex items-center gap-1.5 text-sm font-semibold transition-all duration-300 ${feature.linkColor}`}
                  >
                    <span>Learn more</span>
                    <Motion.span variants={arrowVariants} className="inline-flex items-center">
                      <ArrowRight className="size-4" />
                    </Motion.span>
                  </div>
                </div>
              </MotionLink>
            );
          })}
        </Motion.div>
      </div>
    </section>
  );
}

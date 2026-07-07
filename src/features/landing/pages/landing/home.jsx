import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Globe,
  MessageSquareText,
  Phone,
  ShieldCheck,
  Sparkles,
  Users,
  Video,
  Bell,
  Calendar,
  Search,
  Menu,
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const MotionDiv = motion.div;
const MotionH1 = motion.h1;
const MotionP = motion.p;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 16,
    },
  },
};

const laptopVariants = {
  hidden: { opacity: 0, scale: 0.96, x: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: 80,
      damping: 16,
      delay: 0.15,
    },
  },
};

const phoneVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.92, rotate: -2 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    rotate: 0,
    transition: {
      type: "spring",
      stiffness: 90,
      damping: 14,
      delay: 0.5,
    },
  },
};

export function HomeSection() {
  return (
    <section id="home" className="relative overflow-hidden bg-white px-6 pb-2 pt-[72px] lg:px-10">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -left-24 top-16 h-96 w-96 rounded-full bg-brand-primary/10 blur-3xl" />
        <div className="absolute right-8 top-28 h-[30rem] w-[30rem] rounded-full bg-[#dde7ff]/80 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-white/70 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.76fr)] xl:gap-16 pt-8 lg:pt-14 pb-12 lg:pb-16">
        <MotionDiv
          className="relative max-w-3xl"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Badge */}
          <MotionDiv
            variants={itemVariants}
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/10 px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider text-blue-600 shadow-sm backdrop-blur"
          >
            <Users className="size-4 text-blue-500" />
            <span>Work better together</span>
          </MotionDiv>

          {/* Heading */}
          <MotionH1
            variants={itemVariants}
            className="max-w-4xl text-4xl font-extrabold leading-[1.08] tracking-tight text-[#111827] sm:text-5xl lg:text-6xl"
          >
            One workspace <br />
            for every team. <br />
            <span className="bg-gradient-to-r from-purple-600 via-indigo-500 to-blue-600 bg-clip-text text-transparent">
              Unlimited impact.
            </span>
          </MotionH1>

          {/* Feature Grid Columns */}
          <MotionDiv
            variants={containerVariants}
            className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-8 max-w-3xl"
          >
            {[
              { title: "Chat", desc: "Instant messaging that keeps everyone in the loop.", icon: MessageSquareText, color: "text-blue-600 bg-blue-50/40 border-blue-100" },
              { title: "Meet", desc: "High-quality video meetings, from anywhere.", icon: Video, color: "text-emerald-600 bg-emerald-50/40 border-emerald-100" },
              { title: "Collaborate", desc: "Teams, files, and more work together in real time.", icon: Users, color: "text-purple-600 bg-purple-50/40 border-purple-100" },
              { title: "Stay informed", desc: "Announcements and updates that reach everyone.", icon: Bell, color: "text-amber-600 bg-amber-50/40 border-amber-100" },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <MotionDiv
                  key={idx}
                  variants={itemVariants}
                  className="group flex flex-col text-left -m-3.5 p-3.5 border border-transparent rounded-2xl transition-all duration-300 hover:bg-slate-50/60 hover:border-slate-100/80 hover:shadow-[0_12px_24px_rgba(148,163,184,0.03)] hover:-translate-y-1 cursor-pointer"
                >
                  <div className={`w-24 h-8 rounded-full flex items-center justify-center ${item.color} mb-3.5 shadow-sm border transition-all duration-300 group-hover:scale-105 group-hover:shadow-md`}>
                    <Icon className="size-5" />
                  </div>
                  <h3 className="text-[15.5px] font-extrabold text-slate-900 leading-snug transition-colors duration-300 group-hover:text-blue-600">{item.title}</h3>
                  <p className="text-[13px] leading-relaxed text-slate-500 font-medium mt-1.5">{item.desc}</p>
                </MotionDiv>
              );
            })}
          </MotionDiv>

          {/* Description Paragraph */}
          <MotionP
            variants={itemVariants}
            className="mt-8 max-w-2xl text-base sm:text-lg font-semibold leading-relaxed sm:leading-8 text-[#596073]"
          >
            Streamline communication, simplify workflows, and empower your teams to achieve more together.
          </MotionP>

          {/* CTA Buttons */}
          <MotionDiv
            variants={itemVariants}
            className="mt-6 flex flex-wrap gap-4 items-center"
          >
            <Link
              to="/register"
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 hover:shadow-blue-700/30 transition-all duration-200 active:scale-[0.98] gap-2 group hover:scale-[1.02]"
            >
              <span>Get started for free</span>
              <ArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            
            <Link
              to="/contact"
              className="inline-flex items-center justify-center rounded-xl bg-white border border-slate-200 px-6 py-3.5 text-sm font-bold text-blue-600 shadow-sm hover:bg-slate-50 transition-all duration-200 active:scale-[0.98] hover:scale-[1.02]"
            >
              <span>Book a demo</span>
            </Link>
          </MotionDiv>
        </MotionDiv>

        <div className="relative z-30 flex items-center justify-center lg:justify-end xl:pr-4 w-full max-w-[580px] lg:max-w-none ml-auto mt-24 sm:mt-20 lg:mt-0">
         
          <div className="absolute right-2 top-10 hidden h-48 w-48 rounded-full bg-[#4f46e5]/12 blur-3xl lg:block" />
          <div className="absolute bottom-16 right-20 hidden h-56 w-56 rounded-full bg-white/80 blur-3xl lg:block" />

        
          <div className="relative w-full max-w-[580px] md:max-w-[640px] lg:max-w-[660px] xl:max-w-[700px] aspect-[16/10] pl-6 sm:pl-10 md:pl-12 lg:pl-16">
            
           
            <MotionDiv
              variants={laptopVariants}
              initial="hidden"
              animate="visible"
              className="relative w-full aspect-[16/10] bg-slate-950 border-[8px] border-slate-900 rounded-t-2xl shadow-[0_20px_50px_rgba(0,0,0,0.25)] overflow-hidden flex flex-col z-10"
            >
              <div className="flex-1 flex overflow-hidden text-[5.5px] sm:text-[6.5px] md:text-[7px] leading-tight select-none bg-[linear-gradient(180deg,_#f6f6ff_0%,_#eef3ef_38%,_#f6f6ff_100%)]">
                
                {/* Dashboard Sidebar */}
                <div className="w-[36px] bg-[#f0f4f5] border-r border-slate-200/60 flex flex-col items-center py-2 shrink-0 justify-between">
                  <div className="flex flex-col items-center w-full gap-2">
                    {/* Logo */}
                    <img
                      src="/assets/logo.png"
                      alt="Levitica Connect"
                      className="size-4.5 rounded-md object-contain mb-1 shadow-sm"
                    />
                    {/* Sidebar Items */}
                    <div className="w-full flex flex-col items-center gap-1">
                      {[
                        { icon: MessageSquareText, active: true },
                        { icon: Globe },
                        { icon: Video },
                        { icon: Users },
                        { icon: Building2 },
                        { icon: ArrowRight },
                        { icon: Calendar },
                        { icon: Bell },
                        { icon: Sparkles },
                      ].map((item, idx) => {
                        const Icon = item.icon;
                        return (
                          <div
                            key={idx}
                            className={`relative size-4.5 flex items-center justify-center rounded-md w-[80%] ${
                              item.active
                                ? "bg-indigo-600/10 text-indigo-600"
                                : "text-slate-400 hover:text-slate-600"
                            }`}
                          >
                            {item.active && (
                              <div className="absolute left-0 top-1 h-2.5 w-0.5 rounded-r bg-indigo-600" />
                            )}
                            <Icon className="size-2.5" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Dashboard Main View */}
                <div className="flex-1 bg-slate-50 flex flex-col overflow-hidden">
                  
                  {/* Dashboard Header */}
                  <div className="h-6.5 border-b border-slate-200/50 bg-white/95 backdrop-blur px-2.5 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <img src="/assets/logo.png" alt="Levitica Connect" className="size-3.5 object-contain" />
                      <span className="font-extrabold text-slate-800 text-[6px] tracking-tight">Levitica Connect</span>
                    </div>
                    
                    <div className="h-4.5 w-24 rounded bg-slate-100/60 border border-slate-200/30 flex items-center px-1.5 gap-1 text-[5px] text-slate-400 mx-2">
                      <Search className="size-2 text-slate-300" />
                      <span className="truncate">Search...</span>
                    </div>
                    
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Bell className="size-2.5 text-slate-400" />
                      <div className="h-3 w-px bg-slate-200" />
                      <div className="flex items-center gap-1">
                        <div className="text-right leading-none">
                          <p className="text-[5px] font-extrabold text-slate-700">Alex</p>
                          <span className="text-[3.5px] text-slate-400 font-bold">Offline</span>
                        </div>
                        <div className="size-4 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[4.5px] font-extrabold shadow-sm">
                          A
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dashboard Body */}
                  <div className="flex-1 p-2.5 space-y-2.5 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    
                    {/* Welcome Card */}
                    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#0f172a] p-2.5 text-white shadow-sm flex flex-col gap-1 shrink-0 border border-indigo-500/15">
                      <div className="absolute right-0 top-0 -mr-4 -mt-4 size-16 rounded-full bg-indigo-500/15 blur-xl animate-pulse" />
                      <div className="absolute bottom-0 left-0 -ml-4 -mb-4 size-16 rounded-full bg-blue-500/15 blur-xl animate-pulse" />

                      <div className="relative z-10 flex items-center justify-between">
                        <div className="inline-flex items-center gap-0.5 rounded-full bg-white/10 px-1 py-0.25 text-[4px] font-extrabold tracking-wider text-indigo-200 backdrop-blur-sm">
                          <Sparkles className="size-1.5 text-indigo-300" />
                          User Workspace
                        </div>
                        <div className="text-[3.8px] font-bold text-indigo-200/80">
                          Wednesday, Jun 17
                        </div>
                      </div>

                      <div className="relative z-10 space-y-0.5 mt-0.5">
                        <h2 className="text-[8px] font-extrabold leading-tight">
                          Good Afternoon, <span className="bg-gradient-to-r from-blue-300 to-indigo-200 bg-clip-text text-transparent">Alex</span> ✨
                        </h2>
                        {/* <p className="text-[4.5px] leading-normal text-slate-300">
                          Welcome to Levitica Connect. Here is a snapshot of your digital workspace. Jump straight into active chats.
                        </p> */}
                      </div>
                    </div>

                    {/* Workspace Modules, Joined Teams, Departments, Meetings */}
                    <div className="grid grid-cols-3 gap-2.5 items-stretch">
                      
                      {/* Left side taking 2 cols */}
                      <div className="col-span-2 space-y-2.5 flex flex-col">
                        
                        {/* Workspace Modules */}
                        <div className="space-y-1">
                          <h3 className="text-[4.5px] font-extrabold tracking-wider text-indigo-600/85 uppercase">
                            Workspace Modules
                          </h3>
                          <div className="grid grid-cols-5 gap-1">
                            {[
                              { title: "Chat", badge: "DMs", icon: MessageSquareText, bg: "bg-blue-50/70 text-blue-600 border border-blue-100/30" },
                              { title: "Meet", badge: "Instant", icon: Video, bg: "bg-violet-50/70 text-violet-600 border border-violet-100/30" },
                              { title: "Files", badge: "Cloud", icon: ArrowRight, bg: "bg-emerald-50/70 text-emerald-600 border border-emerald-100/30" },
                              { title: "Calendar", badge: "Daily", icon: Calendar, bg: "bg-rose-50/70 text-rose-600 border border-rose-100/30" },
                              { title: "Depts", badge: "Divisions", icon: Building2, bg: "bg-amber-50/70 text-amber-600 border border-amber-100/30" },
                            ].map((mod, i) => {
                              const Icon = mod.icon;
                              return (
                                <div key={i} className="flex flex-col items-center justify-center text-center bg-white/90 backdrop-blur-sm border border-slate-200/40 rounded-xl p-1 shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:-translate-y-0.5 transition-all duration-200">
                                  <div className={`rounded-lg p-0.5 ${mod.bg} mb-1`}>
                                    <Icon className="size-2" />
                                  </div>
                                  <span className="text-[3.8px] font-extrabold text-slate-800 leading-none">{mod.title}</span>
                                  <span className="text-[3px] text-slate-400 font-bold leading-none mt-0.5">{mod.badge}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Teams and Departments */}
                        <div className="grid grid-cols-2 gap-2 flex-1">
                          
                          {/* Joined Teams */}
                          <div className="bg-white/90 backdrop-blur-sm border border-slate-200/40 rounded-xl p-1.5 flex flex-col justify-between shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
                            <div>
                              <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                                <span className="text-[4.5px] font-extrabold text-slate-800 flex items-center gap-0.5">
                                  <Users className="size-1.5 text-indigo-500" /> Joined Teams
                                </span>
                                <span className="text-[3px] font-extrabold text-indigo-600 bg-indigo-50 px-1 py-0.25 rounded">3 Channels</span>
                              </div>
                              <div className="mt-1 space-y-1">
                                {[
                                  { name: "HRMS", desc: "Workspace channel" },
                                  { name: "Levitica connect", desc: "Workspace channel" },
                                  { name: "Training Team 15", desc: "Workspace channel" }
                                ].map((team, idx) => (
                                  <div key={idx} className="flex items-center gap-1 p-0.5 hover:bg-slate-50 rounded-md transition-colors duration-150">
                                    <div className="size-3 bg-indigo-50 text-indigo-600 rounded flex items-center justify-center text-[3.8px] font-bold">#</div>
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-[3.8px] font-extrabold text-slate-800 leading-none">{team.name}</p>
                                      <p className="truncate text-[3px] text-slate-400 font-bold leading-none">{team.desc}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Departments */}
                          <div className="bg-white/90 backdrop-blur-sm border border-slate-200/40 rounded-xl p-1.5 flex flex-col justify-between shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
                            <div>
                              <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                                <span className="text-[4.5px] font-extrabold text-slate-800 flex items-center gap-0.5">
                                  <Building2 className="size-1.5 text-amber-500" /> Departments
                                </span>
                                <span className="text-[3px] font-extrabold text-amber-600 bg-amber-50 px-1 py-0.25 rounded">1 Member</span>
                              </div>
                              <div className="mt-1 space-y-1">
                                <div className="flex items-center gap-1 p-0.5 hover:bg-slate-50 rounded-md transition-colors duration-150">
                                  <div className="size-3 bg-amber-50 text-amber-600 rounded flex items-center justify-center text-[3.8px] font-bold">D</div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-[3.8px] font-extrabold text-slate-800 leading-none">Frontend</p>
                                    <p className="truncate text-[3px] text-slate-400 font-bold leading-none">USER • 6 members</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                        </div>
                      </div>

                      {/* Right side taking 1 col */}
                      <div className="col-span-1 flex flex-col bg-white/90 backdrop-blur-sm border border-slate-200/40 rounded-xl p-1.5 justify-between shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
                        <div>
                          <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                            <span className="text-[4.5px] font-extrabold text-slate-800 flex items-center gap-0.5">
                              <Calendar className="size-1.5 text-brand-primary" /> Meetings
                            </span>
                            <span className="text-[3px] font-bold text-slate-400 bg-slate-100 px-1 py-0.25 rounded">Schedule</span>
                          </div>
                          
                          <div className="py-2.5 flex flex-col items-center justify-center text-center">
                            <Calendar className="size-4.5 text-slate-300 animate-bounce" />
                            <p className="text-[4.5px] font-extrabold text-slate-700 mt-1 leading-none font-bold">No meetings</p>
                            <p className="text-[3.5px] text-slate-400 font-bold mt-0.5 leading-none">Your schedule is clear</p>
                          </div>
                        </div>

                        <div className="w-full bg-slate-900 text-white rounded-lg p-0.75 text-[3.8px] font-extrabold flex items-center justify-center gap-0.5 cursor-pointer mt-1 hover:bg-slate-800 transition-colors shadow-sm active:scale-[0.98]">
                          <Video className="size-1.5" /> Start Instant Meeting
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </MotionDiv>

            <div className="relative w-[108%] -ml-[4%] h-2.5 bg-slate-300 border-b-2 border-slate-400 rounded-b-lg shadow-xl shrink-0 z-10" />

          
            <MotionDiv
              variants={phoneVariants}
              initial="hidden"
              animate="visible"
              className="absolute -left-6 sm:-left-3 md:left-0 lg:left-2 bottom-3.5 z-20 w-[150px] sm:w-[170px] md:w-[185px] h-[290px] sm:h-[330px] md:h-[360px] bg-slate-950 border-[5px] sm:border-[6px] border-slate-900 rounded-[28px] sm:rounded-[32px] shadow-[5px_15px_40px_rgba(0,0,0,0.35)] overflow-hidden flex flex-col"
            >
              
           
              <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-12 sm:w-14 h-3 sm:h-3.5 bg-black rounded-full z-40 flex items-center justify-between px-1.5">
                <div className="size-1 rounded-full bg-white/10" />
                <div className="size-1 rounded-full bg-indigo-500/80" />
              </div>

            
              <div className="flex-1 flex flex-col justify-between bg-slate-50 pt-5 sm:pt-6 text-[7px] sm:text-[8px] leading-tight select-none">
                
                {/* Mobile Header */}
                <div className="h-6.5 border-b border-slate-200/50 bg-white px-2 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-1">
                    <img
                      src="/assets/logo.png"
                      alt="Levitica Connect"
                      className="size-3 rounded object-contain shadow-sm"
                    />
                    <span className="font-extrabold text-slate-800 text-[5.5px] tracking-tight">Levitica Connect</span>
                  </div>
                  <Menu className="size-2.5 text-slate-500" />
                </div>

                {/* Mobile Scrollable Content */}
                <div className="flex-1 p-2 space-y-2 overflow-y-auto bg-slate-50 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  
                  {/* Welcome Card */}
                  <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-2 text-white shadow-sm flex flex-col gap-0.5 shrink-0">
                    <div className="absolute right-0 top-0 -mr-3 -mt-3 size-12 rounded-full bg-indigo-500/10 blur-lg" />
                    <div className="absolute bottom-0 left-0 -ml-3 -mb-3 size-12 rounded-full bg-blue-500/10 blur-lg" />

                    <div className="relative z-10 flex items-center justify-between">
                      <div className="inline-flex items-center gap-0.5 rounded-full bg-white/10 px-1 py-0.25 text-[3.5px] font-bold text-indigo-200">
                        <Sparkles className="size-1 text-indigo-300" />
                        Workspace
                      </div>
                      <div className="text-[3.5px] font-bold text-indigo-200/80">
                        Jun 17
                      </div>
                    </div>

                    <div className="relative z-10 mt-0.5">
                      <h2 className="text-[6.5px] font-extrabold leading-tight">
                        Good Afternoon, <span className="bg-gradient-to-r from-blue-300 to-indigo-200 bg-clip-text text-transparent">Alex</span> ✨
                      </h2>
                      {/* <p className="text-[4px] leading-normal text-slate-300 mt-0.25">
                        Welcome to Levitica Connect. Here is a snapshot of your workspace.
                      </p> */}
                    </div>
                  </div>

                  {/* Modules */}
                  <div className="space-y-0.75">
                    <h3 className="text-[4px] font-extrabold tracking-wider text-indigo-600/85 uppercase">
                      Modules
                    </h3>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { title: "Chat", icon: MessageSquareText, bg: "bg-blue-50 text-blue-600 border border-blue-100/50" },
                        { title: "Meet", icon: Video, bg: "bg-violet-50 text-violet-600 border border-violet-100/50" },
                        { title: "Files", icon: ArrowRight, bg: "bg-emerald-50 text-emerald-600 border border-emerald-100/50" },
                      ].map((mod, i) => {
                        const Icon = mod.icon;
                        return (
                          <div key={i} className="flex flex-col items-center justify-center text-center bg-white border border-slate-200/55 rounded p-1">
                            <div className={`rounded p-0.5 ${mod.bg} mb-0.5`}>
                              <Icon className="size-1.5" />
                            </div>
                            <span className="text-[3.5px] font-extrabold text-slate-800 leading-none">{mod.title}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Joined Teams */}
                  <div className="bg-white border border-slate-200/55 rounded p-1.5 flex flex-col">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-0.75">
                      <span className="text-[4px] font-extrabold text-slate-800 flex items-center gap-0.5">
                        <Users className="size-1.5 text-indigo-500" /> Joined Teams
                      </span>
                      <span className="text-[3px] font-extrabold text-indigo-600 bg-indigo-50 px-0.75 rounded">3</span>
                    </div>
                    <div className="mt-1 space-y-0.75">
                      {[
                        { name: "HRMS" },
                        { name: "Levitica connect" },
                        { name: "Training Team 15" }
                      ].map((team, idx) => (
                        <div key={idx} className="flex items-center gap-0.75 p-0.5 hover:bg-slate-50 rounded">
                          <div className="size-3 bg-indigo-50 text-indigo-600 rounded flex items-center justify-center text-[3.5px] font-bold">#</div>
                          <p className="truncate text-[3.8px] font-extrabold text-slate-800 leading-none">{team.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Meetings */}
                  <div className="bg-white border border-slate-200/55 rounded p-1.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-0.75">
                      <span className="text-[4px] font-extrabold text-slate-800 flex items-center gap-0.5">
                        <Calendar className="size-1.5 text-brand-primary" /> Meetings
                      </span>
                    </div>
                    <div className="py-1.5 flex flex-col items-center justify-center text-center">
                      <Calendar className="size-3.5 text-slate-300" />
                      <p className="text-[4px] font-extrabold text-slate-700 mt-0.5 leading-none">No meetings</p>
                    </div>
                    <div className="w-full bg-slate-900 text-white rounded p-0.5 text-[3.5px] font-extrabold flex items-center justify-center gap-0.5 cursor-pointer mt-0.5 hover:bg-slate-800 transition-colors">
                      <Video className="size-1.5" /> Start Instant
                    </div>
                  </div>

                </div>

                {/* Bottom Navigation */}
                <div className="bg-white border-t border-slate-100 p-1 flex items-center justify-around text-slate-400 text-[5.5px] font-bold shrink-0">
                  <div className="flex flex-col items-center text-[#4f46e5]">
                    <Building2 className="size-2.5 mb-0.25" />
                    <span>Workspace</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <MessageSquareText className="size-2.5 mb-0.25" />
                    <span>Chats</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <Video className="size-2.5 mb-0.25" />
                    <span>Meetings</span>
                  </div>
                </div>

              </div>
            </MotionDiv>

          </div>
        </div>
      </div>
    </section>
  );
}

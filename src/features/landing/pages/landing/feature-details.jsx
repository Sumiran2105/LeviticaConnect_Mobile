import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "./header";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FolderLock,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Users,
  Video,
  Send,
  Upload,
  Play,
  Lock,
  Plus,
  Users2,
  Trash2,
  Calendar,
  Volume2,
  Camera,
  Share2,
  Sparkle,
  KeyRound,
  Phone,
  Search,
  MoreVertical,
  Paperclip,
  Smile,
  CheckCheck,
  Bell,
  SquarePen
} from "lucide-react";

const MotionDiv = motion.div;

const featureDetails = {
  "intelligent-messaging": {
    titleMain: "Intelligent",
    titleHighlight: "Messaging",
    badge: "Collaboration Hub",
    description: "Connect teams through real-time messaging, organized channels,threaded conversations, and AI-powered assistance. Share files,collaborate securely, and keep projects moving forward from asingle intelligent workspace.",
    icon: MessageSquareText,
    colorClass: "text-indigo-600 bg-indigo-50 border-indigo-100",
    themeColor: "indigo",
    glowBg: "bg-indigo-500/10",
    gradientClass: "from-indigo-600 via-blue-500 to-indigo-750",
    highlights: [
      { title: "Contextual Threads", desc: "Keep discussions organized by topic, reducing noise in main channels." },
      { title: "Smart Quick Replies", desc: "One-tap contextual AI-suggested answers to keep replies immediate." },
      { title: "Universal Presence", desc: "Know who is online, in a huddle, or offline with real-time state sync." }
    ]
  },
  "enterprise-mfa": {
    titleMain: "Enterprise",
    titleHighlight: "MFA Security",
    badge: "Security & Access",
    description: "Protect your organization's digital assets with enterprise-grade multifactor authentication.Enable secure access through biometric verification, SMS authentication, authenticator apps,and security keys to safeguard every user and device.",
    icon: ShieldCheck,
    colorClass: "text-emerald-600 bg-emerald-50 border-emerald-100",
    themeColor: "emerald",
    glowBg: "bg-emerald-500/10",
    gradientClass: "from-emerald-600 via-teal-500 to-emerald-700",
    highlights: [
      { title: "Biometric Integration", desc: "Integrate TouchID, FaceID, or hardware keys directly on client devices." },
      { title: "Time-based OTP", desc: "Standardized support for Google Authenticator, Duo, and Microsoft Authenticator." },
      { title: "Zero Trust Policy", desc: "Automated session timeouts, device fingerprint verification, and location alerts." }
    ]
  },
  "ai-powered-tools": {
    titleMain: "AI Translation &",
    titleHighlight: "Analytics",
    badge: "AI Core",
    description: "Unleash workspace productivity with automated machine translation, thread auto-summarization, and natural language query search. Break down communication barriers across global teams instantly.",
    icon: Sparkles,
    colorClass: "text-purple-600 bg-purple-50 border-purple-100",
    themeColor: "purple",
    glowBg: "bg-purple-500/10",
    gradientClass: "from-purple-600 via-pink-500 to-indigo-600",
    highlights: [
      { title: "Real-time Translation", desc: "Instantly translate messages in chats and threads into 40+ languages." },
      { title: "One-Click Summaries", desc: "Condensed brief summaries of missed huddles or long channel discussions." },
      { title: "Semantic Knowledge Search", desc: "Find documents, conversations, and past queries with context search." }
    ]
  },
  "teams-and-communities": {
    titleMain: "Channels &",
    titleHighlight: "Communities",
    badge: "Workspace Spaces",
    description: "Bring your organization's departments together. Build public directories or private channels for specialized groups, keeping marketing, frontend engineering,and customer support perfectly aligned.",
    icon: Users,
    colorClass: "text-rose-600 bg-rose-50 border-rose-100",
    themeColor: "rose",
    glowBg: "bg-rose-500/10",
    gradientClass: "from-rose-600 via-pink-500 to-rose-700",
    highlights: [
      { title: "Flexible Permissions", desc: "Granular roles, department divisions, and customized workspace permissions." },
      { title: "Announcement Channels", desc: "Dedicated read-only announcement spaces for corporate-wide updates." },
      { title: "Direct Invites", desc: "Invite contractors or clients into restricted single-channel guest spaces." }
    ]
  },
  "secure-file-sharing": {
    titleMain: "Secure Cloud",
    titleHighlight: "File Sharing",
    badge: "Data Protection",
    description: "Collaborate without compromising security. Upload, preview,and share files confidently with end-to-end encryption, intelligent malware protection,and automatic version tracking that keeps every document safe and accessible.",
    icon: FolderLock,
    colorClass: "text-amber-600 bg-amber-50 border-amber-100",
    themeColor: "amber",
    glowBg: "bg-amber-500/10",
    gradientClass: "from-amber-600 via-orange-500 to-amber-700",
    highlights: [
      { title: "Real-time Protection", desc: "Every uploaded document undergoes automatic scanning for malware." },
      { title: "Smart Versions", desc: "Review document change history and restore prior revisions in one click." },
      { title: "Encrypted Previews", desc: "Preview slides, sheets, PDFs, and images securely directly in the app." }
    ]
  },
  "hd-collaborative-video": {
    titleMain: "HD Collaborative",
    titleHighlight: "Video Calls",
    badge: "Unified Meetings",
    description: "Connect instantly through crystal-clear audio and HD video meetings.Collaborate in real time screen sharing, and live annotations.Capture every discussion effortlessly with automated meeting notes and transcripts.",
    icon: Video,
    colorClass: "text-cyan-600 bg-cyan-50 border-cyan-100",
    themeColor: "cyan",
    glowBg: "bg-cyan-500/10",
    gradientClass: "from-cyan-600 via-blue-500 to-indigo-600",
    highlights: [
      { title: "Lag-free Huddles", desc: "Optimized WebRTC protocol stack for latency-free, stable stream connections." },
      { title: "Interactive Whiteboard", desc: "Draw, sketch, drag shapes, and map features with your peers in real-time." },
      { title: "Automated Transcripts", desc: "Saves high-quality voice transcripts and action summaries automatically." }
    ]
  }
};

export function FeatureDetailsPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const feature = slug ? featureDetails[slug] : null;


  const [selectedContact, setSelectedContact] = useState("pramod");
  const [chatInput, setChatInput] = useState("");
  const [aiDrafting, setAiDrafting] = useState(false);
  const [messagingConversations, setMessagingConversations] = useState({
    pramod: {
      name: "Alex",
      role: "Marketing Manager",
      status: "Online",
      avatarColor: "bg-blue-100 text-blue-700",
      messages: [
        { text: "hii", time: "10:12", isUser: false },
        { text: "hi Vijay", time: "10:12", isUser: false },
        { text: "hello sir good afternoon", time: "14:49", isUser: false },
        { text: "setting up the ui ", time: "16:11", isUser: true, dateDivider: "11 Jun 2026" },
        { text: "https://leviticaconnect.com/", time: "16:38", isUser: true, dateDivider: "15 Jun 2026" },
        { text: "hii", time: "11:59", isUser: true, dateDivider: "Yesterday" }
      ],
      lastMsg: "hii",
      time: "Yesterday"
    },
    sriram: {
      name: "Priya",
      role: "Platform Lead",
      status: "Online",
      avatarColor: "bg-emerald-100 text-emerald-700",
      messages: [
        { text: "Hi, did you review the platform requirements?", time: "09:30", isUser: false },
        { text: "Yes, I will check the PDF document now.", time: "09:45", isUser: true },
        { text: "Reviewing Rapido specs.pdf", time: "09:54", isUser: false }
      ],
      lastMsg: "Ola & Rapido - Platform.pdf",
      time: "09:54"
    },
    sairam: {
      name: "Naga Sairam Srinivasan",
      role: "Design Director",
      status: "Online",
      avatarColor: "bg-purple-100 text-purple-700",
      messages: [
        { text: "Hey! Just uploaded the new mockup screens.", time: "Yesterday", isUser: false },
        { text: "Awesome, they look super clean and premium.", time: "Yesterday", isUser: true },
        { text: "hii", time: "Yesterday", isUser: false }
      ],
      lastMsg: "hii",
      time: "Yesterday"
    },
    jagadeesh: {
      name: "Jagadeesh",
      role: "Backend Architect",
      status: "Online",
      avatarColor: "bg-amber-100 text-amber-700",
      messages: [
        { text: "Are the APIs integrated on frontend?", time: "Fri", isUser: false },
        { text: "Yes, Vite build compiles cleanly now.", time: "Fri", isUser: true },
        { text: "ok", time: "Fri", isUser: false }
      ],
      lastMsg: "ok",
      time: "Fri"
    },
    pradeep: {
      name: "Pradeep Bantapalli",
      role: "QA Lead",
      status: "Offline",
      avatarColor: "bg-rose-100 text-rose-700",
      messages: [
        { text: "No regressions found in latest build.", time: "8 Jun", isUser: false },
        { text: "Excellent, ready for staging deploy.", time: "8 Jun", isUser: true },
        { text: "hii", time: "8 Jun", isUser: false }
      ],
      lastMsg: "hii",
      time: "8 Jun"
    },
    durgaprasad: {
      name: "Medipudi Durgaprasad",
      role: "Frontend Engineer",
      status: "Online",
      avatarColor: "bg-cyan-100 text-cyan-700",
      messages: [
        { text: "Integrated the HSL tailwind colors.", time: "4 Jun", isUser: false },
        { text: "hii", time: "4 Jun", isUser: true },
        { text: "hi sir goodafternoon", time: "4 Jun", isUser: false }
      ],
      lastMsg: "hi sir goodafternoon",
      time: "4 Jun"
    },
    perumalla: {
      name: "PERUMALLA SUBBARAMAIAH",
      role: "VP of Engineering",
      status: "Offline",
      avatarColor: "bg-teal-100 text-teal-700",
      messages: [
        { text: "Let's plan the release meeting.", time: "4 Jun", isUser: false },
        { text: "Got it.", time: "4 Jun", isUser: true }
      ],
      lastMsg: "Let's plan the release meeting.",
      time: "4 Jun"
    }
  });


  const [mfaCode, setMfaCode] = useState("");
  const [mfaVerified, setMfaVerified] = useState(false);
  const [mfaError, setMfaError] = useState(false);


  const [originalText, setOriginalText] = useState("We reviewed the Q3 project metrics today. Client engagement is up by 15%, but the frontend development team needs an extra developer to hit the July 1st release. Marketing also requested updated logos for the landing page launch. Overall, we are green on timelines except for task verifications.");
  const [aiResult, setAiResult] = useState("");
  const [aiMode, setAiMode] = useState(null);


  const [selectedTeam, setSelectedTeam] = useState("levitica-connect");
  const [teamChatInput, setTeamChatInput] = useState("");
  const [teamSearchQuery, setTeamSearchQuery] = useState("");
  const [teamsConversations, setTeamsConversations] = useState({
    "levitica-connect": {
      name: "#Levitica connect",
      sub: "levitica teams",
      avatarInitials: "LC",
      avatarBg: "bg-[#0ea5e9]/10 text-[#0ea5e9]",
      messages: [
        { sender: "Naga Sairam Srinivasa Chakravarthi Pothureddy", avatar: "NS", avatarColor: "bg-[#f43f5e] text-white", text: "hii harsha", time: "11:00", reactions: ["❤️ 1"] },
        { sender: "harsha", avatar: "H", avatarColor: "bg-[#f59e0b] text-white", text: "hii Naga Sairam Srinivasa Chakravarthi Pothureddy", time: "11:02" },
        { sender: "Naga Sairam Srinivasa Chakravarthi Pothureddy", avatar: "NS", avatarColor: "bg-[#f43f5e] text-white", text: "hii harsha", time: "11:05", reactions: ["👍 1"] },
        { sender: "Srinivas", avatar: "SS", avatarColor: "bg-[#ec4899] text-white", text: "Hii Team, ", time: "11:15" },
        { sender: "Sairam", avatar: "User", avatarColor: "bg-indigo-600 text-white", text: "Ui ideas ", time: "11:20", isUser: true }
      ]
    },
    "hrms": {
      name: "#HRMS",
      sub: "This is HRMS Project team",
      avatarInitials: "HR",
      avatarBg: "bg-emerald-500/10 text-emerald-600",
      messages: [
        { sender: "Srinivas", avatar: "SS", avatarColor: "bg-[#ec4899] text-white", text: "Let's update the HRMS profile module.", time: "Yesterday" },
        { sender: "SaiGanesh", avatar: "User", avatarColor: "bg-indigo-600 text-white", text: "Sure, working on the layout.", time: "Yesterday", isUser: true }
      ]
    },
    "training-team-15": {
      name: "#Training Team 15",
      sub: "This is frontend training team",
      avatarInitials: "T1",
      avatarBg: "bg-purple-500/10 text-purple-600",
      messages: [
        { sender: "harsha", avatar: "H", avatarColor: "bg-[#f59e0b] text-white", text: "Welcome to frontend training!", time: "Jun 12" }
      ]
    }
  });


  const [filesList, setFilesList] = useState([
    { name: "q3_roadmap.pdf", size: "1.4 MB", status: "Secure", progress: 100 },
    { name: "logo_branding_v2.png", size: "840 KB", status: "Secure", progress: 100 }
  ]);
  const [uploadingName, setUploadingName] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);


  const [wbPoints, setWbPoints] = useState([
    { x: 40, y: 30, color: "#4f46e5" },
    { x: 50, y: 40, color: "#4f46e5" },
    { x: 60, y: 35, color: "#4f46e5" },
    { x: 120, y: 90, color: "#10b981" },
    { x: 130, y: 80, color: "#10b981" },
    { x: 140, y: 95, color: "#10b981" }
  ]);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!feature) {
      navigate("/");
    }
  }, [feature, navigate]);

  if (!feature) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-slate-500 font-semibold">
        Loading feature profile...
      </div>
    );
  }

  const Icon = feature.icon;

  const themeColorsMap = {
    indigo: { hex: "#4f46e5", rgb: "79,70,229", text: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100", ring: "ring-indigo-50/40", glow: "bg-indigo-400/10" },
    emerald: { hex: "#10b981", rgb: "16,185,129", text: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100", ring: "ring-emerald-50/40", glow: "bg-emerald-400/10" },
    purple: { hex: "#a855f7", rgb: "168,85,247", text: "text-purple-600", bg: "bg-purple-50", border: "border-purple-100", ring: "ring-purple-50/40", glow: "bg-purple-400/10" },
    rose: { hex: "#f43f5e", rgb: "244,63,94", text: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100", ring: "ring-rose-50/40", glow: "bg-rose-400/10" },
    amber: { hex: "#f59e0b", rgb: "245,158,11", text: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100", ring: "ring-amber-50/40", glow: "bg-amber-400/10" },
    cyan: { hex: "#0891b2", rgb: "8,145,178", text: "text-cyan-600", bg: "bg-cyan-50", border: "border-cyan-100", ring: "ring-cyan-50/40", glow: "bg-cyan-400/10" }
  };

  const currentTheme = themeColorsMap[feature.themeColor] || themeColorsMap.indigo;

  // Simulator logics
  // 1. Messaging AI trigger (Updated for full dynamic sidebar-based chat simulation)
  const handleSendMessage = () => {
    if (!chatInput.trim()) return;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const userMsg = { text: chatInput, isUser: true, time: timestamp };

    setMessagingConversations(prev => {
      const activeChat = prev[selectedContact];
      return {
        ...prev,
        [selectedContact]: {
          ...activeChat,
          messages: [...activeChat.messages, userMsg],
          lastMsg: chatInput,
          time: "Just now"
        }
      };
    });

    setChatInput("");


    setAiDrafting(true);
    setTimeout(() => {
      const answers = {
        pramod: [
          "Perfect! Let's continue working on this integration.",
          "Got your message. I'll sync with the design team.",
          "Sure, sounds like a plan. Talk soon!",
          "Excellent update, let me check the staging link."
        ],
        sriram: [
          "Perfect, I'll review the platform file soon.",
          "Thanks for confirming. Let's discuss this on our daily standup.",
          "Awesome. I'll review the rest of the specifications."
        ],
        sairam: [
          "Great! I'll update the Figma designs for the landing page.",
          "Awesome, let me know if you need other icons."
        ]
      };

      const activeAnswers = answers[selectedContact] || [
        "Sounds good! Let's align on this huddle.",
        "Perfect, thanks for keeping me posted.",
        "I will take a look at this right away."
      ];

      const randomReply = activeAnswers[Math.floor(Math.random() * activeAnswers.length)];
      const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

      setMessagingConversations(prev => {
        const activeChat = prev[selectedContact];
        return {
          ...prev,
          [selectedContact]: {
            ...activeChat,
            messages: [...activeChat.messages, { text: randomReply, isUser: false, time: replyTime }],
            lastMsg: randomReply,
            time: replyTime
          }
        };
      });
      setAiDrafting(false);
    }, 1205);
  };


  const handleVerifyMfa = () => {
    if (mfaCode.trim() === "749210" || mfaCode.trim() === "123456") {
      setMfaVerified(true);
      setMfaError(false);
    } else {
      setMfaError(true);
      setTimeout(() => setMfaError(false), 2000);
    }
  };


  const handleAiAction = (action) => {
    setAiResult("");
    setAiMode(action);
    if (action === "summary") {
      setTimeout(() => {
        setAiResult("• Client engagement increased by 15%.\n• Frontend team needs 1 additional developer to hit July 1st launch.\n• Marketing requests logo files for landing page.");
      }, 800);
    } else if (action === "translate") {
      setTimeout(() => {
        setAiResult("Revisamos las métricas del proyecto del tercer trimestre hoy. El compromiso del cliente aumentó en un 15%, pero el equipo de desarrollo frontend necesita un desarrollador adicional para cumplir con el lanzamiento del 1 de julio.");
      }, 800);
    }
  };


  const handleTeamSendMessage = () => {
    if (!teamChatInput.trim()) return;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const userMsg = {
      sender: "SaiSumiran",
      avatar: "User",
      avatarColor: "bg-indigo-600 text-white",
      text: teamChatInput,
      time: timestamp,
      isUser: true
    };

    setTeamsConversations(prev => {
      const activeTeam = prev[selectedTeam];
      return {
        ...prev,
        [selectedTeam]: {
          ...activeTeam,
          messages: [...activeTeam.messages, userMsg]
        }
      };
    });

    setTeamChatInput("");


    setTimeout(() => {
      const replies = {
        "levitica-connect": [
          { sender: "harsha", avatar: "H", avatarColor: "bg-[#f59e0b] text-white", text: "Avunu, design mockups update cheddam.", time: "Just now" },
          { sender: "Sriram Sajjala", avatar: "SS", avatarColor: "bg-[#ec4899] text-white", text: "Let's review the active items before checking designs.", time: "Just now" }
        ],
        "hrms": [
          { sender: "Sriram Sajjala", avatar: "SS", avatarColor: "bg-[#ec4899] text-white", text: "Staging deployment check setup modal is done.", time: "Just now" }
        ]
      };

      const teamReplies = replies[selectedTeam] || [
        { sender: "harsha", avatar: "H", avatarColor: "bg-[#f59e0b] text-white", text: "Dynamic layout simulation works correctly!", time: "Just now" }
      ];

      const randomReply = teamReplies[Math.floor(Math.random() * teamReplies.length)];

      setTeamsConversations(prev => {
        const activeTeam = prev[selectedTeam];
        return {
          ...prev,
          [selectedTeam]: {
            ...activeTeam,
            messages: [...activeTeam.messages, randomReply]
          }
        };
      });
    }, 1200);
  };


  const handleSimulateUpload = () => {
    const names = ["project_proposal_draft.docx", "sprint_analytics.xlsx", "product_mockups.fig"];
    const randomName = names[Math.floor(Math.random() * names.length)];
    setUploadingName(randomName);
    setUploadProgress(10);

    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setFilesList(current => [
            ...current,
            { name: randomName, size: "2.1 MB", status: "Secure", progress: 100 }
          ]);
          setUploadingName("");
          return 0;
        }
        return prev + 30;
      });
    }, 300);
  };


  const handleCanvasClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const colors = ["#4f46e5", "#10b981", "#ec4899", "#f59e0b"];
    const randColor = colors[Math.floor(Math.random() * colors.length)];
    setWbPoints(prev => [...prev, { x, y, color: randColor }]);
  };



  return (
    <div className="min-h-screen bg-slate-50/50 pt-[72px] pb-20 text-slate-900 font-sans antialiased">

      <Header />


<div className="relative overflow-hidden bg-white pt-2 pb-16 lg:pt-10 lg:pb-24 border-b border-slate-100">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[450px] w-[450px] rounded-full blur-3xl opacity-40 ${feature.glowBg}`} />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-10">

          <Link
            to="/"
            className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="size-4" />
            <span>Back</span>
          </Link>

          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.1fr_0.9fr] items-center">

            <div className="space-y-6 max-w-2xl">
              <div className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 border border-slate-200 bg-white shadow-sm`}>
                <div className={`size-2 rounded-full animate-pulse bg-indigo-600`} />
                <span className="text-xs font-extrabold tracking-wider uppercase text-slate-700">{feature.badge}</span>
              </div>

              <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                {feature.titleMain}{" "}
                <span className={`bg-gradient-to-r ${feature.gradientClass} bg-clip-text text-transparent`}>
                  {feature.titleHighlight}
                </span>
              </h1>

              <p className="text-lg leading-relaxed text-slate-500 font-medium sm:leading-8">
                {feature.description}
              </p>

              <div className="flex flex-wrap gap-4 pt-4">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-7 py-4 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 hover:shadow-indigo-700/30 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
                >
                  Start free trial
                </Link>
                <Link
                  to="/contact"
                  className="inline-flex items-center justify-center rounded-2xl bg-white border border-slate-200 px-7 py-4 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-350 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
                >
                  Talk to Sales
                </Link>
              </div>
            </div>
                 {/* Right feature illustration collage */}
            <div className="flex items-center justify-center lg:justify-end select-none w-full">
              <div className="relative w-full max-w-[480px] h-[320px] bg-gradient-to-tr from-[#f3f7ff] via-[#fbfdff] to-[#f4f7ff] border border-[#e9f0ff] rounded-[32px] shadow-[0_24px_60px_rgba(148,163,184,0.14)] overflow-hidden flex items-center justify-center">
                
                {/* Soft radial glow points */}
                <div className={`absolute top-0 right-0 w-[140px] h-[140px] rounded-full ${currentTheme.glow} blur-2xl pointer-events-none`} />
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] h-[220px] rounded-full ${feature.glowBg} blur-3xl pointer-events-none`} />

                {/* Background decorative waves (Image Reference Replica) */}
                <svg className="absolute inset-0 size-full pointer-events-none opacity-60" viewBox="0 0 480 320" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M-20,160 C100,110 220,220 500,140" stroke={currentTheme.hex} strokeWidth="1.5" strokeOpacity="0.25" />
                  <path d="M-20,175 C90,135 240,205 500,160" stroke={currentTheme.hex} strokeWidth="0.8" strokeOpacity="0.15" />
                  <path d="M-20,145 C120,120 200,230 500,130" stroke={currentTheme.hex} strokeWidth="0.8" strokeOpacity="0.15" />
                  <circle cx="48" cy="148" r="3.5" fill={currentTheme.hex} fillOpacity="0.5" />
                  <circle cx="96" cy="168" r="3" fill={currentTheme.hex} fillOpacity="0.35" />
                  <circle cx="378" cy="148" r="3.5" fill={currentTheme.hex} fillOpacity="0.5" />
                </svg>
                <div className={`absolute inset-0 rounded-full blur-3xl opacity-15 ${feature.glowBg} scale-75 pointer-events-none`} />

                <MotionDiv
                  initial={{ scale: 0.9, opacity: 0, rotate: -2 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 100, damping: 15 }}
                  className={`relative z-10 flex size-32 items-center justify-center rounded-[32px] border border-slate-100 bg-white ring-4 hover:scale-105 transition-transform duration-300 ${currentTheme.ring}`}
                  style={{ boxShadow: `0 24px 50px rgba(${currentTheme.rgb}, 0.08)` }}
                >
                  {slug === "intelligent-messaging" ? (
                    <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke={currentTheme.hex} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={currentTheme.text}>
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      <path d="M8 8h8" />
                      <path d="M8 12h8" />
                      <path d="M8 16h5" />
                    </svg>
                  ) : (
                    <Icon className={`size-14 ${currentTheme.text} stroke-[2]`} />
                  )}
                </MotionDiv>


                <MotionDiv
                  initial={{ x: -20, y: -20, opacity: 0 }}
                  animate={{ x: 0, y: 0, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 120, damping: 16, delay: 0.2 }}
                  className="absolute left-6 top-6 z-20 rounded-full border border-slate-100 bg-white px-5 py-3.5 shadow-[0_12px_30px_rgba(148,163,184,0.12)] flex items-center gap-3"
                >
                  {slug === "intelligent-messaging" && (
                    <>
                      <div className="relative flex size-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-550"></span>
                      </div>
                      <span className="text-[13.5px] font-extrabold text-slate-800 tracking-tight leading-none">Sarah is typing...</span>
                    </>
                  )}
                  {slug === "enterprise-mfa" && (
                    <>
                      <div className="size-5 rounded-lg bg-emerald-55 text-emerald-600 flex items-center justify-center border border-emerald-100/50"><ShieldCheck className="size-3" /></div>
                      <span className="text-[11px] font-extrabold text-slate-800 tracking-tight leading-none">MFA: Active</span>
                    </>
                  )}
                  {slug === "ai-powered-tools" && (
                    <>
                      <span className="text-[10px] font-extrabold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">EN</span>
                      <span className="text-[10px] font-bold text-slate-400">→</span>
                      <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">ES</span>
                    </>
                  )}
                  {slug === "teams-and-communities" && (
                    <>
                      <span className="text-[11px] font-extrabold text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full">#marketing</span>
                    </>
                  )}
                  {slug === "secure-file-sharing" && (
                    <>
                      <div className="size-5 rounded bg-emerald-55 text-emerald-600 flex items-center justify-center"><Check className="size-3 stroke-[2.5]" /></div>
                      <span className="text-[11px] font-extrabold text-slate-850 truncate leading-none">Safe & Encrypted</span>
                    </>
                  )}
                  {slug === "hd-collaborative-video" && (
                    <>
                      <div className="size-2.5 rounded-full bg-rose-500 animate-pulse" />
                      <span className="text-[11px] font-extrabold text-slate-800 tracking-tight leading-none">REC • 01:24</span>
                    </>
                  )}
                </MotionDiv>


                <MotionDiv
                  initial={{ x: 20, y: 20, opacity: 0 }}
                  animate={{ x: 0, y: 0, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 120, damping: 16, delay: 0.35 }}
                  className="absolute right-6 bottom-6 z-20 rounded-full border border-slate-100 bg-white px-5 py-3 shadow-[0_12px_30px_rgba(148,163,184,0.12)] flex items-center gap-3"
                >
                  {slug === "intelligent-messaging" && (
                    <>
                      <div className="size-9 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[11px] font-extrabold font-mono tracking-tight shrink-0 shadow-sm">AI</div>
                      <span className="text-[13.5px] font-extrabold text-slate-800 tracking-tight leading-none">Drafting response...</span>
                    </>
                  )}
                  {slug === "enterprise-mfa" && (
                    <>
                      <div className="size-5 rounded bg-emerald-55 text-emerald-600 flex items-center justify-center"><Check className="size-3 stroke-[3]" /></div>
                      <span className="text-[11px] font-extrabold text-slate-850 tracking-tight leading-none">Device Secure</span>
                    </>
                  )}
                  {slug === "ai-powered-tools" && (
                    <>
                      <Sparkles className="size-4 text-purple-600 animate-pulse" />
                      <span className="text-[11px] font-extrabold text-slate-800 leading-none">Summary generated</span>
                    </>
                  )}
                  {slug === "teams-and-communities" && (
                    <div className="flex items-center -space-x-1.5">
                      <div className="size-5.5 rounded-full bg-slate-200 border border-white flex items-center justify-center text-[9px] font-extrabold">A</div>
                      <div className="size-5.5 rounded-full bg-indigo-100 border border-white flex items-center justify-center text-[9px] font-extrabold text-indigo-700">M</div>
                      <div className="size-5.5 rounded-full bg-emerald-100 border border-white flex items-center justify-center text-[9px] font-extrabold text-emerald-700">S</div>
                      <span className="text-[10px] text-slate-500 font-bold pl-2">Frontend</span>
                    </div>
                  )}
                  {slug === "secure-file-sharing" && (
                    <>
                      <FolderLock className="size-4 text-amber-500 animate-bounce" />
                      <span className="text-[11px] font-extrabold text-slate-600 leading-none">Scanned for Malware</span>
                    </>
                  )}
                  {slug === "hd-collaborative-video" && (
                    <>
                      <div className="size-5 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center"><Volume2 className="size-3" /></div>
                      <span className="text-[11px] font-extrabold text-slate-800 tracking-tight leading-none">Audio Connected</span>
                    </>
                  )}
                </MotionDiv>

                {/* Floating Widget 3 (Top Right Sparkles Button) */}
                {slug === "intelligent-messaging" && (
                  <MotionDiv
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                    className="absolute right-6 top-6 z-20 size-14 rounded-full bg-white border border-slate-100 flex items-center justify-center cursor-pointer hover:scale-105 transition-transform duration-200"
                    style={{ boxShadow: `0 12px 24px rgba(${currentTheme.rgb}, 0.18)` }}
                  >
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={currentTheme.hex} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={currentTheme.text}>
                      <path d="M11 5 Q11 11 17 11 Q11 11 11 17 Q11 11 5 11 Q11 11 11 5 Z" />
                      <path d="M5 14 Q5 17 8 17 Q5 17 5 20 Q5 17 2 17 Q5 17 5 14 Z" strokeWidth="1.8" />
                      <path d="M17 5h4M19 3v4" strokeWidth="1.8" />
                    </svg>
                  </MotionDiv>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>


      <div className="mx-auto max-w-7xl px-6 lg:px-10 mt-16">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[0.85fr_1.15fr] items-stretch">


          <div className="flex flex-col justify-between bg-white border border-slate-100 rounded-3xl p-8 md:p-10 shadow-sm">
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Key Capabilities</h3>
              <div className="space-y-6">
                {feature.highlights.map((hl, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100/30 shrink-0">
                      <Check className="size-4 font-bold" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-slate-800 leading-tight">{hl.title}</h4>
                      <p className="text-sm text-slate-500 font-medium leading-relaxed mt-1">{hl.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* <div className="pt-8 border-t border-slate-100 mt-8 space-y-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ready to deploy?</p>
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  <div className="size-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-extrabold">A</div>
                  <div className="size-8 rounded-full border-2 border-white bg-indigo-100 flex items-center justify-center text-[10px] font-extrabold text-indigo-700">S</div>
                  <div className="size-8 rounded-full border-2 border-white bg-emerald-100 flex items-center justify-center text-[10px] font-extrabold text-emerald-700">M</div>
                </div>
                <span className="text-xs font-bold text-slate-500 leading-none">Joined by 10,000+ teams worldwide</span>
              </div>
            </div> */}
          </div>


          {slug === "enterprise-mfa" ? (
            <div className="bg-[linear-gradient(180deg,_#f6f6ff_0%,_#eef3ef_100%)] border border-slate-200/60 rounded-3xl p-6 md:p-8 flex items-center justify-center shadow-lg relative overflow-hidden min-h-[460px] w-full">

              <div className="w-full max-w-[400px] mx-auto text-slate-800 bg-white border border-brand-line rounded-3xl p-6 md:p-7 shadow-[0_24px_80px_rgba(68,83,74,0.12)] select-none text-left">
                {!mfaVerified ? (
                  <div className="space-y-4">

                    <div className="flex items-center justify-between">
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-brand-line bg-brand-soft px-2.5 py-1 text-[8.5px] font-bold uppercase tracking-wider text-brand-secondary">
                        <ShieldCheck className="size-3.5 text-brand-primary" />
                        <span>OTP Verify</span>
                      </div>
                      <div
                        onClick={() => setMfaCode("749210")}
                        title="Click to autofill test code"
                        className="size-8 rounded-full bg-cyan-50 text-cyan-600 flex items-center justify-center border border-cyan-100/50 cursor-pointer hover:scale-105 transition-transform"
                      >
                        <KeyRound className="size-4 text-[#4A90E2]" />
                      </div>
                    </div>


                    <h4 className="text-base font-extrabold text-slate-900 tracking-tight leading-tight mt-2">
                      Enter the one-time password.
                    </h4>


                    <div className="bg-[#f4f6fd] border border-[#e8ecfa] rounded-2xl p-3.5">
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Verifying login for</span>
                      <span className="text-xs font-bold text-slate-755 mt-0.5 block truncate">alex.rivera@leviticatechnologies.com</span>
                    </div>


                    <div className="space-y-1.5">
                      <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">OTP code</label>
                      <input
                        type="text"
                        maxLength={6}
                        value={mfaCode}
                        onChange={(e) => setMfaCode(e.target.value)}
                        placeholder="Enter 6-digit OTP"
                        className={`w-full bg-slate-50 border ${mfaError ? "border-rose-500 ring-1 ring-rose-200" : "border-slate-200"} rounded-xl px-3 py-2.5 text-xs text-slate-850 font-bold focus:outline-none focus:border-indigo-505 focus:ring-1 focus:ring-indigo-100`}
                      />
                      {mfaError && (
                        <span className="text-[10px] text-rose-500 font-bold block">Incorrect verification code. Please try 749210.</span>
                      )}
                    </div>


                    <label className="flex items-center gap-2 cursor-pointer pt-0.5">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="rounded border-slate-300 text-indigo-650 focus:ring-indigo-500 size-3.5"
                      />
                      <span className="text-[10.5px] font-bold text-slate-500">Remember this device</span>
                    </label>


                    <div className="flex flex-wrap items-center gap-2 pt-1.5 text-[10px] font-bold">
                      <button
                        onClick={handleVerifyMfa}
                        className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 transition-colors shadow-sm"
                      >
                        Verify login OTP
                      </button>
                      <button
                        onClick={() => setMfaCode("749210")}
                        className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 px-2.5 py-2 transition-colors"
                      >
                        Autofill
                      </button>
                      <button
                        onClick={() => { setMfaCode(""); setMfaError(false); }}
                        className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 px-2.5 py-2 transition-colors"
                      >
                        Reset MFA
                      </button>
                      <button
                        onClick={() => navigate("/")}
                        className="text-slate-400 hover:text-slate-600 px-1.5 py-2 transition-colors ml-auto"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <MotionDiv
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="py-4 text-center space-y-4"
                  >
                    <div className="size-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                      <Check className="size-6 stroke-[3]" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-extrabold text-slate-900 leading-tight">Authentication Successful</h4>
                      <p className="text-xs text-slate-500 font-medium">Session token generated. Access granted.</p>
                    </div>
                    <button
                      onClick={() => { setMfaVerified(false); setMfaCode(""); }}
                      className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 px-3.5 py-1.5 text-xs transition-colors"
                    >
                      Reset Demo
                    </button>
                  </MotionDiv>
                )}
              </div>
            </div>
          ) : slug === "intelligent-messaging" ? (
            <div className="bg-slate-50 border border-slate-200/80 rounded-3xl overflow-hidden shadow-lg flex flex-col min-h-[520px] w-full">

              <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] flex-1 min-h-[520px]">


                <div className="border-r border-slate-100 bg-white flex flex-col h-full">

                  <div className="p-4 flex items-center justify-between border-b border-slate-100 bg-white shrink-0">
                    <span className="text-base font-extrabold text-slate-800 tracking-tight">Chat</span>
                    <button className="size-8 rounded-full hover:bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-550 hover:text-slate-700 transition-colors">
                      <MessageSquareText className="size-4" />
                    </button>
                  </div>


                  <div className="p-3 bg-white border-b border-slate-50 shrink-0 relative">
                    <Search className="size-3.5 absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search conversations..."
                      className="w-full bg-slate-50 border border-slate-150 rounded-xl pl-9 pr-3 py-2 text-[11px] font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 transition-all"
                    />
                  </div>


                  <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[400px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 block text-left">Recent</div>
                    {Object.keys(messagingConversations).map((key) => {
                      const chat = messagingConversations[key];
                      const isActive = selectedContact === key;
                      const lastMessageObj = chat.messages[chat.messages.length - 1];
                      const lastMessageText = lastMessageObj ? lastMessageObj.text : chat.lastMsg;
                      const isLastMsgUser = lastMessageObj ? lastMessageObj.isUser : false;

                      return (
                        <div
                          key={key}
                          onClick={() => setSelectedContact(key)}
                          className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${isActive
                            ? "bg-slate-100 border border-slate-200/20 shadow-sm"
                            : "hover:bg-slate-50 border border-transparent"
                            }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">

                            <div className="relative size-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border border-white shadow-sm overflow-hidden bg-slate-100">
                              <div className={`absolute inset-0 flex items-center justify-center ${chat.avatarColor}`}>
                                {chat.name.substring(0, 2).toUpperCase()}
                              </div>
                              {chat.status === "Online" && (
                                <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-550 border-2 border-white" />
                              )}
                            </div>

                            <div className="min-w-0 text-left">
                              <h5 className="text-[11.5px] font-bold text-slate-800 truncate leading-tight">
                                {chat.name}
                              </h5>
                              <p className="text-[10px] text-slate-400 font-semibold truncate mt-0.5 max-w-[120px]">
                                {isLastMsgUser && <span className="text-indigo-500 font-bold mr-0.5">You: </span>}
                                {lastMessageText}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-[8.5px] text-slate-400 font-bold">{chat.time}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>


                <div className="flex flex-col h-full bg-white">

                  <div className="p-4 flex items-center justify-between border-b border-slate-100 bg-white shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="relative size-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border border-white shadow-sm overflow-hidden">
                        <div className={`absolute inset-0 flex items-center justify-center ${messagingConversations[selectedContact].avatarColor}`}>
                          {messagingConversations[selectedContact].name.substring(0, 2).toUpperCase()}
                        </div>
                        {messagingConversations[selectedContact].status === "Online" && (
                          <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-550 border-2 border-white" />
                        )}
                      </div>
                      <div className="text-left">
                        <h4 className="text-[12px] font-extrabold text-slate-900 leading-tight">
                          {messagingConversations[selectedContact].name}
                        </h4>
                        <span className="text-[9px] font-bold text-emerald-500 leading-none">
                          {messagingConversations[selectedContact].status}
                        </span>
                      </div>
                    </div>


                    <div className="flex items-center gap-1.5 text-slate-450">
                      <button className="size-8 rounded-full hover:bg-slate-50 flex items-center justify-center transition-colors">
                        <Video className="size-3.5 text-slate-500" />
                      </button>
                      <button className="size-8 rounded-full hover:bg-slate-50 flex items-center justify-center transition-colors">
                        <Phone className="size-3.5 text-slate-500" />
                      </button>
                      <button className="size-8 rounded-full hover:bg-slate-50 flex items-center justify-center transition-colors">
                        <Search className="size-3.5 text-slate-500" />
                      </button>
                      <button className="size-8 rounded-full hover:bg-slate-50 flex items-center justify-center transition-colors">
                        <MoreVertical className="size-3.5 text-slate-500" />
                      </button>
                    </div>
                  </div>


                  <div className="px-4 flex border-b border-slate-100 bg-white text-[10.5px] text-slate-500 font-bold gap-4 shrink-0">
                    <button className="border-b-2 border-indigo-600 text-indigo-650 py-2.5">Chat</button>
                    <button className="py-2.5 hover:text-slate-750 transition-colors">Files</button>
                    <button className="py-2.5 hover:text-slate-750 transition-colors">Photos</button>
                  </div>


                  <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/20 max-h-[310px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex flex-col">
                    {messagingConversations[selectedContact].messages.map((msg, i) => {
                      return (
                        <div key={i} className="w-full">
                          {msg.dateDivider && (
                            <div className="flex justify-center my-3">
                              <span className="bg-slate-100 border border-slate-200/50 px-3 py-1 rounded-full text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                {msg.dateDivider}
                              </span>
                            </div>
                          )}
                          <div className={`flex items-end gap-2.5 max-w-[80%] ${msg.isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}>
                            {!msg.isUser && (
                              <div className="relative size-6 rounded-full flex items-center justify-center font-extrabold text-[8px] shrink-0 overflow-hidden bg-slate-100 border border-slate-100">
                                <div className={`absolute inset-0 flex items-center justify-center ${messagingConversations[selectedContact].avatarColor}`}>
                                  {messagingConversations[selectedContact].name.substring(0, 2).toUpperCase()}
                                </div>
                              </div>
                            )}
                            <div className="flex flex-col text-left">
                              <div
                                className={`rounded-2xl px-3.5 py-2 text-xs font-semibold leading-relaxed shadow-sm ${msg.isUser
                                  ? "bg-gradient-to-r from-violet-600 to-indigo-650 text-white rounded-tr-none"
                                  : "bg-white border border-slate-150 text-slate-800 rounded-tl-none"
                                  }`}
                              >
                                {msg.text.startsWith("http") ? (
                                  <a href={msg.text} target="_blank" rel="noopener noreferrer" className="underline hover:text-indigo-200">
                                    {msg.text}
                                  </a>
                                ) : (
                                  msg.text
                                )}
                              </div>
                              <span className={`text-[8.5px] font-bold mt-1 block ${msg.isUser ? "text-right text-slate-400" : "text-left text-slate-400"}`}>
                                {msg.time} {msg.isUser && <CheckCheck className="size-3 inline text-indigo-500 ml-0.5" />}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {aiDrafting && (
                      <div className="flex items-center gap-2 text-slate-400 text-[9.5px] font-mono animate-pulse mr-auto">
                        <Sparkles className="size-3 text-indigo-500 animate-spin" /> AI Assist is typing...
                      </div>
                    )}
                  </div>


                  <div className="p-3 bg-white border-t border-slate-100 shrink-0">
                    <div className="border border-slate-200/80 bg-slate-50/50 rounded-2xl p-1.5 flex items-center gap-2">
                      <button className="size-7 rounded-lg hover:bg-slate-250/50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                        <Paperclip className="size-4" />
                      </button>
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                        placeholder="Type a message..."
                        className="flex-1 bg-transparent text-xs text-slate-700 font-semibold focus:outline-none placeholder-slate-400"
                      />
                      <button className="size-7 rounded-lg hover:bg-slate-250/50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                        <Smile className="size-4" />
                      </button>
                      <button className="size-7 rounded-lg hover:bg-slate-250/50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                        <Plus className="size-4" />
                      </button>
                      <button
                        onClick={handleSendMessage}
                        className="size-8 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shrink-0 shadow-sm"
                      >
                        <Send className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          ) : slug === "teams-and-communities" ? (
            <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-lg flex flex-col min-h-[580px] w-full text-slate-800 font-sans">


              <div className="h-14 border-b border-slate-100 bg-white flex items-center justify-between px-4 shrink-0">

                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                  <span>User</span>
                  <span>&gt;</span>
                  <span className="text-indigo-600 font-bold">Teams</span>
                </div>


                <div className="relative w-full max-w-[280px] md:max-w-[340px]">
                  <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="modules... • Search colleagues... • Find teams"
                    className="w-full bg-[#f4f6f8] border-0 rounded-full pl-9 pr-3 py-1.5 text-[10.5px] font-medium text-slate-600 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-200"
                  />
                </div>


                <div className="flex items-center gap-3">
                  <button className="size-8 rounded-full hover:bg-slate-50 flex items-center justify-center border border-slate-100/50 text-slate-450 relative">
                    <Bell className="size-4 text-slate-500" />
                    <span className="absolute top-2.5 right-2.5 size-1.5 rounded-full bg-rose-500" />
                  </button>
                  <div className="flex items-center gap-2">
                    <div className="text-right hidden sm:block">
                      <p className="text-[11px] font-bold text-slate-800 leading-tight">SaiSumiran</p>
                      <span className="text-[9px] font-bold text-emerald-550 block -mt-0.5">Online</span>
                    </div>
                    <div className="size-8 rounded-full bg-[#ec4899] text-white flex items-center justify-center font-bold text-[10.5px] border border-slate-100 shadow-sm">
                      SS
                    </div>
                  </div>
                </div>
              </div>


              <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] flex-1 min-h-[520px]">


                <div className="border-r border-slate-100 bg-white flex flex-col h-full">

                  <div className="p-4 flex items-center justify-between bg-white shrink-0">
                    <span className="text-base font-extrabold text-slate-900 tracking-tight">Teams</span>
                    <button className="size-8 rounded-lg hover:bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-500 hover:text-slate-700 transition-colors">
                      <SquarePen className="size-4" />
                    </button>
                  </div>


                  <div className="px-3 pb-3 bg-white border-b border-slate-50 shrink-0 relative">
                    <Search className="size-3.5 absolute left-6 top-1/3 -translate-y-1/2 text-slate-450" />
                    <input
                      type="text"
                      placeholder="Search teams"
                      value={teamSearchQuery}
                      onChange={(e) => setTeamSearchQuery(e.target.value)}
                      className="w-full bg-[#f4f6f8] border border-slate-100 rounded-xl pl-9 pr-3 py-2 text-[11px] font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100"
                    />
                  </div>


                  <div className="flex-1 overflow-y-auto p-2 space-y-1.5 max-h-[380px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider px-2 py-1 block text-left">Your joined teams</div>

                    {Object.keys(teamsConversations)
                      .filter(key => teamsConversations[key].name.toLowerCase().includes(teamSearchQuery.toLowerCase()))
                      .map((key) => {
                        const team = teamsConversations[key];
                        const isActive = selectedTeam === key;
                        return (
                          <div
                            key={key}
                            onClick={() => setSelectedTeam(key)}
                            className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${isActive
                              ? "bg-[#3b82f6] text-white shadow-md shadow-blue-500/10"
                              : "hover:bg-slate-50 border border-slate-100/30"
                              }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`size-8 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 ${isActive ? "bg-white/10 text-white" : "bg-indigo-50 text-indigo-650"}`}>
                                <Users className="size-4" />
                              </div>
                              <div className="min-w-0 text-left">
                                <h5 className={`text-[11px] font-bold truncate leading-tight ${isActive ? "text-white" : "text-slate-800"}`}>
                                  {team.name}
                                </h5>
                                <p className={`text-[9px] truncate mt-0.5 max-w-[120px] font-semibold ${isActive ? "text-blue-100" : "text-slate-400"}`}>
                                  {team.sub}
                                </p>
                              </div>
                            </div>
                            <span className={`text-[7.5px] font-extrabold px-1.5 py-0.5 rounded shrink-0 ${isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                              PUBLIC
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>


                <div className="flex flex-col h-full bg-[#fafbfc]">

                  <div className="p-4 flex items-center justify-between border-b border-slate-100 bg-white shrink-0">
                    <div className="flex items-center gap-3">
                      <div className={`size-9 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 ${teamsConversations[selectedTeam].avatarBg} border border-slate-100`}>
                        {teamsConversations[selectedTeam].avatarInitials}
                      </div>
                      <div className="text-left">
                        <h4 className="text-[12px] font-extrabold text-slate-900 leading-tight">
                          {teamsConversations[selectedTeam].name}
                        </h4>
                        <span className="text-[9px] font-bold text-slate-450 leading-none font-semibold">
                          Public
                        </span>
                      </div>
                    </div>


                    <div className="flex items-center gap-1.5 text-slate-450">
                      <button className="size-8 rounded-lg hover:bg-slate-50 flex items-center justify-center border border-slate-100 transition-colors">
                        <Calendar className="size-3.5 text-slate-500 hover:text-slate-700" />
                      </button>
                      <button className="size-8 rounded-lg hover:bg-slate-50 flex items-center justify-center border border-slate-100 transition-colors">
                        <Users className="size-3.5 text-slate-500 hover:text-slate-700" />
                      </button>
                      <button className="size-8 rounded-lg hover:bg-slate-50 flex items-center justify-center border border-slate-100 transition-colors">
                        <Phone className="size-3.5 text-slate-500 hover:text-slate-700" />
                      </button>
                      <button className="size-8 rounded-lg hover:bg-slate-50 flex items-center justify-center border border-slate-100 transition-colors">
                        <Search className="size-3.5 text-slate-500 hover:text-slate-700" />
                      </button>
                    </div>
                  </div>


                  <div className="px-4 flex border-b border-slate-100 bg-white text-[10.5px] text-slate-500 font-bold gap-4.5 shrink-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <button className="border-b-2 border-indigo-650 text-indigo-650 py-2.5">Chat</button>
                    <button className="py-2.5 hover:text-slate-750 transition-colors">Files</button>
                    <button className="py-2.5 hover:text-slate-750 transition-colors">Calendar</button>
                    <button className="py-2.5 hover:text-slate-750 transition-colors">Members</button>
                    <button className="py-2.5 hover:text-slate-750 transition-colors">Department</button>
                  </div>


                  <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[300px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex flex-col bg-slate-50/10">
                    {teamsConversations[selectedTeam].messages.map((msg, i) => {
                      return (
                        <div key={i} className={`flex items-start gap-2.5 max-w-[85%] ${msg.isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}>
                          {!msg.isUser && (
                            <div className={`size-7 rounded-full flex items-center justify-center font-extrabold text-[8.5px] shrink-0 overflow-hidden ${msg.avatarColor}`}>
                              {msg.avatar}
                            </div>
                          )}
                          <div className="flex flex-col text-left">
                            {!msg.isUser && (
                              <span className="text-[10px] font-extrabold text-slate-700 leading-none mb-1">
                                {msg.sender}
                              </span>
                            )}
                            <div className="flex flex-col items-start gap-1">
                              <div
                                className={`rounded-2xl px-3.5 py-2 text-xs font-semibold leading-relaxed shadow-sm ${msg.isUser
                                  ? "bg-indigo-600 text-white rounded-tr-none"
                                  : "bg-white border border-slate-200/80 text-slate-800 rounded-tl-none"
                                  }`}
                              >
                                {msg.text}
                              </div>

                              {msg.reactions && msg.reactions.map((react, ri) => (
                                <div key={ri} className="flex items-center gap-1 bg-white border border-slate-200/60 rounded-full px-2 py-0.5 text-[9.5px] font-bold text-slate-500 shadow-sm mt-0.5 select-none hover:scale-105 active:scale-95 cursor-pointer">
                                  {react}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>


                  <div className="p-3 bg-white border-t border-slate-100 shrink-0">
                    <div className="border border-slate-200/80 bg-slate-50/50 rounded-2xl p-1.5 flex items-center gap-2">
                      <button className="size-7 rounded-lg hover:bg-slate-200/50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                        <Paperclip className="size-4" />
                      </button>
                      <input
                        type="text"
                        value={teamChatInput}
                        onChange={(e) => setTeamChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleTeamSendMessage()}
                        placeholder={`Message ${teamsConversations[selectedTeam].name}`}
                        className="flex-1 bg-transparent text-xs text-slate-700 font-semibold focus:outline-none placeholder-slate-400"
                      />
                      <button className="size-7 rounded-lg hover:bg-slate-200/50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                        <Smile className="size-4" />
                      </button>
                      <button className="size-7 rounded-lg hover:bg-slate-200/50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                        <Plus className="size-4" />
                      </button>
                      <button
                        onClick={handleTeamSendMessage}
                        className="size-8 rounded-full bg-indigo-650 hover:bg-indigo-700 text-white flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shrink-0 shadow-sm"
                      >
                        <Send className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 flex flex-col justify-between text-white shadow-2xl relative overflow-hidden min-h-[460px]">


              <div className={`absolute -right-24 -top-24 size-48 rounded-full blur-3xl opacity-15 ${feature.glowBg}`} />


              <div className="border-b border-slate-800 pb-4 flex items-center justify-between z-10 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="size-2.5 rounded-full bg-rose-500" />
                    <div className="size-2.5 rounded-full bg-amber-500" />
                    <div className="size-2.5 rounded-full bg-emerald-500" />
                  </div>
                  <span className="text-xs text-slate-400 font-mono pl-2">interactive_demo.sh</span>
                </div>
                <div className="inline-flex items-center gap-1 rounded bg-indigo-600/10 border border-indigo-500/25 px-2 py-0.5 text-[10px] font-bold text-indigo-300">
                  <Sparkle className="size-3 animate-spin" /> Live Simulator
                </div>
              </div>


              <div className="flex-1 py-6 flex flex-col justify-center min-h-0 z-10">



                {slug === "ai-powered-tools" && (
                  <div className="flex flex-col gap-4 h-full justify-between">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Original Text (Q3 Project Update)</label>
                      <textarea
                        value={originalText}
                        onChange={(e) => setOriginalText(e.target.value)}
                        className="w-full h-20 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 resize-none focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleAiAction("summary")}
                        className={`flex-1 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-2.5 transition-colors flex items-center justify-center gap-1.5 ${aiMode === "summary" && "ring-2 ring-purple-300"}`}
                      >
                        <Sparkles className="size-3.5" /> Summarize
                      </button>
                      <button
                        onClick={() => handleAiAction("translate")}
                        className={`flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 transition-colors flex items-center justify-center gap-1.5 ${aiMode === "translate" && "ring-2 ring-indigo-300"}`}
                      >
                        Translate (Spanish)
                      </button>
                    </div>

                    <div className="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl p-4 overflow-y-auto min-h-[100px] text-xs font-medium text-purple-200">
                      <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">AI Copilot Output</div>
                      {aiResult ? (
                        <p className="whitespace-pre-line leading-relaxed text-slate-200 font-mono text-[11px]">{aiResult}</p>
                      ) : aiMode ? (
                        <span className="text-slate-500 animate-pulse font-mono">Processing natural language query...</span>
                      ) : (
                        <span className="text-slate-500 font-mono">Select an action above to see AI output.</span>
                      )}
                    </div>
                  </div>
                )}


                {slug === "secure-file-sharing" && (
                  <div className="flex flex-col h-full justify-between gap-4">
                    <div className="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl p-4 overflow-y-auto max-h-[200px] space-y-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Workspace Cloud Storage</div>
                      {filesList.map((file, i) => (
                        <div key={i} className="flex items-center justify-between bg-slate-900 border border-slate-850 p-2 rounded-lg text-xs font-semibold">
                          <div className="flex items-center gap-2">
                            <FolderLock className="size-4.5 text-amber-500" />
                            <div className="min-w-0">
                              <p className="truncate text-slate-100 leading-none">{file.name}</p>
                              <span className="text-[9px] text-slate-500 font-mono mt-0.5 leading-none">{file.size}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-extrabold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                              <Check className="size-2.5 stroke-[3]" /> {file.status}
                            </span>
                            <button
                              onClick={() => setFilesList(current => current.filter((_, idx) => idx !== i))}
                              className="text-slate-500 hover:text-rose-400 transition-colors"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {uploadingName && (
                        <div className="bg-slate-900 border border-slate-850 p-2.5 rounded-lg text-xs space-y-1.5 animate-pulse">
                          <div className="flex justify-between items-center text-slate-300">
                            <span className="truncate">{uploadingName}</span>
                            <span className="text-[9px] font-mono">{uploadProgress}%</span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-1">
                            <div className="bg-amber-500 h-1 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                          </div>
                          <span className="text-[9px] text-amber-400 font-mono flex items-center gap-1">
                            <Sparkles className="size-3 animate-spin" /> Performing sandbox malware audit scan...
                          </span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleSimulateUpload}
                      disabled={!!uploadingName}
                      className="w-full rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold py-2.5 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Upload className="size-4" /> Simulate Secure File Upload
                    </button>
                  </div>
                )}


                {slug === "hd-collaborative-video" && (
                  <div className="flex flex-col gap-4 h-full justify-between">
                    <div className="grid grid-cols-2 gap-3">


                      <div className="relative aspect-video rounded-xl bg-slate-950 overflow-hidden border border-slate-850 flex items-center justify-center">
                        <div className="size-10 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">A</div>
                        <span className="absolute bottom-1.5 left-1.5 text-[8px] font-bold text-white bg-slate-900/60 px-1.5 py-0.5 rounded">You (Alex)</span>
                        <span className="absolute top-1.5 right-1.5 size-2 bg-emerald-500 rounded-full border border-slate-950 animate-pulse" />
                      </div>


                      <div className="relative aspect-video rounded-xl bg-slate-950 overflow-hidden border border-slate-850 flex items-center justify-center">
                        <div className="size-10 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">SC</div>
                        <span className="absolute bottom-1.5 left-1.5 text-[8px] font-bold text-white bg-slate-900/60 px-1.5 py-0.5 rounded">Sarah Connor</span>
                        <span className="absolute top-1.5 right-1.5 size-2 bg-emerald-500 rounded-full border border-slate-950 animate-pulse" />
                      </div>

                    </div>


                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        <span>Live Whiteboard Canvas</span>
                        <span className="text-[8px] text-slate-500 font-mono">(Click canvas below to draw)</span>
                      </div>
                      <div
                        onClick={handleCanvasClick}
                        className="h-20 w-full bg-slate-950 border border-slate-800 rounded-xl relative cursor-crosshair overflow-hidden"
                      >
                        {wbPoints.map((pt, i) => (
                          <div
                            key={i}
                            className="absolute size-2 rounded-full transform -translate-x-1/2 -translate-y-1/2"
                            style={{ left: pt.x, top: pt.y, backgroundColor: pt.color }}
                          />
                        ))}
                        {wbPoints.length === 0 && (
                          <div className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-600 font-mono">
                            Canvas is empty
                          </div>
                        )}
                      </div>
                    </div>


                    <div className="flex justify-center items-center gap-3 bg-slate-900 border border-slate-800 p-2 rounded-xl">
                      <button className="size-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition-colors">
                        <Volume2 className="size-4" />
                      </button>
                      <button className="size-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition-colors">
                        <Camera className="size-4" />
                      </button>
                      <button className="size-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition-colors">
                        <Share2 className="size-4" />
                      </button>
                      <button
                        onClick={() => setWbPoints([])}
                        className="text-[10px] text-rose-400 hover:text-rose-300 font-bold px-2 py-1 rounded transition-colors"
                      >
                        Clear Board
                      </button>
                    </div>
                  </div>
                )}

              </div>


              <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-[9px] font-mono text-slate-500 z-10 shrink-0">
                <span>status: STABLE_CONNECT</span>
                <span>latency: 14ms</span>
              </div>
            </div>
          )}

        </div>
      </div>


      <footer className="mt-16 border-t border-slate-100 bg-white py-8 text-center text-xs font-semibold text-slate-400 space-y-2">
        <div>
          &copy; {new Date().getFullYear()} Levitica Technologies. All rights reserved.
        </div>
        <div className="flex justify-center gap-4">
          <Link to="/privacy" className="hover:text-indigo-600 transition-colors">Privacy Policy</Link>
          <span>&bull;</span>
          <Link to="/terms" className="hover:text-indigo-600 transition-colors">Terms of Service</Link>
        </div>
      </footer>
    </div>
  );
}

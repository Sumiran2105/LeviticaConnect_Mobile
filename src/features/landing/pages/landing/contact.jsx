import { Smartphone } from "lucide-react";
import { motion } from "framer-motion";

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

export function ContactSection() {
  return (
    <section id="contact" className="relative overflow-hidden pb-20 pt-16">
      <div className="absolute inset-0 bg-white" />
      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-10">
        <MotionDiv
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="flex flex-col lg:flex-row items-center justify-between gap-10"
        >
          <MotionDiv variants={itemVariants} className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-line/60 bg-white/70 px-3 py-1.5 shadow-sm backdrop-blur">
              <Smartphone className="size-3.5 text-brand-primary" />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-primary">Download App</p>
            </div>
            <h2 className="text-3xl font-bold leading-tight tracking-tight text-brand-ink sm:text-4xl">
              Get Levitica Connect on your device
            </h2>
            <p className="text-sm font-medium leading-relaxed text-brand-secondary sm:text-base">
              Collaborate on the go. Download our official mobile apps for Android and iOS and stay connected with your team anywhere.
            </p>
          </MotionDiv>


          <div className="flex flex-row items-center gap-4 flex-shrink-0">
            <a
              href="#"
              className="transition-transform duration-200 hover:scale-105 active:scale-95"
            >
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg"
                alt="Google Play"
                className="h-[48px] w-auto select-none"
              />
            </a>
            <a
              href="#"
              className="transition-transform duration-200 hover:scale-105 active:scale-95"
            >
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg"
                alt="App Store"
                className="h-[48px] w-auto select-none"
              />
            </a>
          </div>
        </MotionDiv>
      </div>
    </section>
  );
}

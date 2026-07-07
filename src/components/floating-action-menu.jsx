import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const Motion = motion;
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function FloatingActionMenu({ items = [] }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const active = isHovered || isOpen;

  return (
    <div
      className="fixed bottom-8 right-8 z-[100] flex flex-col items-end gap-3"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsOpen(false);
      }}
    >
      <AnimatePresence>
        {active && items.length > 0 ? (
          <Motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="mb-2 flex flex-col gap-3"
          >
            {items.map((item, index) => (
              <Motion.button
                key={item.label}
                initial={{ opacity: 0, x: 20 }}
                animate={{
                  opacity: 1,
                  x: 0,
                  transition: { delay: index * 0.05 },
                }}
                whileHover={{ scale: 1.08, x: -4 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  navigate(item.path);
                  setIsOpen(false);
                }}
                className="group relative flex items-center gap-3"
                type="button"
              >
                <div className="absolute right-full mr-3 whitespace-nowrap rounded-lg border border-brand-line bg-white px-3 py-1.5 text-xs font-semibold text-brand-ink opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                  {item.label}
                </div>
                <div className={`flex size-12 items-center justify-center rounded-2xl border border-white/40 shadow-xl transition-all duration-300 ${item.color}`}>
                  <item.icon className="size-5" />
                </div>
              </Motion.button>
            ))}
          </Motion.div>
        ) : null}
      </AnimatePresence>

      <Motion.button
        layout
        onClick={() => setIsOpen((current) => !current)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`relative flex size-14 items-center justify-center rounded-full border border-white/50 bg-white/75 shadow-2xl backdrop-blur-xl transition-colors duration-300 ${
          active ? "bg-white" : "hover:bg-white/90"
        }`}
        type="button"
      >
        <Motion.div
          animate={{ rotate: active ? 45 : 0 }}
          transition={{ type: "spring", damping: 20 }}
        >
          <Plus className="size-6 text-brand-primary" />
        </Motion.div>

        {!active ? (
          <Motion.div
            className="absolute -inset-1 -z-10 rounded-full bg-brand-primary/10"
            animate={{ scale: [1, 1.16, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          />
        ) : null}
      </Motion.button>
    </div>
  );
}

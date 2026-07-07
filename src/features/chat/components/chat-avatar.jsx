import { useState } from "react";

import { getImageUrl, getProfileImageSource } from "@/lib/image-utils";

export function ChatAvatar({ image, name, online, size = "size-10" }) {
  const [failedImageSource, setFailedImageSource] = useState("");
  const safeName = name || "User";
  const initials = safeName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const imageSource = image || getProfileImageSource({ name, image });
  const imageUrl = imageSource && failedImageSource !== imageSource ? getImageUrl(imageSource) : "";
  const gradients = [
    "from-violet-500 via-fuchsia-500 to-rose-500",
    "from-sky-500 via-cyan-500 to-emerald-400",
    "from-emerald-500 via-teal-500 to-cyan-500",
    "from-pink-500 via-rose-500 to-orange-400",
    "from-amber-400 via-orange-500 to-red-500",
  ];
  const gradient = gradients[safeName.charCodeAt(0) % gradients.length];

  return (
    <div
      className={`relative isolate shrink-0 rounded-full bg-gradient-to-br p-[2px] shadow-[0_10px_24px_rgba(15,23,42,0.14)] transition-transform duration-300 hover:scale-105 ${online ? "avatar-online-float" : ""} ${size} ${gradient}`}
      title={safeName}
    >
      <div
        className={`flex size-full items-center justify-center overflow-hidden rounded-full bg-gradient-to-br font-bold text-sm text-white ring-2 ring-white/80 ${gradient}`}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={safeName}
            className="size-full object-cover"
            onError={() => setFailedImageSource(imageSource)}
          />
        ) : (
          initials
        )}
      </div>
      {online ? (
        <span className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-white shadow-sm">
          <span className="absolute size-3 rounded-full bg-emerald-400 animate-pulse-ring" />
          <span className="relative size-2.5 rounded-full bg-emerald-400 ring-1 ring-emerald-200" />
        </span>
      ) : null}
    </div>
  );
}

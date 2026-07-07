import { memo } from "react";
import { Lock, Search, Users2, X } from "lucide-react";


import { cn } from "@/lib/utils";

const TeamSidebarItem = memo(function TeamSidebarItem({
  channel,
  channelName,
  channelDescription,
  isSelected,
  isPrivate,
  meta,
  onSelectChannel,
}) {
  const iconWrapperClass = cn(
    "flex size-8 items-center justify-center rounded-lg transition-all duration-300 shrink-0",
    isSelected
      ? "bg-white/15 text-white"
      : "bg-slate-100 text-slate-400 group-hover:bg-brand-primary/10 group-hover:text-brand-primary"
  );

  return (
    <button
      type="button"
      onClick={() => onSelectChannel?.(channel)}
      className={cn(
        "group flex w-full items-center justify-between rounded-2xl border px-3 py-2.5 text-left text-sm font-medium transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.005] active:scale-[0.995]",
        isSelected
          ? "border-brand-primary/10 bg-gradient-to-r from-brand-primary to-indigo-600 text-white shadow-md shadow-brand-primary/15"
          : "border-slate-100 bg-white/60 text-slate-600 shadow-sm hover:border-brand-primary/20 hover:bg-white hover:text-brand-primary hover:shadow-md hover:shadow-slate-100/50"
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className={iconWrapperClass}>
          {isPrivate ? (
            <Lock className="size-4" />
          ) : (
            <Users2 className="size-4" />
          )}
        </div>
        <div className="sm:min-w-0 min-w-[175px]">
          <div className="min-w-[175px]truncate font-bold sm:text-xs text-xs tracking-tight">{channelName}</div>
          {channelDescription ? (
            <p
              className={cn(
                "mt-0.5 line-clamp-1 text-xs font-medium",
                isSelected ? "text-white/75" : "text-slate-400 group-hover:text-slate-500"
              )}
            >
              {channelDescription}
            </p>
          ) : null}
        </div>
      </div>

      {meta ? (
        <div
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider shadow-sm",
            isSelected ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-brand-primary/10 group-hover:text-brand-primary"
          )}
        >
          {meta}
        </div>
      ) : isSelected ? (
        <div className="mt-1 size-1.5 shrink-0 rounded-full bg-white" />
      ) : null}
    </button>
  );
});

export const SharedTeamSidebar = memo(function SharedTeamSidebar({
  title = "Teams",
  subtitle,
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Search teams...",
  channels = [],
  selectedChannelId,
  onSelectChannel,
  renderHeaderAction,
  renderBottomAction,
  loading,
  error,
  emptyMessage = "No teams found.",
  getChannelId = (channel) => channel?.id,
  getChannelName = (channel) => channel?.name || "Untitled team",
  getChannelDescription = (channel) => channel?.description || "",
  getChannelMeta,
  isPrivateChannel = (channel) => Boolean(channel?.is_private),
  isOpen = true,
  onClose,
  className,
}) {
  return (
    <aside
      className={cn(
        "absolute inset-y-0 left-0 z-20 flex w-80 sm:w-72 flex-col min-h-0 border-r border-slate-100/80 bg-slate-50/40 shadow-[8px_0_30px_rgba(15,23,42,0.02)] backdrop-blur-xl transition-transform duration-300 sm:relative sm:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full",
        className
      )}
    >
      <div className="space-y-5 p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold tracking-tight text-slate-800">{title}</h2>
            {subtitle ? <p className="mt-1 text-xs font-semibold text-slate-400">{subtitle}</p> : null}
          </div>
          <div className="flex items-center gap-2">
            {renderHeaderAction ? renderHeaderAction() : null}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex lg:hidden size-8 items-center justify-center rounded-xl bg-slate-100/80 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors shrink-0"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchValue}
            onChange={(event) => onSearchChange?.(event.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10"
          />
        </div>
      </div>

      <div className="flex-1 px-4 pb-6 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(0,0,0,0.1)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300/50 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400/50">
        <div className="space-y-2">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="rounded-2xl border border-slate-100/50 bg-white/70 px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="size-8 rounded-lg animate-shimmer shrink-0" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-3.5 w-28 rounded-full animate-shimmer" />
                      <div className="h-3 w-40 rounded-full animate-shimmer" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-600">
              {error}
            </div>
          ) : null}

          {!loading && !error && channels.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white/50 px-4 py-4 text-xs font-medium text-slate-400 text-center">
              {emptyMessage}
            </div>
          ) : null}

          {!loading &&
            !error &&
            channels.map((channel) => {
              const channelId = getChannelId(channel);
              const isSelected = selectedChannelId === channelId;
              const channelName = getChannelName(channel);
              const channelDescription = getChannelDescription(channel);
              const meta = getChannelMeta?.(channel);
              const isPrivate = isPrivateChannel(channel);

              return (
                <TeamSidebarItem
                  key={channelId || channelName}
                  channel={channel}
                  channelName={channelName}
                  channelDescription={channelDescription}
                  isSelected={isSelected}
                  isPrivate={isPrivate}
                  meta={meta}
                  onSelectChannel={onSelectChannel}
                />
              );
            })}
        </div>
      </div>

      {renderBottomAction ? <div className="mt-auto border-t border-slate-100/80 bg-white/70 p-6 backdrop-blur-xl">{renderBottomAction()}</div> : null}
    </aside>
  );
});

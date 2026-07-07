import { useMemo, useState } from "react";
import { CalendarDays, Clock, Loader2, PlusCircle, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatISTDateTime } from "@/lib/date-time";

const DURATION_OPTIONS = [
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "45 min", minutes: 45 },
  { label: "1 hr", minutes: 60 },
  { label: "1.5 hrs", minutes: 90 },
  { label: "2 hrs", minutes: 120 },
];

function pad(value) {
  return String(value).padStart(2, "0");
}

function getInitialSchedule() {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 15);

  return {
    title: "",
    description: "",
    date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    duration: "30",
  };
}

function formatEventDate(value) {
  if (!value) return "";

  return formatISTDateTime(value, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }, "");
}

function sortEvents(events) {
  return [...events].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
}

export function TeamCalendar({
  events = [],
  isLoading = false,
  selectedChannel,
  onScheduleMeeting,
  canSchedule = true,
}) {
  const sortedEvents = useMemo(() => sortEvents(events), [events]);

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden bg-gradient-to-b from-white to-slate-50 [scrollbar-width:thin]">
      <div className="mx-auto w-full max-w-5xl px-6 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-2xl font-bold text-gray-950">Team Calendar</h3>
            <p className="mt-1 text-sm text-gray-500">
              {sortedEvents.length} scheduled {sortedEvents.length === 1 ? "meeting" : "meetings"} for #{selectedChannel?.name}
            </p>
          </div>
          {canSchedule ? (
            <Button
              type="button"
              onClick={onScheduleMeeting}
              className="h-11 rounded-2xl bg-brand-primary px-5 font-bold text-white shadow-lg shadow-brand-primary/20 hover:bg-brand-primary/90"
            >
              <PlusCircle className="mr-2 size-4" />
              Schedule Meeting
            </Button>
          ) : null}
        </div>

        {isLoading ? (
          <div className="flex min-h-[360px] items-center justify-center gap-2 text-sm font-semibold text-gray-500">
            <Loader2 className="size-5 animate-spin text-brand-primary" />
            Loading calendar...
          </div>
        ) : sortedEvents.length ? (
          <div className="grid gap-3">
            {sortedEvents.map((event) => (
              <div
                key={event.id}
                className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:border-brand-primary/20 hover:shadow-md"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold text-gray-950">{event.title}</p>
                    {event.description ? (
                      <p className="mt-1 line-clamp-2 text-sm text-gray-500">{event.description}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2 rounded-xl bg-brand-soft px-3 py-2 text-sm font-semibold text-brand-primary">
                    <Clock className="size-4" />
                    {formatEventDate(event.start_time)}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-500">
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1">
                    <Users className="size-3.5" />
                    {event.attendees || event.participants?.length || 0} invited
                  </span>
                  {event.meeting_url ? (
                    <a
                      href={event.meeting_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full bg-sky-50 px-2.5 py-1 text-sky-700 transition hover:bg-sky-100"
                    >
                      Open meeting
                    </a>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-white text-center">
            <div className="mb-4 flex size-16 items-center justify-center rounded-3xl bg-brand-soft text-brand-primary">
              <CalendarDays className="size-7" />
            </div>
            <h4 className="text-lg font-semibold text-gray-950">No meetings scheduled</h4>
            <p className="mt-2 max-w-sm text-sm text-gray-500">
              {canSchedule
                ? "Schedule from this team to invite every member to their calendar."
                : "Meetings you are invited to from this team will appear here."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function ScheduleTeamMeetingDialog({
  open,
  onOpenChange,
  selectedChannel,
  memberCount = 0,
  isScheduling = false,
  onSchedule,
}) {
  const [form, setForm] = useState(getInitialSchedule);

  const updateForm = (patch) => setForm((current) => ({ ...current, ...patch }));

  const handleSubmit = (event) => {
    event.preventDefault();

    const startTime = new Date(`${form.date}T${form.time}:00`);
    const durationMinutes = Number(form.duration) || 30;
    const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

    onSchedule?.({
      title: form.title.trim(),
      description: form.description.trim(),
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      channel_id: selectedChannel?.id,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl rounded-3xl border-none bg-white p-0 shadow-2xl">
        <DialogHeader className="px-6 pt-8 pb-4">
          <DialogTitle className="text-xl font-black text-brand-ink">
            Schedule meeting for #{selectedChannel?.name}
          </DialogTitle>
          <DialogDescription className="text-sm text-brand-secondary">
            {memberCount} team {memberCount === 1 ? "member" : "members"} will be invited.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 pb-7">
          <div className="space-y-2">
            <Label className="font-semibold text-brand-ink">Title*</Label>
            <Input
              value={form.title}
              onChange={(event) => updateForm({ title: event.target.value })}
              className="h-11 rounded-xl border-brand-line"
              placeholder={`${selectedChannel?.name || "Team"} meeting`}
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="font-semibold text-brand-ink">Description</Label>
            <Textarea
              value={form.description}
              onChange={(event) => updateForm({ description: event.target.value })}
              className="min-h-[86px] rounded-xl border-brand-line"
              placeholder="Agenda or notes"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label className="font-semibold text-brand-ink">Date</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(event) => updateForm({ date: event.target.value })}
                className="h-11 rounded-xl border-brand-line"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-brand-ink">Time</Label>
              <Input
                type="time"
                value={form.time}
                onChange={(event) => updateForm({ time: event.target.value })}
                className="h-11 rounded-xl border-brand-line"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-brand-ink">Duration</Label>
              <select
                value={form.duration}
                onChange={(event) => updateForm({ duration: event.target.value })}
                className="h-11 w-full rounded-xl border border-brand-line bg-white px-3 text-sm font-medium text-brand-ink outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
              >
                {DURATION_OPTIONS.map((option) => (
                  <option key={option.minutes} value={option.minutes}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <Button
              type="button"
              variant="ghost"
              className="h-11 rounded-2xl px-6"
              onClick={() => onOpenChange(false)}
              disabled={isScheduling}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-11 rounded-2xl bg-brand-primary px-6 font-bold shadow-lg shadow-brand-primary/20 hover:bg-brand-primary/90"
              disabled={isScheduling || !selectedChannel?.id}
            >
              {isScheduling ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <CalendarDays className="mr-2 size-4" />
                  Schedule Meeting
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

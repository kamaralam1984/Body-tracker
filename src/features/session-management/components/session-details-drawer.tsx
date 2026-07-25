"use client";

/**
 * Rich detail view for a single session — mounted once by the page with no
 * props. Visibility and which session to show are both driven by the store's
 * `detailsSessionId` (open === `detailsSessionId !== null`), so any call site
 * that wants to open it just does `openDetails(id)`.
 *
 * <SessionDetailsDrawer />
 */

import { useState, type ReactNode } from "react";
import {
  Download,
  PauseCircle,
  PlayCircle,
  Share2,
  StopCircle,
  Video,
  VideoOff,
} from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Timeline, TimelineItem } from "@/components/ui/timeline";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  useSessionCommentsQuery,
  useSessionQuery,
  useSessionTimelineQuery,
} from "../hooks/use-session-queries";
import { useSessionManagementStore } from "../store/session-management-store";
import {
  formatAbsoluteDate,
  formatClockTime,
  formatDurationLabel,
  formatFileSize,
  formatRelativeDate,
} from "../lib/session-format";
import { SessionQualityBadge, SessionStatusBadge } from "./session-status-badge";
import { SessionPlayer } from "./session-player";
import { DownloadMenu } from "./download-menu";
import type { SessionTimelineEventType } from "../types";

type DrawerTabValue = "overview" | "player" | "timeline" | "metadata" | "notes";

type TimelineVariant = "neutral" | "accent" | "success" | "warning" | "danger" | "info";

const TIMELINE_EVENT_META: Record<
  SessionTimelineEventType,
  { icon: ReactNode; variant: TimelineVariant }
> = {
  "session-started": { icon: <PlayCircle />, variant: "accent" },
  "tracking-started": { icon: <Video />, variant: "accent" },
  "tracking-lost": { icon: <VideoOff />, variant: "danger" },
  "tracking-restored": { icon: <Video />, variant: "success" },
  paused: { icon: <PauseCircle />, variant: "warning" },
  resumed: { icon: <PlayCircle />, variant: "accent" },
  "session-ended": { icon: <StopCircle />, variant: "neutral" },
  exported: { icon: <Download />, variant: "info" },
  shared: { icon: <Share2 />, variant: "info" },
};

const FIELD_LABEL_CLASS = "text-muted-foreground text-xs font-medium";

export function SessionDetailsDrawer({ className }: { className?: string }) {
  const detailsSessionId = useSessionManagementStore((state) => state.detailsSessionId);
  const closeDetails = useSessionManagementStore((state) => state.closeDetails);

  const { data: session, isLoading: isSessionLoading } = useSessionQuery(detailsSessionId);
  const { data: timeline, isLoading: isTimelineLoading } =
    useSessionTimelineQuery(detailsSessionId);
  const { data: comments, isLoading: isCommentsLoading } =
    useSessionCommentsQuery(detailsSessionId);

  const [tab, setTab] = useState<DrawerTabValue>("overview");
  const [note, setNote] = useState("");
  const [lastOpenedId, setLastOpenedId] = useState(detailsSessionId);
  const [notesSeededForId, setNotesSeededForId] = useState<string | null>(null);

  // Reset local UI state whenever a different session is opened, and seed the
  // notes draft once that session's record has loaded. Adjusting state during
  // render (guarded against a previous-render value) instead of in an effect
  // avoids an extra cascading render pass.
  if (detailsSessionId !== lastOpenedId) {
    setLastOpenedId(detailsSessionId);
    setTab("overview");
  }
  if (session && notesSeededForId !== session.id) {
    setNotesSeededForId(session.id);
    setNote(session.notes);
  }

  const handleSaveNote = () => {
    toast.info("Notes aren't saved yet — coming soon");
  };

  return (
    <Drawer
      open={detailsSessionId !== null}
      onClose={closeDetails}
      side="right"
      title={session?.name ?? (isSessionLoading ? "Loading session…" : "Session details")}
      className={cn("max-w-2xl", className)}
      footer={
        <>
          <Button variant="ghost" onClick={closeDetails}>
            Close
          </Button>
          {session && <DownloadMenu session={session} />}
        </>
      }
    >
      {!session ? (
        <SessionDetailsSkeleton />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <SessionStatusBadge status={session.status} />
            <SessionQualityBadge quality={session.quality} />
          </div>

          <Tabs value={tab} onValueChange={(value) => setTab(value as DrawerTabValue)}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="player">Player</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="metadata">Metadata</TabsTrigger>
              <TabsTrigger value="notes">Notes & comments</TabsTrigger>
            </TabsList>

            <TabsContent value="player">
              {isTimelineLoading ? (
                <TimelineSkeleton />
              ) : (
                <SessionPlayer session={session} timelineEvents={timeline ?? []} />
              )}
            </TabsContent>

            <TabsContent value="overview">
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <Field label="User">
                    <div className="flex items-center gap-2">
                      <Avatar
                        size="sm"
                        src={session.user.avatarSrc}
                        alt={session.user.name}
                        fallback={session.user.name}
                      />
                      <span>{session.user.name}</span>
                    </div>
                  </Field>
                  <Field label="Organization">{session.organization}</Field>
                  <Field label="Camera">{session.camera}</Field>
                  <Field label="Device">{session.device}</Field>
                  <Field label="Started">{formatAbsoluteDate(session.startTime)}</Field>
                  <Field label="Duration">{formatDurationLabel(session.durationSeconds)}</Field>
                  <Field label="File size">{formatFileSize(session.fileSizeMb)}</Field>
                  <Field label="Storage location">{session.storageLocation}</Field>
                </div>

                <div className="flex flex-col gap-1.5">
                  <h3 className={FIELD_LABEL_CLASS}>Movement summary</h3>
                  <p className="text-foreground text-sm leading-relaxed">
                    {session.movementSummary}
                  </p>
                </div>

                {session.tags.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <h3 className={FIELD_LABEL_CLASS}>Tags</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {session.tags.map((tag) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="timeline">
              {isTimelineLoading ? (
                <TimelineSkeleton />
              ) : !timeline || timeline.length === 0 ? (
                <p className="text-muted-foreground py-6 text-center text-sm">
                  No timeline events recorded for this session.
                </p>
              ) : (
                <Timeline>
                  {timeline.map((event) => {
                    const meta = TIMELINE_EVENT_META[event.type];
                    return (
                      <TimelineItem
                        key={event.id}
                        icon={meta.icon}
                        variant={meta.variant}
                        title={event.label}
                        description={event.description}
                        timestamp={`${formatClockTime(event.offsetSeconds)} into session`}
                      />
                    );
                  })}
                </Timeline>
              )}
            </TabsContent>

            <TabsContent value="metadata">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                <MetadataRow label="Session ID" value={session.id} />
                <MetadataRow label="Created at" value={formatAbsoluteDate(session.createdAt)} />
                <MetadataRow label="Updated at" value={formatAbsoluteDate(session.updatedAt)} />
                <MetadataRow label="Storage location" value={session.storageLocation} />
                <MetadataRow label="File size" value={formatFileSize(session.fileSizeMb)} />
              </dl>
            </TabsContent>

            <TabsContent value="notes">
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <h3 className={FIELD_LABEL_CLASS}>Notes</h3>
                  <Textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    rows={4}
                    placeholder="Add a note about this session…"
                  />
                  <div>
                    <Button size="sm" variant="secondary" onClick={handleSaveNote}>
                      Save note
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <h3 className={FIELD_LABEL_CLASS}>Comments</h3>
                  {isCommentsLoading ? (
                    <div className="flex flex-col gap-3">
                      {Array.from({ length: 2 }).map((_, index) => (
                        <div key={index} className="flex items-start gap-2.5">
                          <Skeleton className="size-7 shrink-0 rounded-full" />
                          <div className="flex flex-1 flex-col gap-1.5 pt-0.5">
                            <Skeleton className="h-3 w-32" />
                            <Skeleton className="h-3 w-full" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : !comments || comments.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No comments yet.</p>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {comments.map((comment) => (
                        <div key={comment.id} className="flex items-start gap-2.5">
                          <Avatar
                            size="sm"
                            src={comment.author.avatarSrc}
                            alt={comment.author.name}
                            fallback={comment.author.name}
                          />
                          <div className="flex flex-1 flex-col gap-0.5">
                            <div className="flex items-baseline gap-2">
                              <span className="text-foreground text-sm font-medium">
                                {comment.author.name}
                              </span>
                              <span className="text-muted-foreground text-xs">
                                {formatRelativeDate(comment.createdAt)}
                              </span>
                            </div>
                            <p className="text-foreground text-sm">{comment.body}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </Drawer>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className={FIELD_LABEL_CLASS}>{label}</span>
      <span className="text-foreground text-sm">{children}</span>
    </div>
  );
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className={FIELD_LABEL_CLASS}>{label}</dt>
      <dd className="text-foreground truncate text-sm" title={value}>
        {value}
      </dd>
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex items-start gap-3">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-1.5 pt-1">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SessionDetailsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="flex flex-col gap-1.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { ShortcutChord } from "./ShortcutChord";
import { WindowFrame } from "./WindowFrame";

const VIDEO_SRC = "/product-preview/demo.webm";
const THUMBNAIL_SRC = "/product-preview/thumbnail.webp";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8.25 5.75v12.5a1 1 0 0 0 1.53.848l9.5-6.25a1 1 0 0 0 0-1.696l-9.5-6.25a1 1 0 0 0-1.53.848Z" />
    </svg>
  );
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M7.5 5.25a1 1 0 0 0-1 1v11.5a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1V6.25a1 1 0 0 0-1-1h-2Zm7 0a1 1 0 0 0-1 1v11.5a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1V6.25a1 1 0 0 0-1-1h-2Z" />
    </svg>
  );
}

function VolumeIcon({ muted, className }: { muted: boolean; className?: string }) {
  if (muted) {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M11 5 6 9H3v6h3l5 4V5Z" fill="currentColor" stroke="none" />
        <path d="m16 10 5 5M21 10l-5 5" />
      </svg>
    );
  }
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11 5 6 9H3v6h3l5 4V5Z" fill="currentColor" stroke="none" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  );
}

function FullscreenIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

function ExitFullscreenIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 3v3a2 2 0 0 1-2 2H3M16 3v3a2 2 0 0 0 2 2h3M8 21v-3a2 2 0 0 0-2-2H3M16 21v-3a2 2 0 0 1 2-2h3" />
    </svg>
  );
}

type VideoWithWebkit = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
  webkitExitFullscreen?: () => void;
  webkitDisplayingFullscreen?: boolean;
};

/**
 * Hero product demo: thumbnail-only until play, then loads the WebM and shows
 * brand-styled custom controls. Fullscreen uses the browser Fullscreen API on
 * the video element (native player fullscreen), separate from WindowFrame maximize.
 */
export function ProductVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [scrubbing, setScrubbing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  const clearHideTimer = useCallback(() => {
    if (hideControlsTimer.current) {
      clearTimeout(hideControlsTimer.current);
      hideControlsTimer.current = null;
    }
  }, []);

  const scheduleHideControls = useCallback(() => {
    clearHideTimer();
    hideControlsTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setControlsVisible(false);
      }
    }, 2500);
  }, [clearHideTimer]);

  const revealControls = useCallback(() => {
    setControlsVisible(true);
    scheduleHideControls();
  }, [scheduleHideControls]);

  useEffect(() => () => clearHideTimer(), [clearHideTimer]);

  // Track native video fullscreen (standard API + iOS webkit events).
  useEffect(() => {
    const syncFullscreen = () => {
      const video = videoRef.current as VideoWithWebkit | null;
      const standard = document.fullscreenElement === video;
      const webkit = Boolean(video?.webkitDisplayingFullscreen);
      setIsFullscreen(standard || webkit);
    };

    document.addEventListener("fullscreenchange", syncFullscreen);
    const video = videoRef.current;
    video?.addEventListener("webkitbeginfullscreen", syncFullscreen);
    video?.addEventListener("webkitendfullscreen", syncFullscreen);

    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreen);
      video?.removeEventListener("webkitbeginfullscreen", syncFullscreen);
      video?.removeEventListener("webkitendfullscreen", syncFullscreen);
    };
  }, [started]);

  // Load + play only after the user opts in (video src is unset until then).
  useEffect(() => {
    if (!started) return;
    const video = videoRef.current;
    if (!video) return;

    video.src = VIDEO_SRC;
    video.load();
    void video.play().then(
      () => {
        setPlaying(true);
        scheduleHideControls();
      },
      () => {
        // Autoplay can fail (e.g. policy); leave paused with controls visible.
        setPlaying(false);
        setControlsVisible(true);
      },
    );
  }, [started, scheduleHideControls]);

  const startPlayback = useCallback(() => {
    setStarted(true);
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play().then(() => {
        setPlaying(true);
        scheduleHideControls();
      });
    } else {
      video.pause();
      setPlaying(false);
      setControlsVisible(true);
      clearHideTimer();
    }
  }, [clearHideTimer, scheduleHideControls]);

  const startedRef = useRef(started);
  startedRef.current = started;

  // ⌘/Ctrl+V plays the demo (start if needed; resume if paused).
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
      if (event.repeat) return;
      if (event.key.toLowerCase() !== "v") return;
      if (isEditableTarget(event.target)) return;

      event.preventDefault();
      if (!startedRef.current) {
        setStarted(true);
        return;
      }
      const video = videoRef.current;
      if (video && video.paused) {
        void video.play().then(() => {
          setPlaying(true);
          scheduleHideControls();
        });
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [scheduleHideControls]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }, []);

  /** Browser Fullscreen API on the <video> element (native player fullscreen). */
  const toggleFullscreen = useCallback(async () => {
    const video = videoRef.current as VideoWithWebkit | null;
    if (!video) return;

    try {
      if (document.fullscreenElement === video) {
        await document.exitFullscreen();
        return;
      }
      if (video.webkitDisplayingFullscreen && video.webkitExitFullscreen) {
        video.webkitExitFullscreen();
        return;
      }

      if (typeof video.requestFullscreen === "function") {
        await video.requestFullscreen();
      } else if (typeof video.webkitEnterFullscreen === "function") {
        // iOS Safari: only the video element can enter fullscreen.
        video.webkitEnterFullscreen();
      }
    } catch {
      // Fullscreen may be blocked by browser policy; leave player as-is.
    }
  }, []);

  const seekFromClientX = useCallback((el: HTMLElement, clientX: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    video.currentTime = ratio * video.duration;
    setCurrentTime(video.currentTime);
  }, []);

  const onScrubPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      const track = e.currentTarget;
      track.setPointerCapture(e.pointerId);
      setScrubbing(true);
      setControlsVisible(true);
      clearHideTimer();
      seekFromClientX(track, e.clientX);
    },
    [clearHideTimer, seekFromClientX],
  );

  const onScrubPointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!scrubbing) return;
      seekFromClientX(e.currentTarget, e.clientX);
    },
    [scrubbing, seekFromClientX],
  );

  const onScrubPointerUp = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!scrubbing) return;
      setScrubbing(false);
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      if (playing) scheduleHideControls();
    },
    [playing, scheduleHideControls, scrubbing],
  );

  const label: ReactNode = (
    <>
      <span className="truncate">Product demo</span>
      <span className="inline-flex items-center gap-1.5 text-faint">
        <ShortcutChord keyLabel="v" />
        <span>to play</span>
      </span>
    </>
  );

  return (
    <div className="mx-auto mt-16 max-w-3xl text-left">
      <WindowFrame
        label={label}
        bodyClassName={({ expanded }) =>
          expanded ? "p-0 overflow-hidden items-center justify-center" : "p-0"
        }
      >
        {({ expanded }) => (
          <div
            className={[
              "relative aspect-video bg-surface-raised select-none",
              // Expanded: height matches the frame body; width follows 16:9 (no scroll).
              expanded ? "h-full w-auto max-w-full shrink-0" : "w-full",
            ].join(" ")}
            onMouseMove={started ? revealControls : undefined}
            onMouseLeave={
              started
                ? () => {
                    if (playing && !scrubbing) setControlsVisible(false);
                  }
                : undefined
            }
          >
            {!started ? (
              <>
                {/* Thumbnail only — video bytes are not requested until play. */}
                <img
                  src={THUMBNAIL_SRC}
                  alt="Guided Review product demo preview"
                  className="absolute inset-0 h-full w-full object-cover"
                  width={1280}
                  height={720}
                  decoding="async"
                  fetchPriority="high"
                />
                <button
                  type="button"
                  onClick={startPlayback}
                  className="absolute inset-0 flex cursor-pointer items-center justify-center bg-background/25 transition-colors hover:bg-background/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-primary"
                  aria-label="Play product demo video"
                >
                  <span className="flex h-16 w-16 items-center justify-center rounded-full border border-primary bg-primary text-primary-foreground shadow-[0_8px_32px_rgba(0,0,0,0.45)] transition-transform hover:scale-105 sm:h-20 sm:w-20">
                    <PlayIcon className="ml-1 h-8 w-8 sm:h-9 sm:w-9" />
                  </span>
                </button>
              </>
            ) : (
              <>
                <video
                  ref={videoRef}
                  className="absolute inset-0 h-full w-full object-cover"
                  playsInline
                  preload="none"
                  poster={THUMBNAIL_SRC}
                  onPlay={() => setPlaying(true)}
                  onPause={() => {
                    setPlaying(false);
                    setControlsVisible(true);
                  }}
                  onEnded={() => {
                    setPlaying(false);
                    setControlsVisible(true);
                  }}
                  onTimeUpdate={() => {
                    const v = videoRef.current;
                    if (v && !scrubbing) setCurrentTime(v.currentTime);
                  }}
                  onLoadedMetadata={() => {
                    const v = videoRef.current;
                    if (v) {
                      setDuration(v.duration);
                      setMuted(v.muted);
                    }
                  }}
                  onClick={togglePlay}
                />

                {/* Center play affordance when paused mid-session */}
                {!playing && (
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="absolute inset-0 z-10 flex cursor-pointer items-center justify-center bg-background/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-primary"
                    aria-label="Play video"
                  >
                    <span className="flex h-16 w-16 items-center justify-center rounded-full border border-primary bg-primary text-primary-foreground shadow-[0_8px_32px_rgba(0,0,0,0.45)] sm:h-20 sm:w-20">
                      <PlayIcon className="ml-1 h-8 w-8 sm:h-9 sm:w-9" />
                    </span>
                  </button>
                )}

                <div
                  className={[
                    "absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-background via-background/85 to-transparent px-3 pb-3 pt-10 transition-opacity duration-200",
                    controlsVisible || scrubbing || !playing
                      ? "opacity-100"
                      : "pointer-events-none opacity-0",
                  ].join(" ")}
                  onMouseMove={(e) => {
                    e.stopPropagation();
                    revealControls();
                  }}
                >
                  {/* Progress scrubber */}
                  <div
                    role="slider"
                    tabIndex={0}
                    aria-label="Seek"
                    aria-valuemin={0}
                    aria-valuemax={Math.round(duration) || 0}
                    aria-valuenow={Math.round(currentTime)}
                    aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
                    className="group relative mb-2.5 h-1.5 cursor-pointer rounded-full bg-border-strong touch-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    onPointerDown={onScrubPointerDown}
                    onPointerMove={onScrubPointerMove}
                    onPointerUp={onScrubPointerUp}
                    onPointerCancel={onScrubPointerUp}
                    onKeyDown={(e) => {
                      const video = videoRef.current;
                      if (!video || !Number.isFinite(video.duration)) return;
                      const step = e.shiftKey ? 10 : 5;
                      if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                        e.preventDefault();
                        video.currentTime = Math.min(video.duration, video.currentTime + step);
                        setCurrentTime(video.currentTime);
                      } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                        e.preventDefault();
                        video.currentTime = Math.max(0, video.currentTime - step);
                        setCurrentTime(video.currentTime);
                      } else if (e.key === "Home") {
                        e.preventDefault();
                        video.currentTime = 0;
                        setCurrentTime(0);
                      } else if (e.key === "End") {
                        e.preventDefault();
                        video.currentTime = video.duration;
                        setCurrentTime(video.duration);
                      }
                    }}
                  >
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-primary"
                      style={{ width: `${progress * 100}%` }}
                    />
                    <div
                      className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-primary-foreground bg-primary shadow-sm opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                      style={{ left: `calc(${progress * 100}% - 7px)` }}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={togglePlay}
                      className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-border bg-surface text-foreground transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      aria-label={playing ? "Pause" : "Play"}
                    >
                      {playing ? (
                        <PauseIcon className="h-4 w-4" />
                      ) : (
                        <PlayIcon className="ml-0.5 h-4 w-4" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={toggleMute}
                      className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-border bg-surface text-muted transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      aria-label={muted ? "Unmute" : "Mute"}
                    >
                      <VolumeIcon muted={muted} className="h-4 w-4" />
                    </button>

                    <span className="ml-1 font-mono text-xs tabular-nums text-muted">
                      <span className="text-foreground">{formatTime(currentTime)}</span>
                      <span className="mx-1 text-faint">/</span>
                      {formatTime(duration)}
                    </span>

                    <button
                      type="button"
                      onClick={toggleFullscreen}
                      className="ml-auto inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-border bg-surface text-muted transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                    >
                      {isFullscreen ? (
                        <ExitFullscreenIcon className="h-4 w-4" />
                      ) : (
                        <FullscreenIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </WindowFrame>
    </div>
  );
}

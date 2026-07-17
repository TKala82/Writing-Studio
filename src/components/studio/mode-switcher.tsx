"use client";

import {
  FeatherIcon,
  LibraryBigIcon,
  LightbulbIcon,
  PenLineIcon,
  type LucideIcon,
} from "lucide-react";
import type { KeyboardEvent } from "react";

import { cn } from "@/lib/utils";

export type EntryMode = "blank" | "sources" | "draft";

interface ModeOption {
  id: EntryMode;
  eyebrow: string;
  label: string;
  description: string;
  icon: LucideIcon;
  iconClassName: string;
}

const modes: ModeOption[] = [
  {
    id: "blank",
    eyebrow: "No draft needed",
    label: "Blank page",
    description: "Let a short interview uncover your first strong direction.",
    icon: LightbulbIcon,
    iconClassName: "bg-copper/12 text-copper",
  },
  {
    id: "sources",
    eyebrow: "Research in hand",
    label: "From sources",
    description: "Turn papers, links, newsletters, and video into grounded angles.",
    icon: LibraryBigIcon,
    iconClassName: "bg-primary/10 text-primary",
  },
  {
    id: "draft",
    eyebrow: "Words on the page",
    label: "Have a draft",
    description: "Paste your honest version and refine it without losing your voice.",
    icon: PenLineIcon,
    iconClassName: "bg-foreground/8 text-foreground",
  },
];

interface ModeSwitcherProps {
  value: EntryMode;
  onChange: (mode: EntryMode) => void;
}

export function ModeSwitcher({ value, onChange }: ModeSwitcherProps) {
  function handleKeyboardSelection(
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) {
    const keyOffsets: Partial<Record<string, number>> = {
      ArrowLeft: -1,
      ArrowRight: 1,
    };
    let nextIndex = currentIndex;

    if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = modes.length - 1;
    } else if (keyOffsets[event.key] !== undefined) {
      nextIndex =
        (currentIndex + (keyOffsets[event.key] ?? 0) + modes.length) %
        modes.length;
    } else {
      return;
    }

    event.preventDefault();
    const nextMode = modes[nextIndex];
    if (!nextMode) return;
    onChange(nextMode.id);
    window.requestAnimationFrame(() => {
      document.getElementById(`entry-mode-${nextMode.id}`)?.focus();
    });
  }

  return (
    <section aria-labelledby="entry-mode-heading" className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-copper/25 bg-copper/8 text-copper">
          <FeatherIcon className="size-4" aria-hidden="true" />
        </span>
        <div>
          <p className="text-[10px] font-semibold tracking-[0.18em] text-copper uppercase">
            Choose your workspace
          </p>
          <h2
            id="entry-mode-heading"
            className="mt-1 font-heading text-3xl tracking-[-0.02em]"
          >
            How do you want to begin?
          </h2>
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Choose a writing workspace"
        className="grid gap-2 sm:grid-cols-3"
      >
        {modes.map((mode, index) => {
          const Icon = mode.icon;
          const isActive = mode.id === value;

          return (
            <button
              key={mode.id}
              id={`entry-mode-${mode.id}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`entry-panel-${mode.id}`}
              tabIndex={isActive ? 0 : -1}
              className={cn(
                "group relative flex min-h-32 items-start gap-3 overflow-hidden rounded-xl border px-4 py-4 text-left transition-[transform,border-color,background-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 sm:min-h-44 sm:flex-col sm:justify-between",
                isActive
                  ? "border-copper/55 bg-[linear-gradient(145deg,var(--card),color-mix(in_oklab,var(--accent)_55%,var(--card)))] shadow-[0_14px_35px_-28px_color-mix(in_oklab,var(--copper)_70%,transparent)]"
                  : "border-border/75 bg-card/55 text-muted-foreground hover:-translate-y-0.5 hover:border-copper/30 hover:bg-card",
              )}
              onClick={() => onChange(mode.id)}
              onKeyDown={(event) => handleKeyboardSelection(event, index)}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-3 right-3 font-heading text-xs transition-colors",
                  isActive ? "text-copper" : "text-muted-foreground/45",
                )}
              >
                0{index + 1}
              </span>

              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105",
                  mode.iconClassName,
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
              </span>

              <span className="min-w-0 pr-4 sm:pr-0">
                <span
                  className={cn(
                    "block text-[9px] font-semibold tracking-[0.16em] uppercase",
                    isActive ? "text-copper" : "text-muted-foreground",
                  )}
                >
                  {mode.eyebrow}
                </span>
                <span
                  className={cn(
                    "mt-1 block font-heading text-xl leading-none",
                    isActive ? "text-foreground" : "text-foreground/75",
                  )}
                >
                  {mode.label}
                </span>
                <span className="mt-2 block text-xs leading-5 text-muted-foreground">
                  {mode.description}
                </span>
              </span>

              {isActive ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-4 bottom-0 h-px bg-gradient-to-r from-transparent via-copper/70 to-transparent"
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

"use client";

import {
  BookOpenTextIcon,
  ScaleIcon,
  SparklesIcon,
  WholeWordIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type SelectionTool =
  | "define"
  | "synonyms"
  | "reword"
  | "legal"
  | "custom";

interface SelectionContextMenuProps {
  open: boolean;
  x: number;
  y: number;
  wordLookupEnabled: boolean;
  onSelect: (tool: SelectionTool) => void;
  onClose: () => void;
}

const items: Array<{
  id: SelectionTool;
  label: string;
  hint: string;
  icon: typeof BookOpenTextIcon;
  needsWord?: boolean;
}> = [
  {
    id: "define",
    label: "Define",
    hint: "Dictionary sense",
    icon: BookOpenTextIcon,
    needsWord: true,
  },
  {
    id: "synonyms",
    label: "Synonyms",
    hint: "Thesaurus nearby",
    icon: WholeWordIcon,
    needsWord: true,
  },
  {
    id: "reword",
    label: "Reword",
    hint: "2–3 alternatives",
    icon: SparklesIcon,
  },
  {
    id: "legal",
    label: "Which law applies?",
    hint: "SA commercial + EU AI",
    icon: ScaleIcon,
  },
  {
    id: "custom",
    label: "Custom instruction",
    hint: "Ask for a precise edit",
    icon: SparklesIcon,
  },
];

export function SelectionContextMenu({
  open,
  x,
  y,
  wordLookupEnabled,
  onSelect,
  onClose,
}: SelectionContextMenuProps) {
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Dismiss selection menu"
        className="fixed inset-0 z-40 cursor-default bg-transparent"
        onClick={onClose}
        onContextMenu={(event) => {
          event.preventDefault();
          onClose();
        }}
      />
      <div
        role="menu"
        className="fixed z-50 w-64 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95"
        style={{
          left: Math.min(x, window.innerWidth - 280),
          top: Math.min(y, window.innerHeight - 320),
        }}
      >
        <p className="border-b px-3 py-2 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          Selection tools
        </p>
        <div className="flex flex-col p-1">
          {items.map((item) => {
            const Icon = item.icon;
            const disabled = Boolean(item.needsWord && !wordLookupEnabled);
            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                disabled={disabled}
                className={cn(
                  "flex items-start gap-3 rounded-lg px-2.5 py-2 text-left transition-colors",
                  disabled
                    ? "cursor-not-allowed opacity-40"
                    : "hover:bg-accent",
                )}
                onClick={() => {
                  if (disabled) return;
                  onSelect(item.id);
                }}
              >
                <Icon className="mt-0.5 size-4 shrink-0 text-copper" />
                <span>
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {disabled
                      ? "Select a short word or phrase"
                      : item.hint}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

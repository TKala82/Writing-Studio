"use client";

import {
  FileTextIcon,
  MailIcon,
  MegaphoneIcon,
  SparklesIcon,
} from "lucide-react";

import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { genreIds, genreList, type GenreId } from "@/lib/genres";

const icons = {
  spark: SparklesIcon,
  file: FileTextIcon,
  letter: MailIcon,
  megaphone: MegaphoneIcon,
} as const;

interface PurposePickerProps {
  value: GenreId;
  onChange: (genre: GenreId) => void;
}

function isGenreId(value: string): value is GenreId {
  return genreIds.some((genreId) => genreId === value);
}

export function PurposePicker({ value, onChange }: PurposePickerProps) {
  return (
    <ToggleGroup
      aria-label="Writing purpose"
      value={[value]}
      onValueChange={(nextValues) => {
        const nextValue = nextValues[0];
        if (nextValue && isGenreId(nextValue)) onChange(nextValue);
      }}
      variant="outline"
      spacing={3}
      className="grid w-full grid-cols-1 sm:grid-cols-2"
    >
      {genreList.map((genre) => {
        const Icon = icons[genre.icon];
        return (
          <ToggleGroupItem
            key={genre.id}
            value={genre.id}
            aria-label={genre.name}
            className="group h-auto min-h-28 w-full items-start justify-start rounded-xl px-4 py-4 text-left whitespace-normal data-[pressed]:ring-1 data-[pressed]:ring-primary"
          >
            <span className="flex w-full gap-3">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition-transform group-hover:-rotate-3 group-data-[pressed]:bg-primary group-data-[pressed]:text-primary-foreground">
                <Icon />
              </span>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="font-semibold">{genre.shortName}</span>
                <span className="text-xs leading-relaxed text-muted-foreground">
                  {genre.description}
                </span>
              </span>
            </span>
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}

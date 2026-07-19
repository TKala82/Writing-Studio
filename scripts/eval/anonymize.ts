import { createHash } from "node:crypto";

import type {
  AnonymizedPair,
  GeneratedCondition,
  OutputLabel,
} from "./types";

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function seededUnit(seed: string): number {
  const prefix = sha256(seed).slice(0, 13);
  return Number.parseInt(prefix, 16) / 0x10000000000000;
}

function stripMetadata(text: string): string {
  return text
    .replace(/^(treatment|control|model|provider)\s*:[^\n]*$/gim, "")
    .trim();
}

export function anonymizePair(
  scenarioId: string,
  treatment: GeneratedCondition,
  control: GeneratedCondition,
  seed: string,
): AnonymizedPair {
  const treatmentFirst = seededUnit(`${seed}:${scenarioId}`) < 0.5;
  const labelToCondition: Record<OutputLabel, "treatment" | "control"> =
    treatmentFirst
      ? { A: "treatment", B: "control" }
      : { A: "control", B: "treatment" };

  return {
    scenarioId,
    seed,
    outputA: stripMetadata(treatmentFirst ? treatment.text : control.text),
    outputB: stripMetadata(treatmentFirst ? control.text : treatment.text),
    labelToCondition,
  };
}

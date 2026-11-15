import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { formatEvolutionMethod } from "@/lib/evolutionMethods";
import type { EvolutionEntry } from "@/lib/data";
import { LANGS } from "@/lib/i18n/dictionary";

// Evolutions whose condition fits no structured kind (Sylveon, Sirfetch'd,
// Gholdengo, ...) carry a note; every note must have a sentence in every language.
describe("notes of 'other' evolutions", () => {
  const evolutions = JSON.parse(
    readFileSync(path.join(process.cwd(), "data/evolutions.json"), "utf-8"),
  ) as EvolutionEntry[];
  const others = evolutions.filter((e) => e.method?.kind === "other");

  it("every 'other' evolution of the shared table has a note", () => {
    expect(others.length).toBeGreaterThan(0);
    for (const e of others) expect(e.method, `id ${e.id}`).toHaveProperty("note");
  });

  it("every note has a text in every language", () => {
    for (const e of others) {
      for (const lang of LANGS) {
        expect(formatEvolutionMethod(e.method!, lang), `id ${e.id} ${lang}`).toBeTruthy();
      }
    }
  });

  it("an 'other' method without a note still shows nothing", () => {
    expect(formatEvolutionMethod({ kind: "other" }, "de")).toBeNull();
  });
});

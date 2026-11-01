// How a boss name from nuzlocke.app breaks down into people, and how it is put
// back together in another language - shared by generate-trainer-names.mjs
// (which people to look up) and import-nuzlocke-app.mjs (the pack's names).
//
//   "Mars & Jupiter"        -> Mars + Jupiter        -> "Mars & Jupiter"
//   "Tabitha & Grunt"       -> Tabitha (+ a grunt)   -> "Kalle & Rüpel"
//   "Island Kahuna Hala"    -> Hala                  -> "Hala" (title dropped)
//   "Ilima's trial"         -> Ilima                 -> "Prüfung von Elima"
// Titles are dropped in the other languages rather than guessed (several are
// gendered there); English keeps the source's name as it is.

const LANGS = ["de", "fr", "es", "it"];
const TITLES = /^(Island Kahuna|Captain|Champion|Master|Ultra)\s+/i;
const TRIAL = /^(.+?)['’]s trial$/i;
// Not a person: stays out of the lookups, translated directly.
const EXTRAS = {
  grunt: { de: "Rüpel", fr: "Sbire", es: "Recluta", it: "Recluta" },
  employee: { de: "Angestellter", fr: "Employé", es: "Empleado", it: "Impiegato" },
};
const TRIAL_OF = { de: "Prüfung von {name}", fr: "Épreuve de {name}", es: "Prueba de {name}", it: "Prova di {name}" };

const tidy = (text) => text.replace(/\s+/g, " ").trim();
const parts = (name) => tidy(name).split(/\s*&\s*/).map(tidy).filter(Boolean);
const person = (part) => tidy(part).replace(TITLES, "");

// The people a boss name mentions (no grunts, no titles, no trial suffix).
export function personNames(english) {
  const name = tidy(english);
  const trial = name.match(TRIAL);
  if (trial) return [person(trial[1])];
  return parts(name)
    .filter((part) => !EXTRAS[part.toLowerCase()])
    .map(person);
}

// The boss's names in all five languages, or null when some person in it has
// no known name (the caller keeps English everywhere then).
export function composeBossName(english, table) {
  const name = tidy(english);
  const out = { en: name };
  const trial = name.match(TRIAL);
  for (const lang of LANGS) {
    if (trial) {
      const who = table[person(trial[1])]?.[lang];
      if (!who) return null;
      out[lang] = TRIAL_OF[lang].replace("{name}", who);
      continue;
    }
    const localized = parts(name).map((part) => EXTRAS[part.toLowerCase()]?.[lang] ?? table[person(part)]?.[lang]);
    if (localized.some((n) => !n)) return null;
    out[lang] = localized.join(" & ");
  }
  return { de: out.de, en: out.en, fr: out.fr, es: out.es, it: out.it };
}

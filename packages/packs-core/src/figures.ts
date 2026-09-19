/**
 * The no-figures rule — plan §3.1, enforced here rather than by convention.
 *
 * Any number the agent produces before a tool returns is parametric recall. Persisted
 * prose matters more than narration, because it is saved, screenshotted and trusted.
 *
 * THE RULE THIS FILE EXISTS TO HOLD: match the widest numeric class and subtract an
 * ENUMERATED allowlist. Never match a narrow class and hope it is complete, and never
 * infer permission from a pattern. Concretely, each of these looks reasonable and leaks:
 *
 *   anchor on `$` and `%`            →  passes "a 5% rise" and "$100"
 *   allow digits preceded by a letter →  passes "USD100", "EUR250", "M5", "R5000"
 *   test \p{Nd} (decimal digits)      →  passes "Ⅹ" (Nl) and "〡〢〣" (No)
 *   test only the NFKC-normalised form →  passes "Ⅹ", because NFKC folds U+2169 to "X"
 *                                         and destroys the numeric property first
 *
 * The last pair interact: widening the class does nothing if normalisation has already
 * turned the numeral into a letter, which is why both forms are tested below.
 */

/** Digit-bearing names that are identifiers, not quantities. Closed, reviewed, additive. */
export const FIGURE_LEXICON: readonly string[] = [
  "COVID-19",
  "PM2.5",
  "PM10",
  "H1N1",
  "H5N1",
  "CO2",
  "G7",
  "G8",
  "G20",
  "EU27",
  "IPv4",
  "IPv6",
  "2D",
  "3D",
];

const FIG_TOKEN = /\{\{f\d+\}\}/g;

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const lexiconRe = (lexicon: readonly string[]) =>
  new RegExp(
    `(?<![A-Za-z0-9])(?:${[...lexicon]
      .sort((a, b) => b.length - a.length) // longest-first: PM2.5 before PM10-ish prefixes
      .map(escapeRe)
      .join("|")})(?![A-Za-z0-9])`,
    "g",
  );

const DEFAULT_LEX_RE = lexiconRe(FIGURE_LEXICON);

/**
 * True when `text` contains a numeral the model supplied rather than resolved.
 *
 * NFKC first, or fullwidth "４５０" and circled "②" bypass the digit class entirely.
 *
 * KNOWN GAP, stated rather than discovered later: spelled-out numbers ("three hundred
 * million") contain no numeral and pass. §3.1's scope is "any number"; this catches any
 * NUMERAL. Closing the spelled-out case needs a different mechanism and is an eval item.
 */
export function hasBareFigure(text: string, lexicon: readonly string[] = FIGURE_LEXICON): boolean {
  const re = lexicon === FIGURE_LEXICON ? DEFAULT_LEX_RE : lexiconRe(lexicon);

  const strip = (s: string) => {
    re.lastIndex = 0;
    return s.replace(FIG_TOKEN, " ").replace(re, " ");
  };

  // BOTH forms, because each catches what the other misses:
  //   raw  — Nl/No characters are numbers in their own right (Ⅹ, ②, ½, 〡)
  //   NFKC — folds compatibility forms that hide a digit from a naive scan
  return /\p{N}/u.test(strip(text)) || /\p{N}/u.test(strip(text.normalize("NFKC")));
}

export const FIGURE_REPAIR_MESSAGE =
  "Prose.text may not contain figures. Move each number into figures[] and reference it as {{f0}}.";

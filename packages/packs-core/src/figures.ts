/**
 * The no-figures rule — plan §3.1, enforced here rather than by convention.
 *
 * Any number the agent produces before a tool returns is parametric recall. Persisted
 * prose matters more than narration, because it is saved, screenshotted and trusted.
 *
 * DESIGN NOTE, because this has been got wrong twice:
 *
 *   The permission must be ENUMERATED, not inferred. An earlier rule allowed "any digits
 *   preceded by a letter" so that G7 and H1N1 would pass — which also passed USD100,
 *   EUR250, M5 and R5000. A letter in front of a number is the ordinary shape of a
 *   fabricated financial or scientific figure, so a rule of that shape cannot work.
 *   An even earlier rule anchored on `$` and `%` and exempted exactly the two forms it
 *   most needed to catch.
 *
 *   What is allowed is therefore a closed list, reviewed by a human, and nothing else.
 *
 *   Third failure, same family: the test was `\p{Nd}` — DECIMAL digits. Unicode has two
 *   other numeric categories that NFKC does not fold into decimals, so "chapter Ⅹ" (Nl,
 *   Roman numeral) and "〡〢〣" (No, Suzhou) passed. The test is now `\p{N}`, which is every
 *   numeric character. The lesson each time has been the same: match the WIDEST class and
 *   subtract an enumerated allowlist, never match a narrow class and hope it is complete.
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

  // BOTH forms are tested, and each catches something the other misses.
  //
  //   raw   — Nl/No characters are numbers in their own right (Ⅹ, ②, ½, 〡).
  //   NFKC  — folds compatibility forms that hide a digit from a naive scan.
  //
  // Testing only the normalised form is a trap that cost a round: NFKC maps Ⅹ (U+2169,
  // ROMAN NUMERAL TEN) to the ASCII letter "X", so normalising DESTROYS the numeric
  // property before it can be detected. Widening the class to \p{N} did nothing on its
  // own, because by then the character was a letter.
  return /\p{N}/u.test(strip(text)) || /\p{N}/u.test(strip(text.normalize("NFKC")));
}

export const FIGURE_REPAIR_MESSAGE =
  "Prose.text may not contain figures. Move each number into figures[] and reference it as {{f0}}.";

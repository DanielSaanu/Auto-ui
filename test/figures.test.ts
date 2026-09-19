import { describe, it, expect } from "vitest";
import { hasBareFigure, FIGURE_LEXICON } from "@orrery/packs-core";

/**
 * The figure validator has been wrong twice, both times because the permission was
 * INFERRED from a pattern rather than enumerated. These tests are therefore mostly
 * generative: hand-picked cases are how both broken versions passed review.
 */

describe("hasBareFigure — regression cases from the two broken versions", () => {
  // Version 1 anchored on $ and % and exempted exactly what it needed to catch.
  it.each(["a 5% rise", "$100", "up 12%", "$1.5bn"])("rejects %j (v1 leak)", (s) => {
    expect(hasBareFigure(s)).toBe(true);
  });

  // Version 2 allowed "any digits preceded by a letter", to admit G7 — which admitted
  // every currency code, magnitude letter and unit abbreviation in front of a number.
  it.each([
    "raised USD100 million in funding",
    "GDP hit EUR250 billion",
    "a magnitude M5 earthquake struck",
    "grew to R5000 per capita",
    "about GBP40 per head",
  ])("rejects %j (v2 leak)", (s) => {
    expect(hasBareFigure(s)).toBe(true);
  });
});

describe("hasBareFigure — plain numerals", () => {
  it.each([
    "in 2024",
    "top 3",
    "340,003,797 people",
    "1.5 trillion",
    "grew 2.36 percent",
    "the figure is 7",
  ])("rejects %j", (s) => {
    expect(hasBareFigure(s)).toBe(true);
  });
});

describe("hasBareFigure — unicode digit forms", () => {
  it.each([
    ["fullwidth", "population is now ４５０ million"],
    ["circled", "② place overall"],
    ["arabic-indic", "about ٣٤٠ million"],
    ["devanagari", "roughly २० percent"],
  ])("rejects %s digits", (_name, s) => {
    expect(hasBareFigure(s)).toBe(true);
  });
});

describe("hasBareFigure — what must still pass", () => {
  it.each([
    "the G7 met today",
    "H1N1 and H5N1",
    "EU27 average",
    "COVID-19 era",
    "PM2.5 levels rose",
    "CO2 output",
    "pulling population and GDP now",
    "it is {{f0}} people",
    "GDP grew {{f0}} to {{f1}}",
    "",
  ])("accepts %j", (s) => {
    expect(hasBareFigure(s)).toBe(false);
  });

  it("accepts every lexicon entry on its own", () => {
    for (const entry of FIGURE_LEXICON) {
      expect(hasBareFigure(entry), `lexicon entry ${entry} was rejected`).toBe(false);
    }
  });

  it("accepts every lexicon entry inside a sentence", () => {
    for (const entry of FIGURE_LEXICON) {
      expect(hasBareFigure(`the ${entry} figure is reported`), entry).toBe(false);
    }
  });
});

describe("hasBareFigure — property test over generated figures", () => {
  const PREFIXES = ["", "$", "£", "€", "USD", "EUR", "GBP", "M", "R", "N", "approx ", "~", "+", "-"];
  const SUFFIXES = ["", "%", "bn", "m", "k", " million", " billion", " per cent", "th", "st"];
  const NUMBERS = ["1", "7", "42", "100", "2024", "1.5", "340,003,797", "0.001", "12"];
  const CARRIERS = [
    (f: string) => f,
    (f: string) => `the figure is ${f}`,
    (f: string) => `it rose to ${f} last year`,
    (f: string) => `(${f})`,
    (f: string) => `GDP ${f} and climbing`,
  ];

  it("rejects every prefix × number × suffix × carrier combination", () => {
    const missed: string[] = [];
    for (const p of PREFIXES) {
      for (const n of NUMBERS) {
        for (const s of SUFFIXES) {
          for (const carry of CARRIERS) {
            const text = carry(`${p}${n}${s}`);
            if (!hasBareFigure(text)) missed.push(text);
          }
        }
      }
    }
    expect(missed, `figures that evaded the validator:\n${missed.slice(0, 20).join("\n")}`).toEqual(
      [],
    );
  });

  it("a lexicon term next to a real figure still rejects", () => {
    // The dangerous case: a permitted token must not shelter an adjacent numeral.
    for (const entry of FIGURE_LEXICON) {
      expect(hasBareFigure(`${entry} rose 12 percent`), entry).toBe(true);
      expect(hasBareFigure(`${entry}: $400`), entry).toBe(true);
    }
  });

  it("does not let a lexicon prefix smuggle a longer number", () => {
    // "G7" is allowed; "G70" and "G7000" are not — the boundary must be exact.
    expect(hasBareFigure("the G70 summit")).toBe(true);
    expect(hasBareFigure("G7000 units")).toBe(true);
    expect(hasBareFigure("CO25 tonnes")).toBe(true);
  });

  it("{{fN}} placeholders are the only numeric escape", () => {
    expect(hasBareFigure("{{f0}} and {{f11}}")).toBe(false);
    // A malformed placeholder is not a placeholder, and must not pass.
    expect(hasBareFigure("{{f}} and 5")).toBe(true);
    expect(hasBareFigure("{f0} people")).toBe(true);
  });
});

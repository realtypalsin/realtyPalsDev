// backend/src/lib/chat/resolvePointer.ts
//
// "What about the second one?" — as the MODEL should read it.
//
// The pipeline resolves ordinals and pronouns upstream: by the time a prompt is
// built, `the second one` has already become a project id, and the facts block
// carries that one project. The model was still shown the buyer's literal
// words, so it saw a question about a second thing beside a block containing
// one thing, and did the reasonable thing with that mismatch — explained it:
//
//   "The user asks 'What about the second one?', but the provided verified
//    facts block only contains information for a single project…"
//   "We only have records for Samridhi Daksh Avenue in Sector 150 Noida, as no
//    second project was provided in the database."
//   "our verified data currently holds active records only for Samridhi Daksh
//    Avenue in Sector 150."
//
// Three runs, three phrasings, each one a false statement about our coverage —
// Sector 150 holds nineteen projects. Blocking the phrasings was tried first
// and is unwinnable: the model rewrote around every pattern added, because the
// mismatch it is explaining is real.
//
// So remove the mismatch. Substitute the resolved name for the pointer, and the
// model reads "What about Samridhi Daksh Avenue?" — a question its facts block
// answers exactly, with nothing left to apologise for.
//
// Deliberately only touches the copy handed to the model. Routing gates read
// the raw message and must keep seeing what the buyer typed.

/**
 * Pointer phrases, longest first.
 *
 * Order matters: "the first one" has to be tried before "the first", and both
 * before a bare "it", or the substitution lands mid-phrase and leaves debris.
 *
 * Bare pronouns are included but constrained at the call site — see
 * `substitutePointer`, which requires the message to be short and to carry no
 * project name of its own before it will rewrite an "it".
 */
const ORDINAL_WORDS = 'first|second|third|fourth|fifth|sixth|1st|2nd|3rd|4th|5th|6th|last|latter|former'

const POINTER_PATTERNS: RegExp[] = [
  new RegExp(`\\bthe\\s+(?:${ORDINAL_WORDS})\\s+(?:one|option|project|society|property)\\b`, 'i'),
  new RegExp(`\\bthe\\s+(?:${ORDINAL_WORDS})\\b`, 'i'),
  /\bthat\s+(?:one|project|society|property)\b/i,
  /\bthis\s+(?:one|project|society|property)\b/i,
  /\bthe\s+(?:project|society|property)\b/i,
]

/** A bare pronoun standing in for the project: "what about it?", "is it ready?" */
const BARE_PRONOUN = /\b(?:it|its|it's)\b/i

/** Any capitalised multi-word run — a sign the buyer named something themselves. */
const LOOKS_NAMED = /\b[A-Z][a-z]+\s+[A-Z][a-z]+/

export interface PointerSubstitution {
  /** The question as the model should read it. */
  text: string
  /** Whether anything was replaced. */
  substituted: boolean
}

/**
 * Rewrite a resolved pointer into the project it resolved to.
 *
 * `projectName` is what the pipeline already decided the buyer meant. When it
 * is absent, a placeholder, or the buyer named the project themselves, the
 * message is returned untouched — there is no mismatch to remove.
 */
export function substitutePointer(message: string, projectName: string | null | undefined): PointerSubstitution {
  const text = String(message ?? '')
  const name = String(projectName ?? '').trim()

  // "this project" is the fallback the router uses when it has no row. It is
  // not a name and substituting it produces a sentence that says nothing.
  if (!name || name.toLowerCase() === 'this project' || name.length < 3) {
    return { text, substituted: false }
  }
  // Already named, by the buyer or by an earlier substitution.
  if (text.toLowerCase().includes(name.toLowerCase())) {
    return { text, substituted: false }
  }

  for (const pattern of POINTER_PATTERNS) {
    if (pattern.test(text)) {
      return { text: text.replace(pattern, name), substituted: true }
    }
  }

  /**
   * A bare "it" only counts on a short turn that names nothing else.
   *
   * "Is it ready to move?" is a pointer. "Godrej Woods — is it worth it given
   * the metro is 3 km away?" contains two, neither of which should be replaced:
   * the buyer named the project, and the second "it" is not the project at all.
   * Length and the absence of a capitalised name are cheap proxies that hold on
   * every follow-up shape measured.
   */
  if (text.length <= 80 && !LOOKS_NAMED.test(text) && BARE_PRONOUN.test(text)) {
    return { text: text.replace(BARE_PRONOUN, name), substituted: true }
  }

  return { text, substituted: false }
}

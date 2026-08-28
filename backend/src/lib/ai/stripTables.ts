// backend/src/lib/ai/stripTables.ts
//
// Drops markdown tables out of a stream, for turns where we have already
// rendered one ourselves.
//
// The prompt tells the model a table is on screen and asks it not to draw
// another. That is an instruction, not a guarantee — and the failure is
// expensive twice over: the buyer sees the same figures in two grids, and we
// paid output tokens for the duplicate. This is the mechanical backstop.
//
// It has to work on a stream. Tokens leave as they arrive, so by the time a
// table is recognisable part of it has already gone out. The filter therefore
// works a line at a time: text accumulates until a newline, and only then is
// the completed line judged and either forwarded or dropped.
//
// Three things it has to get right, each of which was a way to corrupt a good
// answer rather than merely fail to trim a bad one:
//
//   - A pipe inside a fenced code block is not a table row.
//   - A heading whose only content was the dropped table has to go too, or the
//     buyer is left reading "### Comparison" with nothing under it.
//   - Dropping a block leaves a run of blank lines where it was.

/** A table row or its `| :--- |` separator. Leading whitespace is allowed. */
function isTableLine(line: string): boolean {
  return /^\s*\|/.test(line)
}

/** A markdown ATX heading, which may be introducing the table we are dropping. */
function isHeading(line: string): boolean {
  return /^\s{0,3}#{1,6}\s/.test(line)
}

function isFence(line: string): boolean {
  return /^\s*```/.test(line)
}

export interface TableStripper {
  /** Feed a chunk of streamed text. Emits whatever is safe to forward. */
  write(text: string): void
  /** Flush the trailing partial line. Call once, when the stream ends. */
  end(): void
  /** True if anything was actually dropped — worth logging, not worth acting on. */
  droppedAnything(): boolean
}

/**
 * Wraps an emit function with a line filter that removes markdown tables.
 *
 * One line of lookahead is held for headings: a heading is only forwarded once
 * we know what follows it, because a heading immediately followed by a table
 * row belongs to that table and goes with it.
 */
export function createTableStripper(emit: (text: string) => void): TableStripper {
  let partial = ''
  let inFence = false
  let pendingHeading: string | null = null
  /** Blank lines held with a pending heading, replayed only if it survives. */
  let pendingBlanks = 0
  let lastEmittedBlank = true // suppresses a leading blank line too
  let dropped = false

  const emitLine = (line: string) => {
    const blank = line.trim() === ''
    // Collapse the run of blank lines a dropped table leaves behind.
    if (blank && lastEmittedBlank) return
    lastEmittedBlank = blank
    emit(line + '\n')
  }

  const handleLine = (line: string) => {
    if (isFence(line)) {
      inFence = !inFence
      if (pendingHeading !== null) {
        emitLine(pendingHeading)
        for (let i = 0; i < pendingBlanks; i++) emitLine('')
        pendingHeading = null
        pendingBlanks = 0
      }
      emitLine(line)
      return
    }

    // Inside a fence everything is literal, pipes included.
    if (inFence) {
      emitLine(line)
      return
    }

    if (isTableLine(line)) {
      dropped = true
      // The heading we were holding was introducing this table. Drop it, and
      // the blank line that separated them.
      pendingHeading = null
      pendingBlanks = 0
      return
    }

    // A blank line does not resolve a held heading — markdown puts one between
    // a heading and the block it introduces, so flushing here would emit the
    // heading just before discovering the table it belonged to.
    if (line.trim() === '' && pendingHeading !== null) {
      pendingBlanks++
      return
    }

    if (pendingHeading !== null) {
      emitLine(pendingHeading)
      for (let i = 0; i < pendingBlanks; i++) emitLine('')
      pendingHeading = null
      pendingBlanks = 0
    }

    if (isHeading(line)) {
      // Hold it: we cannot tell yet whether it belongs to a table.
      pendingHeading = line
      return
    }

    emitLine(line)
  }

  return {
    write(text: string) {
      if (!text) return
      partial += text
      let nl = partial.indexOf('\n')
      while (nl !== -1) {
        handleLine(partial.slice(0, nl))
        partial = partial.slice(nl + 1)
        nl = partial.indexOf('\n')
      }
    },

    end() {
      // A trailing line with no newline. If it looks like a table row it is one
      // — a stream that ends mid-table is exactly the duplicate we are removing.
      if (partial) {
        if (!inFence && isTableLine(partial)) {
          dropped = true
        } else {
          if (pendingHeading !== null) {
            emit(pendingHeading + '\n')
            pendingHeading = null
          }
          emit(partial)
        }
        partial = ''
      }
      // A heading with nothing after it was introducing something that is gone.
      pendingHeading = null
      pendingBlanks = 0
    },

    droppedAnything: () => dropped,
  }
}

/**
 * Non-streaming form, for text already assembled.
 *
 * Used for the copy that gets persisted and cached: the buyer saw the filtered
 * stream, so the transcript and the cache entry must match what they read
 * rather than what the model sent.
 */
export function stripTables(text: string): string {
  let out = ''
  const s = createTableStripper((chunk) => {
    out += chunk
  })
  s.write(text)
  s.end()
  return out.replace(/\n{3,}/g, '\n\n').trimEnd()
}

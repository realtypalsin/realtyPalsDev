import test from 'node:test'
import assert from 'node:assert/strict'
import { substitutePointer } from '../resolvePointer'

const P = 'Samridhi Daksh Avenue'

test('an ordinal becomes the project it resolved to', () => {
  for (const q of [
    'What about the second one?',
    'Tell me about the first one',
    'the 3rd one please',
    'What about that project?',
    'Is this one ready to move?',
    'How much is the last one?',
  ]) {
    const out = substitutePointer(q, P)
    assert.ok(out.substituted, `not substituted: ${q}`)
    assert.ok(out.text.includes(P), `name missing from: ${out.text}`)
    assert.ok(!/\bthe (first|second|third|last)\b/i.test(out.text), `pointer survived: ${out.text}`)
  }
})

test('a bare pronoun counts only on a short turn that names nothing', () => {
  assert.equal(substitutePointer('Is it ready to move?', P).text, `Is ${P} ready to move?`)
  // The buyer named the project themselves, and the second "it" is not the
  // project — rewriting either would produce nonsense.
  const long = 'Godrej Woods — is it worth it given the metro is three kilometres away and possession slips to 2027?'
  assert.equal(substitutePointer(long, P).substituted, false)
})

test('a message that already names the project is left alone', () => {
  const q = `Tell me about ${P}`
  assert.equal(substitutePointer(q, P).substituted, false)
  assert.equal(substitutePointer(q, P).text, q)
})

test('the router placeholder is not a name', () => {
  assert.equal(substitutePointer('What about the second one?', 'this project').substituted, false)
  assert.equal(substitutePointer('What about the second one?', null).substituted, false)
  assert.equal(substitutePointer('What about the second one?', '').substituted, false)
})

test('a question with no pointer is untouched', () => {
  const q = 'What is the stamp duty in UP for a woman buyer?'
  assert.equal(substitutePointer(q, P).text, q)
  assert.equal(substitutePointer(q, P).substituted, false)
})

test('only the pointer is replaced, the rest of the sentence survives', () => {
  const out = substitutePointer('What about the second one, and is possession before 2027?', P)
  assert.equal(out.text, `What about ${P}, and is possession before 2027?`)
})

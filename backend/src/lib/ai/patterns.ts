// Single source of truth for all guardrail patterns.
export const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(?:all\s+|previous\s+|your\s+)*(?:system\s+|prior\s+)?instructions/i,
  /disregard\s+(your\s+|the\s+)?(system\s+|prior\s+|previous\s+)?prompt/i,
  /you\s+are\s+now\s+/i, // Tightened: any "you are now" is suspicious; lookahead escapes are trivial
  /repeat\s+(the\s+|your\s+|above\s+|following\s+)(text|prompt|instructions)/i,
  /\bDAN\b|\bACT\s+AS\b/i,
  /pretend\s+(?:you\s+)?(are|have\s+no|to be|that you)/i, // Expanded to cover more pretend framings
  /hypothetically\s+you\s+/i, // "hypothetically you are..."
  /for\s+a\s+(?:screenplay|novel|story|scene|script|game)/i, // Fiction framings
  /let'?s?\s+play\s+a?\s+(?:game|scenario|roleplay|role\s+play)/i, // Roleplay framings
  /my\s+(?:grandmother|friend|uncle|teacher|boss)\s+(?:told|said|used to|would)/i, // Authority transfer attempts
  /translate\s+(?:the\s+)?following\s+(?:and\s+then\s+)?(?:execute|follow|obey|run)/i, // Indirect instruction injection
  /override\s+(your\s+)?(programming|training|instructions)/i,
  /what\s+(is|are)\s+your\s+system\s+prompt/i,
  /reveal\s+(your\s+)?(system|internal)\s+(prompt|instructions)/i,
  /(reveal|print|show|repeat|output|quote)\s+(your|the|entire)\s+(system\s+)?(prompt|instructions)/i,
  /forget\s+(everything|all|your instructions)/i,
  /bypass\s+(all\s+)?filters/i,
  /enter\s+(developer|jailbreak)\s+mode/i,
  /system override/i,
  /quote\s+(the\s+)?entire\s+document/i,
  // Hindi/Hinglish jailbreak attempts (including pure Devanagari)
  /system\s+prompt\s+batao/i,
  /apne\s+rules\s+bhool\s+jao/i,
  /system\s+prompt\s+kya\s+hai/i,
  /apne\s+instructions\s+bhool\s+jao/i,
  /rules\s+mat\s+mano/i,
  /pehle\s+wale\s+instructions\s+ignore/i,
  /koi\s+bhi\s+role\s+play\s+karo/i,
  // Devanagari script jailbreak patterns (most common Hindi phrases)
  /[ऀ-ॿ]*(?:सिस्टम|प्रॉम्प्ट|निर्देश)[ऀ-ॿ]*/i, // System/prompt/instruction in Devanagari
  /[ऀ-ॿ]*(?:भूल|छुपा|दिखा)[ऀ-ॿ]*/i, // Forget/hide/show in Devanagari
  /\[system\]/i,
  /<\|im_start\|>/i,
  /<\|endoftext\|>/i,
  /### instruction/i,
  /\[INST\]/i,
  /base64.*decode/i,
  /rot13/i,
]

export const COMPETITOR_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /magicbricks/i, name: 'MagicBricks' },
  { pattern: /99acres/i, name: '99acres' },
  { pattern: /housing\.com/i, name: 'Housing.com' },
  { pattern: /nobroker/i, name: 'NoBroker' },
  { pattern: /proptiger/i, name: 'PropTiger' },
  { pattern: /squareyards/i, name: 'Square Yards' },
  { pattern: /makaan\.com/i, name: 'Makaan' },
]

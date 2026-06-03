import Anthropic from "@anthropic-ai/sdk";

// Robust JSON extractor for Anthropic model responses.
//
// The greedy regex /\{[\s\S]*\}/ fails when the model appends trailing prose
// after the JSON object — any stray `}` in that prose extends the match past
// the real object boundary, producing "Unexpected non-whitespace character".
// Brace-depth counting finds the exact closing `}` regardless of what follows.
//
// Also handles: markdown code fences, escaped characters inside strings.
export function extractJson(content: Anthropic.Messages.ContentBlock[]): unknown {
  const raw = content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map(b => b.text)
    .join("");

  // Strip markdown code fences (```json ... ``` or ``` ... ```)
  const text = raw.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "");

  const start = text.indexOf("{");
  if (start === -1) throw new Error("No JSON object in model response");

  let depth = 0;
  let inStr  = false;
  let esc    = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (esc)                  { esc = false; continue; }
    if (ch === "\\" && inStr) { esc = true;  continue; }
    if (ch === '"')           { inStr = !inStr; continue; }
    if (inStr)                continue;
    if (ch === "{")           depth++;
    else if (ch === "}" && --depth === 0) {
      try {
        return JSON.parse(text.slice(start, i + 1));
      } catch (err) {
        throw new Error(`JSON parse failed: ${err instanceof Error ? err.message : err}`);
      }
    }
  }
  throw new Error("Unterminated JSON object in model response");
}

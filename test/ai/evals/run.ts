// Receipt eval set (AI-5). Run with: npm run eval:receipts
// Calls the real model, so it needs ANTHROPIC_API_KEY and isn't part of npm test.
// Run it whenever the prompt, the threshold, or the model changes.
//
// Each case passes when every field the reader suggests (confidence >= 0.8)
// matches the expected value. A field the reader leaves empty is a "gap", not a
// failure: a person fills it in. A confident wrong answer is the failure we care
// about, because the employee might not notice it.
import { readdir, readFile } from "node:fs/promises";
import { modelFromEnv } from "../../../src/ai/model.js";
import { suggestFields } from "../../../src/ai/receipts/reader.js";

type Case = { ocrText: string; expect: Record<string, string | null> };

const dir = new URL("./cases/", import.meta.url);
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY is not set; the eval set needs the real model.");
  process.exit(2);
}
const model = modelFromEnv();
let wrong = 0, gaps = 0;
for (const name of (await readdir(dir)).filter((f) => f.endsWith(".json")).sort()) {
  const c: Case = JSON.parse(await readFile(new URL(name, dir), "utf8"));
  const { suggestions } = await suggestFields(model, c.ocrText);
  const notes: string[] = [];
  for (const [field, expected] of Object.entries(c.expect)) {
    const got = suggestions?.[field as keyof typeof suggestions] ?? null;
    if (got === null && expected !== null) { gaps++; notes.push(`${field}: gap`); }
    else if (got !== null && got.toLowerCase() !== String(expected).toLowerCase()) {
      wrong++; notes.push(`${field}: got ${JSON.stringify(got)}, want ${JSON.stringify(expected)}`);
    }
  }
  console.log(`${notes.some((n) => !n.endsWith("gap")) ? "FAIL" : "ok  "} ${name}${notes.length ? `  (${notes.join("; ")})` : ""}`);
}
console.log(`\nconfident wrong answers: ${wrong}, gaps for a person to fill: ${gaps}`);
process.exit(wrong ? 1 : 0);

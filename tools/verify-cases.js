#!/usr/bin/env node
/*
 * Regex Noir — case data verifier
 *
 * Usage:  node tools/verify-cases.js
 *
 * Loads the CASES array straight out of index.html (between the
 * CASES_START / CASES_END markers) and checks, for every case:
 *   1. the reference solutionPattern produces exactly expectedMatches
 *   2. every documented alternative solution also passes
 *   3. every documented trap (common wrong answer) is rejected
 *
 * Exits with code 1 if anything is off, so it can run in CI.
 * Keep ALTERNATIVES / TRAPS in sync with SOLUTIONS.md.
 */
const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const block = html.split("/*CASES_START*/")[1].split("/*CASES_END*/")[0];
// eslint-disable-next-line no-eval
const CASES = eval(block + ";CASES");

// [pattern, flags]; flags default to the case's reference flags
const ALTERNATIVES = {
  "case-01": [[String.raw`PHANTOM_\d\d\d`], [String.raw`PHANTOM_\d+`]],
  "case-02": [[String.raw`SN.\d\d+`], [String.raw`SN\W\d{2,}`]],
  "case-03": [[String.raw`^SIG\b.*`], [String.raw`^SIG( .*)?$`]], // note: ^SIG(\s.*)?$ fails — \s eats the newline
  "case-04": [[String.raw`\b[\da-f]{8}\b`], [String.raw`(?<==)[0-9a-f]{8}\b`]],
  "case-05": [[String.raw`<.+?>`], [String.raw`<[A-Z][^>]*>`]],
  "case-06": [[String.raw`\b(0x\w+) \1\b`]],
  "case-07": [[String.raw`(?:GET|POST) https?:\/\/\S+ [45]\d{2}`]],
  "case-08": [[String.raw`"\w+":"([^"]*)"`], [String.raw`:"(\w+)"`]],
  "case-09": [[String.raw`^(?=.*\d)(?=.*[A-Z])(?!.*pass).{8,}`]],
  "case-10": [[String.raw`^([\d.]+)[^:]+:0[2-4]:.+" 40[13]`]],
};

const TRAPS = {
  "case-02": [[String.raw`SN.\d+`]],
  "case-03": [[String.raw`^SIG\b.*$`, "g"], [String.raw`SIG.*`]],
  "case-04": [[String.raw`[a-f0-9]{8}`], [String.raw`\b[a-f0-9]{8}\b`, "gi"]],
  "case-05": [[String.raw`<.*>`], [String.raw`<[^>]*>`]],
  "case-06": [[String.raw`(\w+) \1`], [String.raw`\b(\w+) \1\b`, "gi"]],
  "case-07": [[String.raw`https?://\S+ [45]\d\d`], [String.raw`GET|POST https?://\S+ [45]\d\d`]],
  "case-08": [[String.raw`"(\w+)":"(.*?)"`], [String.raw`":"(.*)"`]],
  "case-09": [[String.raw`^(?=.*\d)(?=.*[A-Z]).{8,}$`], [String.raw`(?=.*\d)(?=.*[A-Z])(?!.*pass).{8,}`, "g"]],
  "case-10": [[String.raw`^([\d.]+).*:0[2-4]:.*40[13]`], [String.raw`^(\S+) .*?:0[2-4]:[^"]*"[^"]*" 40[13]`]],
};

function run(c, pattern, flags) {
  const re = new RegExp(pattern, flags);
  const text = c.lines.join("\n");
  const out = [];
  if (!flags.includes("g")) {
    const m = re.exec(text);
    if (m) out.push(m);
  } else {
    let m;
    while ((m = re.exec(text)) !== null) { out.push(m); if (m[0] === "") re.lastIndex++; }
  }
  return out.map((m) => (c.matchMode === "group" ? m[1] : m[0]));
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

let failures = 0;
for (const c of CASES) {
  const ref = run(c, c.solutionPattern, c.flags);
  const okRef = same(ref, c.expectedMatches);
  console.log(`${okRef ? "PASS" : "FAIL"}  ${c.id}  /${c.solutionPattern}/${c.flags}`);
  if (!okRef) { failures++; console.log("      got", JSON.stringify(ref)); }

  for (const [p, f = c.flags] of ALTERNATIVES[c.id] || []) {
    const ok = same(run(c, p, f), c.expectedMatches);
    console.log(`  ${ok ? "alt ok   " : "ALT FAIL "} /${p}/${f}`);
    if (!ok) failures++;
  }
  for (const [p, f = c.flags] of TRAPS[c.id] || []) {
    const rejected = !same(run(c, p, f), c.expectedMatches);
    console.log(`  ${rejected ? "trap ok  " : "TRAP PASSES"} /${p}/${f}`);
    if (!rejected) failures++;
  }
}
console.log(failures ? `\n${failures} problem(s) found.` : "\nAll cases verified.");
process.exit(failures ? 1 : 0);

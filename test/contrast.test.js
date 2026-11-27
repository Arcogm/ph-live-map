import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const CSS = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

function token(name) {
  const match = CSS.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  assert.ok(match, `--${name} is a hex color in src/styles.css`);
  return match[1];
}

function luminance(hex) {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

test("--faint clears 4.5:1 on both panel surfaces", () => {
  const faint = token("faint");
  for (const surface of ["surface", "surface-2"]) {
    const ratio = contrast(faint, token(surface));
    assert.ok(ratio >= 4.5, `--faint on --${surface} is ${ratio.toFixed(2)}:1`);
  }
});

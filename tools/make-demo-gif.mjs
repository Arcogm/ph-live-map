/**
 * Build docs/demo.gif from a set of PNG frames without ffmpeg.
 *
 * Usage: node tools/make-demo-gif.mjs frame1.png frame2.png [frame3.png ...]
 * Each frame holds for DELAY_MS; frames are resized nowhere, so they must share
 * dimensions (the tool uses the first frame's).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";
import gifenc from "gifenc";

const { GIFEncoder, applyPalette, quantize } = gifenc;

const DELAY_MS = 2200;
const frames = process.argv.slice(2);

if (frames.length < 2) {
  console.error("Usage: node tools/make-demo-gif.mjs frame1.png frame2.png [frame3.png ...]");
  process.exit(1);
}

const gif = GIFEncoder();

for (const path of frames) {
  const png = PNG.sync.read(readFileSync(path));
  const rgba = new Uint8Array(png.data);
  const palette = quantize(rgba, 128);
  const index = applyPalette(rgba, palette);
  gif.writeFrame(index, png.width, png.height, { palette, delay: DELAY_MS });
}

gif.finish();
writeFileSync("docs/demo.gif", gif.bytes());
console.log(`docs/demo.gif: ${gif.bytes().length} bytes from ${frames.length} frames`);

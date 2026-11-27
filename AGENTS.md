# Project instructions

## Never open binary media with the `read` tool

`read` on an image returns a `data:<mime>;base64,...` part. The model gateway
only accepts `data:image/png`, `data:image/jpeg`, and `data:image/webp`. Any
other MIME type bakes a part into the conversation that every later request
re-sends, so one bad read makes the whole session fail permanently with:

```
invalid_request_error: Only https image URLs are fetched (an image_url part in
a message's content list) ... param: messages[N].content[0]
```

This already happened once: reading `docs/demo.gif` poisoned the session.

## Incorrect

```
read({ path: "docs/demo.gif" })     // returns data:image/gif;base64,...
read({ path: "logo.svg" })          // returns data:image/svg+xml;base64,...
```

Both poison the session. Retrying the request cannot recover it, because the
offending part is re-sent with every message.

## Correct

```js
// Assert on measurable facts instead of generating an image part.
const b = readFileSync("docs/demo.gif");
const frames = countGifBlocks(b); // 3
console.log(b.length, frames);    // 72124 3
```

- **Never** `read` `.gif`, `.svg`, `.avif`, `.ico`, `.bmp`, `.mp4`, `.webm`,
  `.pdf`, or any other non-png/jpeg/webp file.
- To view a GIF frame, extract one frame to a `.png` first, then read the PNG.
- If a session is already failing with this error, stop: start a new session
  and state what was being done. Do not retry inside the broken session.

## Verify render output without opening it

For screenshots and demo media, assert on measurable facts — file size, PNG
dimensions, GIF frame count, console errors from the browser tool — rather than
"looking" at formats the gateway refuses.

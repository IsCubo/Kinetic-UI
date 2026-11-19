#!/usr/bin/env node
// Maintainer entry point for the frame capture that ships with the skill. The
// implementation lives in skills/kinetic-ui/assets/snippets/capture-frames.mjs so it
// travels with the skill; this wrapper keeps `node scripts/capture-frames.mjs` and
// `npm run capture` working inside this repository.
// Exit codes: 0 frames written, 1 a capture failed, 2 usage error.
import { run } from '../skills/kinetic-ui/assets/snippets/capture-frames.mjs';

run()
  .then((failures) => process.exit(failures ? 1 : 0))
  .catch((cause) => {
    console.error(cause.stack ?? cause.message);
    process.exit(1);
  });

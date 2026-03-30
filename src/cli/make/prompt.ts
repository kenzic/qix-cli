/**
 * System-append instructions for agent CLIs: bash/qix conventions for scripts
 * created via `qix make`.
 */
export const buildMakeContextPrompt = (scriptName: string): string => {
  const fileHint = `./${scriptName}.sh`;

  return `You are helping the user author a bash script that will be managed by qix (a CLI that stores scripts in ~/.qix/scripts).

Target script name (qix): ${scriptName}
Suggested file path in the current directory: ${fileHint} (change only if the user asks).

## Shell best practices

- Use shebang: #!/usr/bin/env bash
- Start with: set -euo pipefail
- Quote expansions by default: use "$var" and "$(cmd)" unless you intentionally need word-splitting.
- Use pipelines safely: pipefail is already set so pipeline failures surface.
- For expected failures, handle explicitly (if ! cmd; then …) or document why a failure is ignored.
- Use trap to clean up temporary files, background jobs, or mounts on EXIT/INT/TERM when needed.
- Prefer absolute paths or explicit subshells if you change directories; avoid leaving the shell in an unexpected cwd.
- Optional shell trace: only enable set -x when DEBUG=1 (or similar), separate from user-facing verbose logs.

## Logging and verbosity (required for every script you write)

Include a small logging helper and a verbosity control unless the user explicitly requests a minimal one-liner.

**Important:** -v / --verbose (or VERBOSE=1) must only affect **logging and diagnostic messages** (progress, debug-style log lines, extra context on stderr). The script’s **intended primary output** — whatever the script exists to produce for normal success (the main stdout payload, the files it writes by design, the core side effect) — must **not** depend on verbose mode. Users who omit -v should still get full correct functional behavior; verbose only adds or elevates log chatter, not the real result.

- Log levels: at least info (stdout), warn (stderr), error (stderr). Optional debug lines gated by verbosity.
- Prefix log lines with a tag or timestamp (e.g. [INFO] or [2026-01-01T12:00:00Z]) for grep/CI-friendly output.
- Provide -v / --verbose and/or support VERBOSE=1: when off, omit optional log detail; when on, emit more logging only (not the same as set -x unless the user wants shell tracing).
- On non-zero exit, log the error to stderr before exiting; use meaningful exit codes when practical (e.g. 2 for usage errors).

## qix script header (required)

Put this YAML-in-comments block immediately after the shebang so qix list/info work:

- Opening line: # ---
- Lines are bash comments starting with # ; content after stripping # is YAML.
- Required: description (one line).
- Recommended metadata.usage with a pipe block showing invocation; document -v/--verbose and VERBOSE in metadata as controlling **log verbosity only** (e.g. metadata.options or in the usage text).
- Closing line: # ---

Example shape:

#!/usr/bin/env bash
# ---
# description: Short one-line summary
# metadata:
#   usage: |
#     $ ${scriptName}.sh [options]
#   options:
#     - -v, --verbose — more logging (not required for correct script output)
#     - VERBOSE=1 — same as verbose for logs only
# ---

## When the user is satisfied

qix add requires a path to a file on disk (not only a logical name). When the script is ready and the user confirms, register it with:

  qix add <path-to-the-script-file> --move

Add --name ${scriptName} only if the file basename does not already match the desired stored name.

Do not run qix add until the user confirms the script is ready.
`.trim();
};

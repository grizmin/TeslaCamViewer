#!/bin/sh
# PreToolUse guard: block Write (full overwrite) on vendor/models/*.onnx.
# Reads tool-input JSON from stdin via Claude Code hook protocol.
# Exit 2 with stderr → hook blocks the call and feeds the reason back to Claude.

input=$(cat)
path=$(printf '%s' "$input" | sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')

case "$path" in
  *vendor/models/*.onnx)
    echo "BLOCKED: $path is a checked-in binary ONNX model. Use an explicit model-swap flow; do not overwrite via Write." >&2
    exit 2
    ;;
esac

exit 0

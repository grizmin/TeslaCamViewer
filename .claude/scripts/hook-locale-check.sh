#!/bin/sh
# PostToolUse hook: run locale drift check only when the edited file is a locale JSON or js/i18n.js.
# Output is surfaced to Claude; non-zero exit does not block (hook is advisory).

input=$(cat)
path=$(printf '%s' "$input" | sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')

case "$path" in
  *locales/*.json|*js/i18n.js)
    node "$(dirname "$0")/check-locales.js"
    exit 0
    ;;
esac

exit 0

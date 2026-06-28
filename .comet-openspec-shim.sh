#!/bin/bash
exec node "$(dirname "$0")/node_modules/@fission-ai/openspec/bin/openspec.js" "$@"
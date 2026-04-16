#!/bin/bash
# Script push sicuro — rimuove lock stantii e pusha
cd "$(dirname "$0")"
rm -f .git/HEAD.lock .git/index.lock .git/refs/heads/*.lock
git push

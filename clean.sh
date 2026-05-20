#!/bin/bash
set -e

# Create an archive directory
ARCHIVE_DIR="scripts/archive"
mkdir -p "$ARCHIVE_DIR"

echo "📦 Archiving phase-specific scripts and repair tools..."

# Move patterns of scripts
# 1. Matches phaseXX-*.sh, fix-*.sh, repair-*.sh, deploy-*.sh, change-*.sh
# 2. Excludes the scripts folder itself and essential files
find . -maxdepth 1 -type f \( \
    -name "phase*.sh" -o \
    -name "fix-*.sh" -o \
    -name "repair-*.sh" -o \
    -name "deploy-*.sh" -o \
    -name "change-*.sh" -o \
    -name "replace-*.sh" -o \
    -name "validation.sh" \
\) -exec mv {} "$ARCHIVE_DIR/" \;

echo "✅ Archive complete. Files moved to $ARCHIVE_DIR."

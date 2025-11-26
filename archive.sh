#!/bin/bash

# Archive script for pomodoro extension (GNOME Extensions format)
# Excludes: README.md, long-break.wav, .git directory, and compiled schemas

EXTENSION_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ARCHIVE_NAME="pomodoro-extension-$(date +%Y%m%d-%H%M%S).zip"
ARCHIVE_PATH="$(dirname "$EXTENSION_DIR")/$ARCHIVE_NAME"

echo "Creating ZIP archive: $ARCHIVE_NAME"

cd "$EXTENSION_DIR"

zip -r "$ARCHIVE_PATH" . \
    --exclude='README.md' \
    --exclude='long-break.png' \
    --exclude='.git/*' \
    --exclude='schemas/gschemas.compiled' \
    --exclude='.gitignore' \
    --exclude='*.zip' \
    --exclude='archive.sh' > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✓ Archive created successfully: $ARCHIVE_PATH"
else
    echo "✗ Error creating archive"
    exit 1
fi

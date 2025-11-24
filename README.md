# Pomodoro Timer Extension for GNOME Shell

A simple and elegant Pomodoro timer extension for GNOME Shell 49+ that helps you manage your work sessions and breaks using the Pomodoro Technique.

## Features

- **Configurable Durations**: Customize work time, short break, and long break durations
- **Automatic Phase Transitions**: Seamlessly transitions between work and break phases
- **Auto-Start Next Phase**: Optionally automatically start the next phase when the current one completes
- **Notifications**: Get notified when each phase completes (can be disabled)
- **Pomodoro Counter**: Track how many pomodoros you've completed
- **Visual Indicators**: Clear emoji indicators show the current phase:
  - 🍅 Work Time
  - 🌟 Short Break
  - ☕ Long Break
- **Menu Controls**: Quick access buttons in the popup menu:
  - Start/Pause timer
  - Reset to work phase
  - Skip to next phase

## Installation

1. Clone or copy this extension to:

   ```
   ~/.local/share/gnome-shell/extensions/pomodoro@igor.dev/
   ```

2. Compile the settings schema:

   ```
   glib-compile-schemas ~/.local/share/gnome-shell/extensions/pomodoro@igor.dev/schemas/
   ```

3. Enable the extension:

   - Open GNOME Extensions (or Tweaks)
   - Find "Pomodoro Timer"
   - Toggle it on

4. Access preferences to customize durations and behavior

## Configuration

Default settings:

- **Work Time**: 25 minutes
- **Short Break**: 5 minutes
- **Long Break**: 15 minutes
- **Long Break Interval**: After every 4 pomodoros
- **Show Notifications**: Enabled
- **Auto-Start Next Phase**: Enabled

All settings can be customized through the GNOME Settings preferences page.

## How to Use

1. Click the Pomodoro icon in the top panel
2. Click **Start** to begin the work phase
3. The timer will display the remaining time
4. When time is up, a notification will appear and the phase will change
5. If auto-start is enabled, the next phase begins automatically
6. Use **Reset** to restart from the work phase
7. Use **Next Step** to skip to the next phase

## Files Structure

- `extension.js` - Main timer logic and indicator
- `prefs.js` - Preferences window entry point
- `preferences/generalPage.js` - Settings UI
- `schemas/org.gnome.shell.extensions.pomodoro.gschema.xml` - Settings schema
- `metadata.json` - Extension metadata

## Requirements

- GNOME Shell 49 or later
- GLib (for timer management)
- Gtk 4 / Adwaita (for preferences UI)

## License

This extension is provided as-is for personal use.

## Compatibility

- GNOME Shell 49+
- Linux distributions with GNOME Shell support

## Tips

- Use the Pomodoro Technique: Work focused for 25 minutes, take a 5-minute break, repeat
- After 4 pomodoros, take a longer 15-minute break
- Disable auto-start if you prefer to manually start each phase
- Enable notifications to stay aware of phase changes even when focused on other tasks

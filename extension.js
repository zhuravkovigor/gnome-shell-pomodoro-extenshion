/* exported PomodoroExtension */

import Clutter from "gi://Clutter";
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import GObject from "gi://GObject";
import St from "gi://St";

import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";

const PomodoroIndicator = GObject.registerClass(
  class PomodoroIndicator extends PanelMenu.Button {
    _init(settings, extensionPath) {
      super._init(0.5, "Pomodoro Timer");

      this._settings = settings;
      this._extensionPath = extensionPath;
      this._stateFile = GLib.build_filenamev([
        GLib.get_user_cache_dir(),
        "pomodoro-state.json",
      ]);

      this._workTime = this._settings.get_int("work-time");
      this._shortBreak = this._settings.get_int("short-break-time");
      this._longBreak = this._settings.get_int("long-break-time");
      this._longBreakInterval = this._settings.get_int("long-break-interval");

      this._timeLeft = this._workTime;
      this._isRunning = false;
      this._isWorkTime = true;
      this._isLongBreak = false;
      this._pomodoroCount = 0;
      this._timeout = null;
      this._signalIds = [];

      // Restore state if exists
      this._restoreState();

      // Save state periodically
      this._saveStateTimeout = GLib.timeout_add_seconds(
        GLib.PRIORITY_DEFAULT,
        5,
        () => {
          this._saveState();
          return GLib.SOURCE_CONTINUE;
        }
      );

      // watch settings changes
      this._onSettingsChanged = this._settings.connect("changed", () =>
        this._updateSettings()
      );
    }

    _saveState() {
      try {
        const state = {
          timeLeft: this._timeLeft,
          isWorkTime: this._isWorkTime,
          isLongBreak: this._isLongBreak,
          pomodoroCount: this._pomodoroCount,
          timestamp: Date.now(),
        };
        const file = Gio.File.new_for_path(this._stateFile);
        const [success] = file.replace_contents(
          JSON.stringify(state),
          null,
          false,
          Gio.FileCreateFlags.REPLACE_DESTINATION,
          null
        );
        if (success) {
          console.log("[Pomodoro] State saved");
        }
      } catch (e) {
        console.error(`[Pomodoro] Error saving state: ${e.message}`);
      }
    }

    _restoreState() {
      try {
        const file = Gio.File.new_for_path(this._stateFile);
        if (!file.query_exists(null)) {
          console.log("[Pomodoro] No saved state found");
          return;
        }

        const [success, contents] = file.load_contents(null);
        if (!success) return;

        const state = JSON.parse(new TextDecoder().decode(contents));
        const elapsed = Math.floor((Date.now() - state.timestamp) / 1000);

        // Only restore if less than 2 hours passed
        if (elapsed < 7200) {
          this._timeLeft = Math.max(0, state.timeLeft - elapsed);
          this._isWorkTime = state.isWorkTime;
          this._isLongBreak = state.isLongBreak;
          this._pomodoroCount = state.pomodoroCount;
          console.log(`[Pomodoro] State restored, adjusted by ${elapsed}s`);
        } else {
          console.log("[Pomodoro] State too old, discarding");
          file.delete(null);
        }
      } catch (e) {
        console.error(`[Pomodoro] Error restoring state: ${e.message}`);
      }
    }

    _playSound(soundFile) {
      // Check if sound is enabled
      if (!this._settings.get_boolean("sound-enabled")) {
        return;
      }

      try {
        const soundPath = GLib.build_filenamev([
          this._extensionPath,
          "sounds",
          soundFile,
        ]);
        const file = Gio.File.new_for_path(soundPath);

        if (!file.query_exists(null)) {
          console.error(`[Pomodoro] Sound file not found: ${soundPath}`);
          return;
        }

        const player = global.display.get_sound_player();
        player.play_from_file(file, "Pomodoro Timer", null);
      } catch (e) {
        console.error(`[Pomodoro] Error playing sound: ${e.message}`);
      }
    }

    _updateSettings() {
      const oldWorkTime = this._workTime;
      this._workTime = this._settings.get_int("work-time");
      this._shortBreak = this._settings.get_int("short-break-time");
      this._longBreak = this._settings.get_int("long-break-time");
      this._longBreakInterval = this._settings.get_int("long-break-interval");

      // If we're on work phase and changed the setting, update the timer
      if (this._isWorkTime && this._timeLeft === oldWorkTime) {
        this._timeLeft = this._workTime;
        this._label.text = `🍅 ${this._formatTime(this._timeLeft)}`;
      }
    }

    buildUI() {
      // centered label with emoji
      let emoji = "🍅";
      if (!this._isWorkTime) {
        emoji = this._isLongBreak ? "☕" : "🌟";
      }
      this._label = new St.Label({
        text: `${emoji} ${this._formatTime(this._timeLeft)}`,
        y_align: Clutter.ActorAlign.CENTER,
      });

      // center text inside button
      this.add_child(this._label);

      // Progress bar for long break at top (add first)
      this._progressItem = new PopupMenu.PopupMenuItem("", {
        reactive: false,
      });
      const progressBox = new St.BoxLayout({
        vertical: true,
        style_class: "progress-container",
        style: "padding: 2px 6px 0px 0px; spacing: 0px;",
      });

      const labelBox = new St.BoxLayout({
        vertical: false,
        style_class: "label-container",
      });

      const progressLabel = new St.Label({
        text: "Work Time",
        style: "font-size: 14px; color: #ddd; font-weight: bold;",
        x_expand: true,
      });

      const countLabel = new St.Label({
        text: `0/${this._longBreakInterval}`,
        style:
          "font-size: 14px; color: #888; margin-bottom: 12px; margin-left: 0px;",
      });

      labelBox.add_child(progressLabel);
      labelBox.add_child(countLabel);

      this._countLabel = countLabel;

      const progressBar = new St.DrawingArea({
        width: 200,
        height: 10,
        style_class: "progress-bar",
      });

      progressBar.connect("repaint", () => {
        const cr = progressBar.get_context();
        const [width, height] = progressBar.get_surface_size();
        const radius = height / 2;

        // Get system accent color from St theme
        let r = 0.4,
          g = 0.8,
          b = 0.3; // fallback green
        try {
          const theme = St.ThemeContext.get_for_stage(global.stage);
          const [ok, accent] = theme.lookup_color("accent_color");
          if (ok && accent) {
            r = accent.red;
            g = accent.green;
            b = accent.blue;
          }
        } catch (e) {
          // Fallback to green if unable to get system color
        }

        // Background rounded
        cr.setSourceRGBA(0.4, 0.4, 0.4, 0.6);
        cr.moveTo(radius, 0);
        cr.lineTo(width - radius, 0);
        cr.arc(width - radius, radius, radius, -Math.PI / 2, Math.PI / 2);
        cr.lineTo(radius, height);
        cr.arc(radius, radius, radius, Math.PI / 2, -Math.PI / 2);
        cr.closePath();
        cr.fill();

        // Progress fill rounded with system accent color
        let currentCount = this._pomodoroCount % this._longBreakInterval;
        // On long break, show full progress
        if (currentCount === 0 && this._pomodoroCount > 0) {
          currentCount = this._longBreakInterval;
        }
        const progress = currentCount / this._longBreakInterval;
        const fillWidth = width * progress;
        if (fillWidth > 0) {
          cr.setSourceRGBA(r, g, b, 0.9);
          cr.moveTo(radius, 0);
          const fillRadius = Math.min(radius, fillWidth / 2);
          cr.lineTo(fillWidth - fillRadius, 0);
          if (fillWidth >= width - radius) {
            cr.arc(width - radius, radius, radius, -Math.PI / 2, Math.PI / 2);
            cr.lineTo(fillRadius, height);
            cr.arc(fillRadius, radius, fillRadius, Math.PI / 2, -Math.PI / 2);
          } else {
            cr.arc(
              fillWidth - fillRadius,
              radius,
              fillRadius,
              -Math.PI / 2,
              Math.PI / 2
            );
            cr.lineTo(fillRadius, height);
            cr.arc(fillRadius, radius, fillRadius, Math.PI / 2, -Math.PI / 2);
          }
          cr.closePath();
          cr.fill();
        }
      });

      this._progressBar = progressBar;
      this._statusLabel = progressLabel;
      this._progressCountLabel = countLabel;

      progressBox.add_child(labelBox);
      progressBox.add_child(progressBar);
      this._progressItem.actor.add_child(progressBox);
      this.menu.addMenuItem(this._progressItem);

      this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

      // menu items
      this._startStopItem = new PopupMenu.PopupMenuItem("Start");
      this._signalIds.push({
        obj: this._startStopItem,
        id: this._startStopItem.connect("activate", () => this._toggleTimer()),
      });
      this.menu.addMenuItem(this._startStopItem);

      this._resetItem = new PopupMenu.PopupMenuItem("Reset");
      this._signalIds.push({
        obj: this._resetItem,
        id: this._resetItem.connect("activate", () => this._resetTimer()),
      });
      this.menu.addMenuItem(this._resetItem);

      this._nextStepItem = new PopupMenu.PopupMenuItem("Next Step");
      this._signalIds.push({
        obj: this._nextStepItem,
        id: this._nextStepItem.connect("activate", () => this._nextStep()),
      });
      this.menu.addMenuItem(this._nextStepItem);

      // Update UI after restoration
      this._updateUIAfterRestore();
    }

    _updateUIAfterRestore() {
      // Update status label
      if (this._isWorkTime) {
        this._statusLabel.text = "🍅 Work Time";
      } else if (this._isLongBreak) {
        this._statusLabel.text = "☕ Long Break";
      } else {
        this._statusLabel.text = "🌟 Short Break";
      }

      // Update progress count
      let currentCount = this._pomodoroCount % this._longBreakInterval;
      if (currentCount === 0 && this._pomodoroCount > 0) {
        currentCount = this._longBreakInterval;
      }
      this._progressCountLabel.text = `${currentCount}/${this._longBreakInterval}`;

      // Repaint progress bar
      if (this._progressBar) {
        this._progressBar.queue_repaint();
      }
    }

    _formatTime(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }

    _toggleTimer() {
      if (this._isRunning) {
        this._stopTimer();
      } else {
        this._startTimer();
      }
    }

    _startTimer() {
      this._isRunning = true;
      this._startStopItem.label.text = "Pause";

      if (this._timeout) {
        GLib.source_remove(this._timeout);
        this._timeout = null;
      }

      this._timeout = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, () => {
        if (this._timeLeft > 0) {
          this._timeLeft--;
          let emoji = "🍅";
          if (!this._isWorkTime) {
            emoji = this._isLongBreak ? "☕" : "🌟";
          }
          this._label.text = `${emoji} ${this._formatTime(this._timeLeft)}`;
          return GLib.SOURCE_CONTINUE;
        } else {
          this._onTimerComplete();
          return GLib.SOURCE_REMOVE;
        }
      });
    }

    _stopTimer() {
      this._isRunning = false;
      this._startStopItem.label.text = "Start";

      if (this._timeout) {
        GLib.source_remove(this._timeout);
        this._timeout = null;
      }
    }

    _resetTimer() {
      this._stopTimer();
      this._isWorkTime = true;
      this._pomodoroCount = 0;
      this._isLongBreak = false;
      this._timeLeft = this._workTime;
      this._label.text = `🍅 ${this._formatTime(this._timeLeft)}`;
      this._statusLabel.text = "🍅 Work Time";

      // Update progress bar and count display
      if (this._progressBar) {
        this._progressBar.queue_repaint();
      }
      this._progressCountLabel.text = `0/${this._longBreakInterval}`;
    }

    _nextStep() {
      this._stopTimer();
      this._onTimerComplete();
    }

    _onTimerComplete() {
      this._isRunning = false;
      this._timeout = null;

      if (this._isWorkTime) {
        this._pomodoroCount++;

        // Determine break length
        if (this._pomodoroCount % this._longBreakInterval === 0) {
          this._timeLeft = this._longBreak;
          this._statusLabel.text = "☕ Long Break";
          this._label.text = `☕ ${this._formatTime(this._timeLeft)}`;
          this._isLongBreak = true;
          this._playSound("long-break.wav");
        } else {
          this._timeLeft = this._shortBreak;
          this._statusLabel.text = "🌟 Short Break";
          this._label.text = `🌟 ${this._formatTime(this._timeLeft)}`;
          this._isLongBreak = false;
          this._playSound("break.wav");
        }
        this._isWorkTime = false;
      } else {
        // If we just finished a long break, reset the pomodoro count
        if (this._isLongBreak) {
          this._pomodoroCount = 0;
          this._isLongBreak = false;
        }

        this._timeLeft = this._workTime;
        this._statusLabel.text = "🍅 Work Time";
        this._label.text = `🍅 ${this._formatTime(this._timeLeft)}`;
        this._isWorkTime = true;
        this._playSound("focus.wav");
      }

      this._startStopItem.label.text = "Start";

      // Update progress bar and count
      if (this._progressBar) {
        this._progressBar.queue_repaint();
      }

      // Update pomodoro count display
      let currentCount = this._pomodoroCount % this._longBreakInterval;
      // On long break, show full count (e.g., 2/2 instead of 0/2)
      if (currentCount === 0 && this._pomodoroCount > 0) {
        currentCount = this._longBreakInterval;
      }
      this._progressCountLabel.text = `${currentCount}/${this._longBreakInterval}`;

      // Send notification
      if (this._settings.get_boolean("show-notifications")) {
        Main.notify(
          "Pomodoro Timer",
          this._isWorkTime ? "Time to work!" : "Take a break!"
        );
      }

      // Auto-start next phase if enabled
      if (this._settings.get_boolean("auto-start-next")) {
        this._startTimer();
      }
    }

    destroy() {
      // Save state before destroying
      this._saveState();

      // Disconnect all signals
      this._signalIds.forEach((signal) => {
        if (signal.obj && signal.id) {
          signal.obj.disconnect(signal.id);
        }
      });
      this._signalIds = [];

      // Disconnect settings signal
      if (this._onSettingsChanged) {
        this._settings.disconnect(this._onSettingsChanged);
        this._onSettingsChanged = null;
      }

      // Remove save state timeout
      if (this._saveStateTimeout) {
        GLib.source_remove(this._saveStateTimeout);
        this._saveStateTimeout = null;
      }

      // Remove timeout source
      if (this._timeout) {
        GLib.source_remove(this._timeout);
        this._timeout = null;
      }

      super.destroy();
    }
  }
);

export default class PomodoroExtension extends Extension {
  enable() {
    const settings = this.getSettings();
    this._indicator = new PomodoroIndicator(settings, this.path);
    this._indicator.buildUI();
    Main.panel.addToStatusArea(this.uuid, this._indicator);
  }

  disable() {
    if (this._indicator) {
      this._indicator.destroy();
      this._indicator = null;
    }
  }
}

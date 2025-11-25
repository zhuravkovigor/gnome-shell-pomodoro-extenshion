/* exported GeneralPage */

import Adw from "gi://Adw";
import GObject from "gi://GObject";
import Gtk from "gi://Gtk";
import { gettext as _ } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

export const GeneralPage = GObject.registerClass(
  class GeneralPage extends Adw.PreferencesPage {
    _init(settings) {
      super._init({
        title: _("General"),
        icon_name: "preferences-system-symbolic",
        name: "GeneralPage",
      });

      this._settings = settings;

      // Timer Durations group
      const timerGroup = new Adw.PreferencesGroup({
        title: _("Timer Durations"),
        description: _("Customize the duration of each timer phase"),
      });
      this.add(timerGroup);

      // Work time
      const workTimeRow = new Adw.SpinRow({
        title: _("Work Time (minutes)"),
        adjustment: new Gtk.Adjustment({
          lower: 1,
          upper: 60,
          step_increment: 1,
          page_increment: 5,
        }),
      });
      workTimeRow.set_value(this._settings.get_int("work-time") / 60);
      workTimeRow.connect("notify::value", () => {
        this._settings.set_int(
          "work-time",
          Math.round(workTimeRow.get_value() * 60)
        );
      });
      timerGroup.add(workTimeRow);

      // Short break time
      const shortBreakRow = new Adw.SpinRow({
        title: _("Short Break (minutes)"),
        adjustment: new Gtk.Adjustment({
          lower: 1,
          upper: 30,
          step_increment: 1,
          page_increment: 5,
        }),
      });
      shortBreakRow.set_value(this._settings.get_int("short-break-time") / 60);
      shortBreakRow.connect("notify::value", () => {
        this._settings.set_int(
          "short-break-time",
          Math.round(shortBreakRow.get_value() * 60)
        );
      });
      timerGroup.add(shortBreakRow);

      // Long break time
      const longBreakRow = new Adw.SpinRow({
        title: _("Long Break (minutes)"),
        adjustment: new Gtk.Adjustment({
          lower: 1,
          upper: 60,
          step_increment: 1,
          page_increment: 5,
        }),
      });
      longBreakRow.set_value(this._settings.get_int("long-break-time") / 60);
      longBreakRow.connect("notify::value", () => {
        this._settings.set_int(
          "long-break-time",
          Math.round(longBreakRow.get_value() * 60)
        );
      });
      timerGroup.add(longBreakRow);

      // Long break interval
      const longBreakIntervalRow = new Adw.SpinRow({
        title: _("Pomodoros until Long Break"),
        adjustment: new Gtk.Adjustment({
          lower: 2,
          upper: 10,
          step_increment: 1,
          page_increment: 1,
        }),
      });
      longBreakIntervalRow.set_value(
        this._settings.get_int("long-break-interval")
      );
      longBreakIntervalRow.connect("notify::value", () => {
        this._settings.set_int(
          "long-break-interval",
          Math.round(longBreakIntervalRow.get_value())
        );
      });
      timerGroup.add(longBreakIntervalRow);

      // Notifications group
      const notificationsGroup = new Adw.PreferencesGroup({
        title: _("Notifications"),
      });
      this.add(notificationsGroup);

      // Show notifications
      const notificationsRow = new Adw.SwitchRow({
        title: _("Show Notifications"),
        subtitle: _("Show notifications when timer completes"),
        active: this._settings.get_boolean("show-notifications"),
      });
      notificationsRow.connect("notify::active", () => {
        this._settings.set_boolean(
          "show-notifications",
          notificationsRow.get_active()
        );
      });
      notificationsGroup.add(notificationsRow);

      // Behavior group
      const behaviorGroup = new Adw.PreferencesGroup({
        title: _("Behavior"),
      });
      this.add(behaviorGroup);

      // Auto-start next phase
      const autoStartRow = new Adw.SwitchRow({
        title: _("Auto-start Next Phase"),
        subtitle: _("Automatically start the next pomodoro or break"),
        active: this._settings.get_boolean("auto-start-next"),
      });
      autoStartRow.connect("notify::active", () => {
        this._settings.set_boolean(
          "auto-start-next",
          autoStartRow.get_active()
        );
      });
      behaviorGroup.add(autoStartRow);

      // Sound effects
      const soundRow = new Adw.SwitchRow({
        title: _("Sound Effects"),
        subtitle: _("Play sounds when transitioning between phases"),
        active: this._settings.get_boolean("sound-enabled"),
      });
      soundRow.connect("notify::active", () => {
        this._settings.set_boolean("sound-enabled", soundRow.get_active());
      });
      behaviorGroup.add(soundRow);
    }
  }
);

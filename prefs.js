/* exported PomodoroPrefs */

import { ExtensionPreferences } from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";
import * as GeneralPrefs from "./preferences/generalPage.js";

export default class PomodoroPrefs extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    const settings = this.getSettings();
    const generalPage = new GeneralPrefs.GeneralPage(settings);

    window.set_search_enabled(true);
    window.add(generalPage);
  }
}

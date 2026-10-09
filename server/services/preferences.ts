import { type Preferences, getPreferences } from "@/preferences";

import { BaseService } from "./base";

export type { Preferences };

export class PreferencesService extends BaseService {
  async getPreferences(): Promise<Preferences> {
    if (!this.request) {
      throw new Error("Request is required to get preferences");
    }
    return getPreferences(this.request);
  }
}

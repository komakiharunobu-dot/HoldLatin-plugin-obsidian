import { PRESETS, parseCustom } from './variants';

export interface HoldSettings {
  enabled: boolean;
  delay: number;
  preset: string;
  keepBaseOnCancel: boolean;
  custom: string;
}
export const DEFAULT_SETTINGS: HoldSettings = {
  enabled: true, delay: 500, preset: 'common', keepBaseOnCancel: true, custom: ''
};
export function normalizeSettings(input: unknown): HoldSettings {
  const data = input && typeof input === 'object' ? input as Partial<HoldSettings> : {};
  let custom = typeof data.custom === 'string' ? data.custom : '';
  try { parseCustom(custom); } catch { custom = ''; }
  return {
    enabled: typeof data.enabled === 'boolean' ? data.enabled : true,
    delay: typeof data.delay === 'number' && Number.isFinite(data.delay) ? Math.max(200, Math.min(1500, Math.round(data.delay))) : 500,
    preset: typeof data.preset === 'string' && Object.prototype.hasOwnProperty.call(PRESETS, data.preset) ? data.preset : 'common',
    keepBaseOnCancel: typeof data.keepBaseOnCancel === 'boolean' ? data.keepBaseOnCancel : true,
    custom
  };
}

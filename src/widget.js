// -----------------------------------------------------------------------------
// Dashboard widget "facades": every facade with its advice on one card, the
// season in force, and three buttons to force the season (each one can be
// hidden from the widget settings).
// -----------------------------------------------------------------------------

import { WIDGET_COLORS } from '@gladysassistant/integration-sdk';
import { TEXT, STATUS, pick, formatMoment } from './i18n.js';

export const WIDGET_KEY = 'facades';
export const MODE_ACTIONS = { mode_summer: 'summer', mode_winter: 'winter', mode_config: null };

function rowValue(timeline, now, language) {
  const t = pick(TEXT, language);
  const { current } = timeline;
  if (current.sunOn) {
    const until = timeline.nextDeparture
      ? ` · ${t.sunUntil} ${formatMoment(timeline.nextDeparture, now, language)}`
      : '';
    return `${current.closure} %${until}`;
  }
  return timeline.nextArrival
    ? `${t.sunFrom} ${formatMoment(timeline.nextArrival, now, language)}`
    : t.noSun;
}

/**
 * @param {{ rows: Array<{ name: string, timeline: object }>, season: string|null,
 *   override: string|null, now: Date, language: string, settings: object }} input
 *   `season` is null until the first computation; `noLocation`: no located house.
 */
export function buildWidget({
  rows,
  season,
  noLocation = false,
  override,
  now,
  language,
  settings = {},
}) {
  const t = pick(TEXT, language);
  const components = [];
  if (season && settings.show_mode !== false) {
    const mode = season === 'summer' ? t.modeSummer : t.modeWinter;
    components.push({
      type: 'text',
      variant: 'caption',
      text: override ? `${mode} (${t.forced})` : mode,
    });
  }
  if (noLocation) {
    components.push({ type: 'text', variant: 'body', text: pick(STATUS.noLocation, language) });
  } else if (!season) {
    // Not computed yet (a few seconds after the start): an empty state.
  } else if (rows.length === 0) {
    components.push({ type: 'text', variant: 'body', text: t.noFacade });
  } else {
    components.push({
      type: 'status',
      items: rows.map(({ name, timeline }) => ({
        label: name.slice(0, 40),
        value: rowValue(timeline, now, language).slice(0, 40),
        icon: timeline.current.sunOn ? 'sun' : 'cloud',
        color: !timeline.current.sunOn
          ? WIDGET_COLORS.NEUTRAL
          : timeline.current.closure > 0
            ? WIDGET_COLORS.WARNING
            : WIDGET_COLORS.SUCCESS,
      })),
    });
  }
  if (settings.show_mode_buttons !== false) {
    const labels = { mode_summer: t.summer, mode_winter: t.winter, mode_config: t.followConfig };
    for (const [key, value] of Object.entries(MODE_ACTIONS)) {
      // The active choice is shown by its icon: the primary style is invisible
      // in dark mode (Gladys#3153).
      components.push({
        type: 'button',
        label: labels[key],
        icon:
          override === value
            ? 'check-circle'
            : value === 'summer'
              ? 'sun'
              : value
                ? 'thermometer'
                : 'settings',
        style: 'secondary',
        action: { key },
      });
    }
  }
  return { ttl_seconds: 60, components };
}

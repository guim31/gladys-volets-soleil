// -----------------------------------------------------------------------------
// Texts produced by the container, in the four languages of the Gladys
// interface. German says "du", Spanish "usted".
// -----------------------------------------------------------------------------

/** Feature and device names (frozen in Gladys when the device is created). */
export const NAMES = {
  en: {
    facade: 'Facade',
    sun: 'Sun on the facade',
    incidence: 'Sun incidence angle',
    exposure: 'Direct sunlight',
    closure: 'Advised closure',
    nextArrival: 'Next sun arrival',
    nextDeparture: 'Next sun departure',
  },
  fr: {
    facade: 'Façade',
    sun: 'Soleil sur la façade',
    incidence: "Angle d'incidence du soleil",
    exposure: 'Ensoleillement direct',
    closure: 'Fermeture conseillée',
    nextArrival: 'Prochaine arrivée du soleil',
    nextDeparture: 'Prochain départ du soleil',
  },
  de: {
    facade: 'Fassade',
    sun: 'Sonne auf der Fassade',
    incidence: 'Einfallswinkel der Sonne',
    exposure: 'Direkte Sonneneinstrahlung',
    closure: 'Empfohlene Schließung',
    nextArrival: 'Nächste Ankunft der Sonne',
    nextDeparture: 'Nächster Abgang der Sonne',
  },
  es: {
    facade: 'Fachada',
    sun: 'Sol en la fachada',
    incidence: 'Ángulo de incidencia del sol',
    exposure: 'Insolación directa',
    closure: 'Cierre aconsejado',
    nextArrival: 'Próxima llegada del sol',
    nextDeparture: 'Próxima salida del sol',
  },
};

/** Short texts: states, widget, messages. */
export const TEXT = {
  en: {
    none: 'not within 48 h',
    tomorrow: 'tomorrow',
    summer: 'Summer',
    winter: 'Winter',
    followConfig: 'As configured',
    modeSummer: 'Summer mode: shade',
    modeWinter: 'Winter mode: let the sun in',
    forced: 'forced',
    sunUntil: 'until',
    sunFrom: 'sun at',
    noSun: 'no sun',
    noFacade: 'No facade configured: fill in an orientation in the configuration.',
    modeSet: 'Mode set',
  },
  fr: {
    none: 'pas avant 48 h',
    tomorrow: 'demain',
    summer: 'Été',
    winter: 'Hiver',
    followConfig: 'Selon la config',
    modeSummer: 'Mode été : se protéger',
    modeWinter: 'Mode hiver : laisser entrer le soleil',
    forced: 'imposé',
    sunUntil: "jusqu'à",
    sunFrom: 'soleil à',
    noSun: 'pas de soleil',
    noFacade: 'Aucune façade configurée : renseignez une orientation dans la configuration.',
    modeSet: 'Mode réglé',
  },
  de: {
    none: 'nicht innerhalb 48 h',
    tomorrow: 'morgen',
    summer: 'Sommer',
    winter: 'Winter',
    followConfig: 'Wie konfiguriert',
    modeSummer: 'Sommermodus: Schatten',
    modeWinter: 'Wintermodus: Sonne hereinlassen',
    forced: 'erzwungen',
    sunUntil: 'bis',
    sunFrom: 'Sonne um',
    noSun: 'keine Sonne',
    noFacade: 'Keine Fassade konfiguriert: trage eine Ausrichtung in der Konfiguration ein.',
    modeSet: 'Modus gesetzt',
  },
  es: {
    none: 'no antes de 48 h',
    tomorrow: 'mañana',
    summer: 'Verano',
    winter: 'Invierno',
    followConfig: 'Según la config.',
    modeSummer: 'Modo verano: protegerse',
    modeWinter: 'Modo invierno: dejar entrar el sol',
    forced: 'impuesto',
    sunUntil: 'hasta',
    sunFrom: 'sol a las',
    noSun: 'sin sol',
    noFacade: 'Ninguna fachada configurada: indique una orientación en la configuración.',
    modeSet: 'Modo ajustado',
  },
};

/** Messages of the connection status (an object with every language). */
export const STATUS = {
  noLocation: {
    en: 'No house location in Gladys: set the coordinates of your house (Settings → Houses).',
    fr: 'Aucune position de maison dans Gladys : renseignez ses coordonnées (Paramètres → Maisons).',
    de: 'Kein Hausstandort in Gladys: trage die Koordinaten deines Hauses ein (Einstellungen → Häuser).',
    es: 'Ninguna ubicación de casa en Gladys: indique sus coordenadas (Ajustes → Casas).',
  },
  invalid: {
    en: 'Unreadable facade orientation (slots {slots}): use degrees (0-360) or N, NE, E, SE, S, SW, W, NW.',
    fr: 'Orientation de façade illisible (emplacements {slots}) : degrés (0-360) ou N, NE, E, SE, S, SO, O, NO.',
    de: 'Unlesbare Fassadenausrichtung (Plätze {slots}): Grad (0-360) oder N, NE, E, SE, S, SW, W, NW.',
    es: 'Orientación de fachada ilegible (posiciones {slots}): grados (0-360) o N, NE, E, SE, S, SO, O, NO.',
  },
};

export function pick(table, language) {
  return table[language] ?? table.en;
}

/** Local parts of a date in the Gladys time zone (injected as TZ). */
function localParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type).value;
  return {
    day: `${get('year')}-${get('month')}-${get('day')}`,
    month: Number(get('month')),
    time: `${get('hour')}:${get('minute')}`,
  };
}

export function localMonth(date, timeZone = process.env.TZ || 'UTC') {
  return localParts(date, timeZone).month;
}

/**
 * "14:32" today, "tomorrow 07:12", else the short weekday; the "none" text
 * when there is no date (a text state is never empty).
 */
export function formatMoment(date, now, language, timeZone = process.env.TZ || 'UTC') {
  const t = pick(TEXT, language);
  if (!date) {
    return t.none;
  }
  const target = localParts(date, timeZone);
  if (target.day === localParts(now, timeZone).day) {
    return target.time;
  }
  // Calendar days apart, immune to 23- or 25-hour days.
  const days = (Date.parse(target.day) - Date.parse(localParts(now, timeZone).day)) / 86400000;
  if (days === 1) {
    return `${t.tomorrow} ${target.time}`;
  }
  const weekday = new Intl.DateTimeFormat(language, { timeZone, weekday: 'short' }).format(date);
  return `${weekday} ${target.time}`;
}

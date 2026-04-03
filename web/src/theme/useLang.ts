import { useCallback } from 'react';
import { type Lang, TRANSLATIONS } from './i18n';

export function useLang(lang: Lang) {
  const tr = useCallback((key: string) => {
    return TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS['pt'][key] ?? key;
  }, [lang]);
  return tr;
}

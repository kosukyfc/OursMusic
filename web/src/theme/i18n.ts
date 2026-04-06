export type Lang = 'pt' | 'en' | 'es' | 'ru';

export const LANGUAGES: { id: Lang; name: string; flag: string }[] = [
  { id: 'pt', name: 'Português (Brasil)', flag: '🇧🇷' },
  { id: 'en', name: 'English', flag: '🇺🇸' },
  { id: 'es', name: 'Español', flag: '🇪🇸' },
  { id: 'ru', name: 'Русский', flag: '🇷🇺' },
];

export const TRANSLATIONS: Record<Lang, Record<string, string>> = {
  pt: {
    home: 'Início', search: 'Buscar', library: 'Sua Biblioteca', create: 'Criar',
    goodMorning: 'Bom dia', goodAfternoon: 'Boa tarde', goodEvening: 'Boa noite',
    allSongs: 'Todas as músicas', likedSongs: 'Músicas curtidas',
    noSongs: 'Nenhuma música ainda', settings: 'Configurações',
    logout: 'Sair', profile: 'Perfil', support: 'Suporte',
    theme: 'Tema', language: 'Idioma', save: 'Salvar alterações',
    cancel: 'Cancelar', saved: '✓ Salvo!',
    topMixes: 'Seus top mixes', recents: 'Recentes',
    play: 'Reproduzir', pause: 'Pausar', next: 'Próxima', prev: 'Anterior',
    queue: 'Fila', volume: 'Volume', shuffle: 'Aleatório', repeat: 'Repetir',
    download: 'Baixar', downloaded: 'Baixado', downloading: 'Baixando...',
    premiumOnly: 'Apenas Premium', upgradePlan: 'Atualizar plano',
    noResults: 'Nenhum resultado', browseAll: 'Explorar tudo',
  },
  en: {
    home: 'Home', search: 'Search', library: 'Your Library', create: 'Create',
    goodMorning: 'Good morning', goodAfternoon: 'Good afternoon', goodEvening: 'Good evening',
    allSongs: 'All songs', likedSongs: 'Liked songs',
    noSongs: 'No songs yet', settings: 'Settings',
    logout: 'Log out', profile: 'Profile', support: 'Support',
    theme: 'Theme', language: 'Language', save: 'Save changes',
    cancel: 'Cancel', saved: '✓ Saved!',
    topMixes: 'Your top mixes', recents: 'Recently played',
    play: 'Play', pause: 'Pause', next: 'Next', prev: 'Previous',
    queue: 'Queue', volume: 'Volume', shuffle: 'Shuffle', repeat: 'Repeat',
    download: 'Download', downloaded: 'Downloaded', downloading: 'Downloading...',
    premiumOnly: 'Premium only', upgradePlan: 'Upgrade plan',
    noResults: 'No results found', browseAll: 'Browse all',
  },
  es: {
    home: 'Inicio', search: 'Buscar', library: 'Tu Biblioteca', create: 'Crear',
    goodMorning: 'Buenos días', goodAfternoon: 'Buenas tardes', goodEvening: 'Buenas noches',
    allSongs: 'Todas las canciones', likedSongs: 'Canciones que te gustan',
    noSongs: 'Sin canciones aún', settings: 'Configuración',
    logout: 'Cerrar sesión', profile: 'Perfil', support: 'Soporte',
    theme: 'Tema', language: 'Idioma', save: 'Guardar cambios',
    cancel: 'Cancelar', saved: '✓ Guardado!',
    topMixes: 'Tus mejores mezclas', recents: 'Reproducidos recientemente',
    play: 'Reproducir', pause: 'Pausar', next: 'Siguiente', prev: 'Anterior',
    queue: 'Cola', volume: 'Volumen', shuffle: 'Aleatorio', repeat: 'Repetir',
    download: 'Descargar', downloaded: 'Descargado', downloading: 'Descargando...',
    premiumOnly: 'Solo Premium', upgradePlan: 'Actualizar plan',
    noResults: 'Sin resultados', browseAll: 'Explorar todo',
  },
  ru: {
    home: 'Главная', search: 'Поиск', library: 'Ваша библиотека', create: 'Создать',
    goodMorning: 'Доброе утро', goodAfternoon: 'Добрый день', goodEvening: 'Добрый вечер',
    allSongs: 'Все треки', likedSongs: 'Понравившиеся треки',
    noSongs: 'Треков пока нет', settings: 'Настройки',
    logout: 'Выйти', profile: 'Профиль', support: 'Поддержка',
    theme: 'Тема', language: 'Язык', save: 'Сохранить изменения',
    cancel: 'Отмена', saved: '✓ Сохранено!',
    topMixes: 'Ваши топ-миксы', recents: 'Недавно прослушанные',
    play: 'Воспроизвести', pause: 'Пауза', next: 'Следующий', prev: 'Предыдущий',
    queue: 'Очередь', volume: 'Громкость', shuffle: 'Перемешать', repeat: 'Повтор',
    download: 'Скачать', downloaded: 'Скачано', downloading: 'Скачивание...',
    premiumOnly: 'Только Premium', upgradePlan: 'Обновить план',
    noResults: 'Ничего не найдено', browseAll: 'Обзор',
  },
};

export function t(lang: Lang, key: string): string {
  return TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS['pt'][key] ?? key;
}

export function loadSavedLang(): Lang {
  return (localStorage.getItem('lang') as Lang) ?? 'pt';
}

export function saveLang(lang: Lang) {
  localStorage.setItem('lang', lang);
}

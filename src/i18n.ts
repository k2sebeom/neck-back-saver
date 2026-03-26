const translations = {
    ko: {
        interval: '주기',
        image: '이미지',
        fireNow: '지금 발사!',
        quit: '종료',
        manageImages: '이미지 관리...',
        selectImage: '이미지 선택',
        poster: '포스터',
        sec10: '10초',
        min1: '1분',
        min5: '5분',
        min10: '10분',
        min30: '30분',
        min45: '45분',
        hour1: '1시간',
        acknowledge: '확인',
        builtInImages: '기본 이미지',
        myImages: '내 이미지',
        addImage: '이미지 추가',
        dblClickToRename: '더블클릭하여 이름 변경',
    },
    en: {
        interval: 'Interval',
        image: 'Image',
        fireNow: 'Fire Now!',
        quit: 'Quit',
        manageImages: 'Manage Images...',
        selectImage: 'Select Image',
        poster: 'Poster',
        sec10: '10 sec',
        min1: '1 min',
        min5: '5 min',
        min10: '10 min',
        min30: '30 min',
        min45: '45 min',
        hour1: '1 hour',
        acknowledge: 'OK',
        builtInImages: 'Built-in Images',
        myImages: 'My Images',
        addImage: 'Add Image',
        dblClickToRename: 'Double-click to rename',
    },
};

type TranslationKeys = keyof typeof translations['en'];
export type Translations = Record<TranslationKeys, string>;
export type Locale = keyof typeof translations;

export function getLocale(): Locale {
    const lang = (Intl.DateTimeFormat().resolvedOptions().locale || 'en').split('-')[0];
    return lang === 'ko' ? 'ko' : 'en';
}

export function t(locale: Locale): Translations {
    return translations[locale];
}

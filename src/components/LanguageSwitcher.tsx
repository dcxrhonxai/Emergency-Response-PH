import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'tl', name: 'Tagalog', flag: '🇵🇭' },
];

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const currentLanguage = languages.find((lang) => lang.code === i18n.language) || languages[0];

  const changeLanguage = (langCode: string) => {
    i18n.changeLanguage(langCode);
  };

  const nextLanguage = () => {
    const currentIndex = languages.findIndex(l => l.code === i18n.language);
    const nextIndex = (currentIndex + 1) % languages.length;
    changeLanguage(languages[nextIndex].code);
  };

  return (
    <button
      onClick={nextLanguage}
      className="flex items-center gap-2 w-full px-2 py-1.5 text-sm hover:bg-accent rounded-sm"
    >
      <Languages className="h-4 w-4" />
      <span>{currentLanguage.flag} {currentLanguage.name}</span>
    </button>
  );
};

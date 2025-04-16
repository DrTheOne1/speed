import { useTranslation } from '../contexts/TranslationContext';

export default function TranslatedComponent() {
  const { t, language, dir } = useTranslation();

  return (
    <div dir={dir} className="rtl:text-right ltr:text-left">
      <h1>{t('my.translation.key')}</h1>
    </div>
  );
}
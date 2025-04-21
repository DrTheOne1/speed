export function checkMissingTranslations() {
  if (process.env.NODE_ENV === 'development') {
    const t = (key: string) => {
      console.warn(`Translation key used: ${key}`);
      return key;
    };
    return { t };
  }
  return null;
}
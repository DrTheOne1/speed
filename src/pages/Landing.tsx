import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../contexts/TranslationContext';
import { Helmet } from 'react-helmet-async';

const Landing: React.FC = () => {
  const { t } = useTranslation();

  return (
    <>
      <Helmet>
        <title>{t('landing.meta.title')}</title>
        <meta name="description" content={t('landing.meta.description')} />
        <meta name="keywords" content={t('landing.meta.keywords')} />
        <meta property="og:title" content={t('landing.meta.title')} />
        <meta property="og:description" content={t('landing.meta.description')} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={t('landing.meta.title')} />
        <meta name="twitter:description" content={t('landing.meta.description')} />
      </Helmet>

      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  <Link to="/" className="text-2xl font-bold text-indigo-600">
                    SMS Platform
                  </Link>
                </div>
                <nav className="hidden sm:ml-6 sm:flex sm:space-x-8">
                  <Link
                    to="/"
                    className="border-indigo-500 text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  >
                    {t('landing.nav.home')}
                  </Link>
                  <Link
                    to="/features"
                    className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  >
                    {t('landing.nav.features')}
                  </Link>
                  <Link
                    to="/pricing"
                    className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  >
                    {t('landing.nav.pricing')}
                  </Link>
                  <Link
                    to="/contact"
                    className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                  >
                    {t('landing.nav.contact')}
                  </Link>
                </nav>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:items-center">
                <Link
                  to="/login"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                >
                  {t('landing.nav.login')}
                </Link>
                <Link
                  to="/register"
                  className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  {t('landing.nav.signup')}
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <main className="flex-grow">
          <div className="relative bg-white overflow-hidden">
            <div className="max-w-7xl mx-auto">
              <div className="relative z-10 pb-8 bg-white sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32">
                <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
                  <div className="sm:text-center lg:text-left">
                    <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                      <span className="block">{t('landing.hero.title')}</span>
                      <span className="block text-indigo-600">{t('landing.hero.subtitle')}</span>
                    </h1>
                    <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                      {t('landing.hero.description')}
                    </p>
                    <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                      <div className="rounded-md shadow">
                        <Link
                          to="/register"
                          className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-4 md:text-lg md:px-10"
                        >
                          {t('landing.hero.cta.primary')}
                        </Link>
                      </div>
                      <div className="mt-3 sm:mt-0 sm:ml-3">
                        <Link
                          to="/login"
                          className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 md:py-4 md:text-lg md:px-10"
                        >
                          {t('landing.hero.cta.secondary')}
                        </Link>
                      </div>
                    </div>
                  </div>
                </main>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-gray-800">
          <div className="max-w-7xl mx-auto py-12 px-4 overflow-hidden sm:px-6 lg:px-8">
            <nav className="-mx-5 -my-2 flex flex-wrap justify-center" aria-label="Footer">
              <div className="px-5 py-2">
                <Link to="/about" className="text-base text-gray-300 hover:text-white">
                  {t('landing.footer.about')}
                </Link>
              </div>
              <div className="px-5 py-2">
                <Link to="/privacy" className="text-base text-gray-300 hover:text-white">
                  {t('landing.footer.privacy')}
                </Link>
              </div>
              <div className="px-5 py-2">
                <Link to="/terms" className="text-base text-gray-300 hover:text-white">
                  {t('landing.footer.terms')}
                </Link>
              </div>
              <div className="px-5 py-2">
                <Link to="/contact" className="text-base text-gray-300 hover:text-white">
                  {t('landing.footer.contact')}
                </Link>
              </div>
            </nav>
            <p className="mt-8 text-center text-base text-gray-400">
              &copy; {new Date().getFullYear()} SMS Platform. {t('landing.footer.rights')}
            </p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Landing; 
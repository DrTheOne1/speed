import { useState } from 'react';
import { Upload, Download, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTranslation } from '../contexts/TranslationContext';

export default function ImportContacts() {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFile(file);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    setProgress(0);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        const rows = text.split('\n');
        const total = rows.length - 1; // Exclude header row
        let processed = 0;

        // Skip header row
        for (let i = 1; i < rows.length; i++) {
          const [name, phone_number] = rows[i].split(',');
          if (name && phone_number) {
            await supabase.from('contacts').insert([
              { name: name.trim(), phone_number: phone_number.trim() }
            ]);
          }
          processed++;
          setProgress(Math.round((processed / total) * 100));
        }

        alert(t('contacts.import.upload.success'));
        setFile(null);
        setProgress(0);
      };
      reader.readAsText(file);
    } catch (error) {
      console.error('Error importing contacts:', error);
      alert(t('contacts.import.upload.error'));
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const template = 'Name,Phone Number\nJohn Doe,+1234567890';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contacts_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">{t('contacts.import.title')}</h1>

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="mb-8">
            <h3 className="text-base font-semibold leading-6 text-gray-900">
              {t('contacts.import.template.title')}
            </h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <p>{t('contacts.import.template.description')}</p>
            </div>
            <div className="mt-3">
              <button
                type="button"
                onClick={downloadTemplate}
                className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                <Download className="h-4 w-4 mr-2" />
                {t('contacts.import.template.button')}
              </button>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-base font-semibold leading-6 text-gray-900">
              {t('contacts.import.upload.title')}
            </h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <p>{t('contacts.import.upload.description')}</p>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-10 h-10 mb-3 text-gray-400" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">{t('contacts.import.upload.instructions')}</span>
                    </p>
                    <p className="text-xs text-gray-500">{t('contacts.import.upload.fileType')}</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept=".csv"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
            </div>

            {file && (
              <div className="mt-4">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>{t('contacts.import.progress.uploaded', { filename: file.name })}</span>
                </div>

                {progress > 0 && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-indigo-600 h-2.5 rounded-full"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <p className="mt-1 text-sm text-gray-500 text-right">
                      {t('contacts.import.progress.percentage', { percentage: progress })}
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleImport}
                  disabled={loading}
                  className="mt-4 inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
                >
                  {loading ? t('contacts.import.upload.importing') : t('contacts.import.upload.import')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
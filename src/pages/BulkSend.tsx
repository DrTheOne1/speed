import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Upload, FileText, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTranslation } from '../contexts/TranslationContext';
import toast from 'react-hot-toast';

export default function BulkSend() {
  const { t, language, direction } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [renderKey, setRenderKey] = useState(0);

  // Force re-render when language changes
  useEffect(() => {
    setRenderKey(prev => prev + 1);
  }, [language]);

  const bulkSMSSchema = z.object({
    message: z.string()
      .min(1, t('bulkSend.validation.messageRequired') || "Message is required")
      .max(160, t('bulkSend.validation.messageLength') || "Message must be less than 160 characters"),
    scheduledFor: z.string().optional()
  });

  type BulkSMSForm = z.infer<typeof bulkSMSSchema>;

  const { control, handleSubmit, formState: { errors }, reset } = useForm<BulkSMSForm>({
    resolver: zodResolver(bulkSMSSchema)
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setError(null);
    } else {
      setError('invalidFormat');
      toast.error(t('bulkSend.validation.invalidFormat') || "Invalid file format. Please use CSV");
    }
  };

  const onSubmit = async (data: BulkSMSForm) => {
    if (!file) {
      setError('fileRequired');
      toast.error(t('bulkSend.validation.fileRequired') || "Please select a CSV file");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        const rows = text.split('\n').slice(1);

        for (const row of rows) {
          const [recipient] = row.split(',');
          if (recipient) {
            const { error: dbError } = await supabase.from('messages').insert({
              recipient: recipient.trim(),
              message: data.message,
              scheduled_for: data.scheduledFor || null,
              status: data.scheduledFor ? 'pending' : 'sent',
            });

            if (dbError) throw dbError;
          }
        }

        reset();
        setFile(null);
        toast.success(t('bulkSend.success.scheduled') || "Messages scheduled successfully!");
      };

      reader.readAsText(file);
    } catch (err: any) {
      console.error('Error:', err);
      toast.error(t('bulkSend.error.generic') || "Failed to send messages. Please try again.");
      setError('generic');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`container mx-auto px-4 py-8 ${direction}`} key={`bulk-${renderKey}`}>
      <h1 className="text-2xl font-bold text-gray-900 mb-6" dir={direction}>
        {t('bulkSend.title')}
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Main Form */}
        <div className="md:col-span-2">
          <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-lg shadow space-y-6">
            {/* File Upload Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700" dir={direction}>
                {t('bulkSend.uploadSection.title')}
              </label>
              <div className="mt-1">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                    name="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <div className="flex flex-col items-center">
                      <Upload className="h-10 w-10 text-gray-400 mb-3" />
                      <p className="text-gray-500" dir={direction}>
                        {t('bulkSend.uploadSection.dragDrop')}{' '}
                        <span className="text-indigo-600 hover:text-indigo-500">
                          {t('bulkSend.uploadSection.browse')}
                        </span>
                      </p>
                      {file && <p className="mt-2 text-sm text-green-600">{file.name}</p>}
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Message Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700" dir={direction}>
                {t('bulkSend.messageSection.title')}
              </label>
              <div className="mt-1">
                <Controller
                  name="message"
                  control={control}
                  defaultValue=""
                  render={({ field }) => (
                    <div>
                      <textarea
                        {...field}
                        className={`w-full border ${errors.message ? 'border-red-500' : 'border-gray-300'} rounded-md p-2`}
                        rows={4}
                        placeholder={t('bulkSend.messageSection.placeholder')}
                        dir={direction}
                      />
                      {errors.message && (
                        <p className="mt-1 text-sm text-red-600" dir={direction}>{errors.message.message}</p>
                      )}
                    </div>
                  )}
                />
              </div>
            </div>

            {/* Schedule Section */}
            <div>
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-gray-700" dir={direction}>
                  {t('bulkSend.schedule.title')}
                </span>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="schedule-now"
                    name="schedule"
                    checked={!control._formValues.scheduledFor}
                    onChange={() => control._formValues.scheduledFor = ''}
                    className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                  />
                  <label htmlFor="schedule-now" className="block text-sm text-gray-700" dir={direction}>
                    {t('bulkSend.schedule.now')}
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="schedule-later"
                    name="schedule"
                    checked={!!control._formValues.scheduledFor}
                    onChange={() => control._formValues.scheduledFor = new Date().toISOString().slice(0, 16)}
                    className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                  />
                  <label htmlFor="schedule-later" className="block text-sm text-gray-700" dir={direction}>
                    {t('bulkSend.schedule.later')}
                  </label>
                </div>
              </div>

              {control._formValues.scheduledFor && (
                <div className="mt-3">
                  <Controller
                    name="scheduledFor"
                    control={control}
                    defaultValue=""
                    render={({ field }) => (
                      <input
                        type="datetime-local"
                        {...field}
                        className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      />
                    )}
                  />
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    <span className="ml-2">{t('bulkSend.sending')}</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5 mr-2" />
                    <span>{t('bulkSend.submit')}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Templates Section */}
        <div className="bg-white p-6 rounded-lg shadow" key={`templates-${renderKey}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900" dir={direction}>
              {t('bulkSend.templates.title')}
            </h2>
            <FileText className="h-5 w-5 text-gray-400" />
          </div>

          <div className="space-y-2">
            <button
              type="button"
              className="w-full text-left px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              dir={direction}
            >
              <FileText className="h-5 w-5 mr-2 text-gray-400 inline" />
              {t('bulkSend.templates.download')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
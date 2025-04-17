import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useTranslation } from '../contexts/TranslationContext';
import { Clock, Send, Users, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface SendSMSFormData {
  recipient: string;
  message: string;
  scheduled: boolean;
  scheduleTime?: Date;
}

interface Template {
  id: string;
  name: string;
  content: string;
}

export default function SendSMS() {
  const { t, language, direction } = useTranslation();
  const [formData, setFormData] = useState<SendSMSFormData>({
    recipient: '',
    message: '',
    scheduled: false,
  });
  const [templates, setTemplates] = useState<Template[]>([]);
  const [charactersRemaining, setCharactersRemaining] = useState(160);
  const [messageSegments, setMessageSegments] = useState(1);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Get user templates
  useEffect(() => {
    const fetchTemplates = async () => {
      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .order('name');
      
      if (!error && data) {
        setTemplates(data);
      }
    };

    fetchTemplates();
  }, []);

  // Calculate characters remaining and message segments
  useEffect(() => {
    const charCount = formData.message.length;
    const singleMessageLimit = 160;
    const multiMessageLimit = 153; // Characters per segment in multi-part messages
    
    let remaining = singleMessageLimit - charCount;
    let segments = 1;
    
    if (charCount > singleMessageLimit) {
      segments = Math.ceil(charCount / multiMessageLimit);
      remaining = (segments * multiMessageLimit) - charCount;
    }
    
    setCharactersRemaining(remaining);
    setMessageSegments(segments);
  }, [formData.message]);

  // Send SMS mutation
  const sendSMSMutation = useMutation({
    mutationFn: async (data: SendSMSFormData) => {
      // Here you would call your API to send the SMS
      const { error } = await supabase
        .from('messages')
        .insert({
          recipient: data.recipient,
          content: data.message,
          scheduled_for: data.scheduled ? data.scheduleTime : null,
          status: data.scheduled ? 'scheduled' : 'pending'
        });
      
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      toast.success(t('sendSMS.success'));
      setFormData({
        recipient: '',
        message: '',
        scheduled: false
      });
    },
    onError: () => {
      toast.error(t('sendSMS.error'));
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsConfirmModalOpen(true);
  };

  const confirmSend = () => {
    sendSMSMutation.mutate(formData);
    setIsConfirmModalOpen(false);
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setFormData(prev => ({
        ...prev,
        message: template.content
      }));
    }
  };

  return (
    <div className={`container mx-auto px-4 py-8 ${direction}`}>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {t('sendSMS.title')}
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Main Form */}
        <div className="md:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-6">
            {/* Recipient */}
            <div>
              <label htmlFor="recipient" className="block text-sm font-medium text-gray-700">
                {t('sendSMS.recipientLabel')}
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <input
                  type="text"
                  name="recipient"
                  id="recipient"
                  value={formData.recipient}
                  onChange={e => setFormData({...formData, recipient: e.target.value})}
                  className="flex-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full rounded-md sm:text-sm border-gray-300"
                  placeholder={t('sendSMS.recipientPlaceholder')}
                  required
                />
                <button
                  type="button"
                  className="ms-3 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Users className="h-5 w-5 text-gray-400" />
                  <span className="ml-2">{t('sendSMS.selectContacts')}</span>
                </button>
              </div>
            </div>

            {/* Message */}
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                {t('sendSMS.messageLabel')}
              </label>
              <div className="mt-1">
                <textarea
                  id="message"
                  name="message"
                  rows={5}
                  value={formData.message}
                  onChange={e => setFormData({...formData, message: e.target.value})}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder={t('sendSMS.messagePlaceholder')}
                  required
                ></textarea>
                <div className="mt-2 flex justify-between text-sm text-gray-500">
                  <div>{t('sendSMS.charactersRemaining', { count: charactersRemaining })}</div>
                  {messageSegments > 1 && (
                    <div>{t('sendSMS.messageWillBeSplit', { count: messageSegments })}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Schedule Option */}
            <div>
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-gray-700">{t('sendSMS.scheduleSend')}</span>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="schedule-now"
                    name="schedule"
                    checked={!formData.scheduled}
                    onChange={() => setFormData({...formData, scheduled: false})}
                    className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                  />
                  <label htmlFor="schedule-now" className="block text-sm text-gray-700">
                    {t('sendSMS.now')}
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="schedule-later"
                    name="schedule"
                    checked={formData.scheduled}
                    onChange={() => setFormData({...formData, scheduled: true})}
                    className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                  />
                  <label htmlFor="schedule-later" className="block text-sm text-gray-700">
                    {t('sendSMS.schedule')}
                  </label>
                </div>
              </div>

              {formData.scheduled && (
                <div className="mt-3">
                  <label htmlFor="scheduleTime" className="block text-sm font-medium text-gray-700">
                    {t('sendSMS.scheduledFor')}
                  </label>
                  <input
                    type="datetime-local"
                    id="scheduleTime"
                    name="scheduleTime"
                    onChange={e => setFormData({...formData, scheduleTime: new Date(e.target.value)})}
                    className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={sendSMSMutation.isPending}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Send className="h-5 w-5 mr-2" />
                {t('sendSMS.sendButton')}
              </button>
            </div>
          </form>
        </div>

        {/* Templates */}
        <div>
          <div className="bg-white p-6 rounded-lg shadow space-y-4">
            <h2 className="text-lg font-medium text-gray-900">{t('sendSMS.templatesTitle')}</h2>
            <ul className="space-y-2">
              {templates.map(template => (
                <li key={template.id}>
                  <button
                    type="button"
                    onClick={() => handleTemplateSelect(template.id)}
                    className="w-full text-left px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <FileText className="h-5 w-5 mr-2 text-gray-400" />
                    {template.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75">
          <div className="bg-white p-6 rounded-lg shadow space-y-4">
            <h2 className="text-lg font-medium text-gray-900">{t('sendSMS.confirmTitle')}</h2>
            <p className="text-sm text-gray-700">{t('sendSMS.confirmMessage')}</p>
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                {t('sendSMS.cancelButton')}
              </button>
              <button
                type="button"
                onClick={confirmSend}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                {t('sendSMS.confirmButton')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

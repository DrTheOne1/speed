import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2, Edit } from 'lucide-react';
import { supabase } from '../lib/supabase';
import PhoneInput from '../components/PhoneInput';
import { useTranslation } from '../contexts/TranslationContext';

export default function Contacts() {
  const { t } = useTranslation();
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', phone_number: '' });
  const [error, setError] = useState<string | null>(null);

  const { data: contacts, refetch } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      const { error: dbError } = await supabase
        .from('contacts')
        .insert([newContact]);

      if (dbError) throw dbError;

      setNewContact({ name: '', phone_number: '' });
      setIsAddingContact(false);
      refetch();
    } catch (err: any) {
      console.error('Error adding contact:', err);
      setError(t('contacts.error.add'));
    }
  };

  const handleDeleteContact = async (id: string) => {
    try {
      setError(null);
      const { error: dbError } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;
      refetch();
    } catch (err: any) {
      console.error('Error deleting contact:', err);
      setError(t('contacts.error.delete'));
    }
  };

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">{t('contacts.title')}</h1>
          <p className="mt-2 text-sm text-gray-700">
            {t('contacts.description')}
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            onClick={() => setIsAddingContact(true)}
            className="flex items-center justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('contacts.actions.add')}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{t('contacts.error.title')}</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {isAddingContact && (
        <form onSubmit={handleAddContact} className="mt-6 space-y-4 bg-white p-4 rounded-lg shadow">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              {t('contacts.form.name')}
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={newContact.name}
              onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
            />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              {t('contacts.form.phone')}
            </label>
            <PhoneInput
              id="phone"
              name="phone"
              value={newContact.phone_number}
              onChange={(value) => setNewContact({ ...newContact, phone_number: value })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddingContact(false)}
              className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              {t('contacts.form.cancel')}
            </button>
            <button
              type="submit"
              className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
              {t('contacts.form.save')}
            </button>
          </div>
        </form>
      )}

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      {t('contacts.listSection.table.name')}
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      {t('contacts.listSection.table.phone')}
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">{t('contacts.listSection.table.actions')}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {contacts?.map((contact) => (
                    <tr key={contact.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                        {contact.name}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {contact.phone_number}
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <button
                          onClick={() => handleDeleteContact(contact.id)}
                          className="text-red-600 hover:text-red-900 mr-4"
                          title={t('contacts.actions.delete')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <button 
                          className="text-indigo-600 hover:text-indigo-900"
                          title={t('contacts.actions.edit')}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
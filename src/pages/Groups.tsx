import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2, Edit, Users, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTranslation } from '../contexts/TranslationContext';
import toast from 'react-hot-toast';

export default function Groups() {
  const { t } = useTranslation();
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', description: '' });
  const [editingGroup, setEditingGroup] = useState<{ id: string; name: string; description: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Get current user on component mount
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        setUserId(data.session.user.id);
      }
    };
    getCurrentUser();
  }, []);

  const { data: groups, refetch } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups')
        .select('*, group_members(count)')
        .eq('user_id', userId) // Only get groups for current user
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId // Only run query when we have a user ID
  });

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      toast.error("You must be logged in to create groups");
      return;
    }

    try {
      setError(null);
      const { error } = await supabase
        .from('groups')
        .insert([{
          ...newGroup,
          user_id: userId // Add user_id to group creation
        }]);

      if (error) {
        console.error('Error creating group:', error);
        throw error;
      }

      setNewGroup({ name: '', description: '' });
      setIsAddingGroup(false);
      refetch();
      toast.success(t('contacts.groups.success.added'));
    } catch (error) {
      console.error('Error adding group:', error);
      setError(t('contacts.error.groupAdd'));
    }
  };

  const handleEditGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup) return;

    try {
      setError(null);
      const { error } = await supabase
        .from('groups')
        .update({
          name: editingGroup.name,
          description: editingGroup.description
        })
        .eq('id', editingGroup.id);

      if (error) throw error;

      setEditingGroup(null);
      setIsEditingGroup(false);
      refetch();
      toast.success(t('contacts.groups.success.updated'));
    } catch (error) {
      console.error('Error updating group:', error);
      setError(t('contacts.error.groupUpdate'));
    }
  };

  const handleDeleteGroup = async (id: string) => {
    try {
      setError(null);
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', id);

      if (error) throw error;
      refetch();
      toast.success(t('contacts.groups.success.deleted'));
    } catch (error) {
      console.error('Error deleting group:', error);
      setError(t('contacts.error.groupDelete'));
    }
  };

  const startEditing = (group: any) => {
    setEditingGroup({
      id: group.id,
      name: group.name,
      description: group.description
    });
    setIsEditingGroup(true);
  };

  return (
    <div>
      <div className="bg-white shadow">
        <div className="px-4 py-5 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{t('contacts.groups.title')}</h1>
              <p className="mt-1 text-sm text-gray-500">
                {t('contacts.groups.description')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddingGroup(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('contacts.groups.add')}
            </button>
          </div>
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

      {isAddingGroup && (
        <form onSubmit={handleAddGroup} className="mt-6 space-y-4 bg-white p-4 rounded-lg shadow">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              {t('contacts.groups.name')}
            </label>
            <input
              type="text"
              id="name"
              value={newGroup.name}
              onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              {t('contacts.groups.description')}
            </label>
            <textarea
              id="description"
              rows={3}
              value={newGroup.description}
              onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddingGroup(false)}
              className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
            >
              {t('contacts.groups.cancel')}
            </button>
            <button
              type="submit"
              className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
              {t('contacts.groups.save')}
            </button>
          </div>
        </form>
      )}

      {isEditingGroup && editingGroup && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => setIsEditingGroup(false)} />
            
            <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {t('contacts.groups.edit')}
                </h3>
                <button
                  onClick={() => setIsEditingGroup(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleEditGroup} className="space-y-4">
                <div>
                  <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700">
                    {t('contacts.groups.name')}
                  </label>
                  <input
                    type="text"
                    id="edit-name"
                    value={editingGroup.name}
                    onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700">
                    {t('contacts.groups.description')}
                  </label>
                  <textarea
                    id="edit-description"
                    rows={3}
                    value={editingGroup.description}
                    onChange={(e) => setEditingGroup({ ...editingGroup, description: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingGroup(false)}
                    className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                  >
                    {t('contacts.groups.cancel')}
                  </button>
                  <button
                    type="submit"
                    className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
                  >
                    {t('contacts.groups.save')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      {t('contacts.groups.name')}
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      {t('contacts.groups.description')}
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      {t('contacts.groups.members')}
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">{t('contacts.listSection.table.actions')}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {groups?.map((group) => (
                    <tr key={group.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                        {group.name}
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-500">
                        {group.description}
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          {group.group_members?.[0]?.count || 0}
                        </div>
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <button
                          onClick={() => handleDeleteGroup(group.id)}
                          className="text-red-600 hover:text-red-900 mr-4"
                          title={t('contacts.groups.delete')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => startEditing(group)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title={t('contacts.groups.edit')}
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
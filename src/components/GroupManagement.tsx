import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, Trash2, Eye, X } from 'lucide-react';
import { supabase, verifyArabicStorage } from '../lib/supabase';
import { useTranslation } from '../contexts/TranslationContext';
import toast from 'react-hot-toast';

interface Group {
  id: string;
  name: string;
  description: string;
  contact_count?: number;
}

interface Contact {
  id: string;
  name: string;
  name_ar?: string;
  phone_number: string;
}

export function GroupManagement() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', description: '' });
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupContacts, setGroupContacts] = useState<Contact[]>([]);
  const [isViewingContacts, setIsViewingContacts] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        setUserId(data.session.user.id);
      }
    };
    getCurrentUser();

    const checkArabicStorage = async () => {
      const isWorking = await verifyArabicStorage();
      if (!isWorking) {
        console.error('Arabic text storage verification failed');
        toast.error('Warning: Arabic text storage might not be working correctly');
      }
    };
    checkArabicStorage();
  }, []);

  const { data: groups, refetch: refetchGroups } = useQuery({
    queryKey: ['groups-with-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups')
        .select(`
          id,
          name,
          description,
          created_at,
          group_members (count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(group => ({
        ...group,
        contact_count: group.group_members[0].count
      }));
    },
  });

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      toast.error(t('contacts.groups.error.auth'));
      return;
    }

    try {
      const { error } = await supabase
        .from('groups')
        .insert([{
          ...newGroup,
          user_id: userId
        }]);

      if (error) throw error;

      setNewGroup({ name: '', description: '' });
      setIsAddingGroup(false);
      refetchGroups();
      toast.success(t('contacts.groups.success.added'));
    } catch (error) {
      console.error('Error adding group:', error);
      toast.error(t('contacts.groups.error.add'));
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;

      refetchGroups();
      toast.success(t('contacts.groups.success.deleted'));
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error(t('contacts.groups.error.delete'));
    }
  };

  const handleDeleteSelectedContacts = async () => {
    if (!selectedGroup || isDeleting || selectedContacts.size === 0) return;

    try {
      setIsDeleting(true);

      const contactsToDelete = Array.from(selectedContacts);

      // Delete contacts from the contacts table
      const { error: deleteError } = await supabase
        .from('contacts')
        .delete()
        .in('id', contactsToDelete);

      if (deleteError) {
        console.error('Error deleting contacts:', deleteError);
        toast.error(t('contacts.groups.error.deleteContacts'));
        return;
      }

      // Update local state
      setGroupContacts(prev => prev.filter(contact => !selectedContacts.has(contact.id)));
      setSelectedContacts(new Set());
      
      // Refresh group counts
      await refetchGroups();
      
      toast.success(t('contacts.groups.success.contactsDeleted', { count: contactsToDelete.length }));
    } catch (error) {
      console.error('Error deleting contacts:', error);
      toast.error(t('contacts.groups.error.deleteContacts'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleViewContacts = async (group: Group) => {
    setSelectedGroup(group);
    setIsViewingContacts(true);
    setSelectedContacts(new Set());

    try {
      // First get all group member IDs
      const { data: memberData, error: memberError } = await supabase
        .from('group_members')
        .select('contact_id')
        .eq('group_id', group.id);

      if (memberError) throw memberError;

      const contactIds = memberData?.map(member => member.contact_id) || [];

      if (contactIds.length === 0) {
        setGroupContacts([]);
        return;
      }

      // Then get the contact details
      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select('id, name, name_ar, phone_number')
        .in('id', contactIds);

      if (contactsError) throw contactsError;

      setGroupContacts(contacts || []);
    } catch (error) {
      console.error('Error fetching group contacts:', error);
      toast.error('Failed to load contacts');
    }
  };

  const toggleContactSelection = (contactId: string) => {
    setSelectedContacts(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(contactId)) {
        newSelection.delete(contactId);
      } else {
        newSelection.add(contactId);
      }
      return newSelection;
    });
  };

  const handleSelectAll = () => {
    if (selectedContacts.size === groupContacts.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(groupContacts.map(contact => contact.id)));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {t('contacts.groups.title')}
        </h2>
        <button
          type="button"
          onClick={() => setIsAddingGroup(true)}
          className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('contacts.groups.add')}
        </button>
      </div>

      {isAddingGroup && (
        <form onSubmit={handleAddGroup} className="mt-4 bg-gray-50 p-4 rounded-lg">
          <div className="space-y-4">
            <input
              type="text"
              value={newGroup.name}
              onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
              placeholder={t('contacts.groups.name')}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
            />
            <textarea
              rows={3}
              value={newGroup.description}
              onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
              placeholder={t('contacts.groups.description')}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
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
          </div>
        </form>
      )}

      <div className="mt-4">
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <ul role="list" className="divide-y divide-gray-200">
            {groups?.map((group) => (
              <li key={group.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Users className="h-5 w-5 text-gray-400 mr-3" />
                    <span className="text-sm font-medium text-gray-900">{group.name}</span>
                    <span className="mx-2 text-sm text-gray-500">•</span>
                    <span className="text-sm text-gray-500">
                      {t('contacts.groups.contactCount', { count: group.contact_count || 0 })}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleViewContacts(group)}
                      className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-sm font-medium text-gray-600 hover:bg-gray-100"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      {t('contacts.groups.view')}
                    </button>
                    <button
                      onClick={() => handleDeleteGroup(group.id)}
                      className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-sm font-medium text-red-700 hover:bg-red-100"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      {t('contacts.groups.delete')}
                    </button>
                  </div>
                </div>
                {group.description && (
                  <p className="mt-1 text-sm text-gray-500 ml-8">{group.description}</p>
                )}
              </li>
            ))}
            {(!groups || groups.length === 0) && (
              <li className="px-4 py-5 text-center text-gray-500">
                {t('contacts.groups.empty')}
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Contact List Modal */}
      {isViewingContacts && selectedGroup && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {t('contacts.groups.contacts.title', { groupName: selectedGroup.name })}
              </h3>
              <button
                onClick={() => {
                  setIsViewingContacts(false);
                  setSelectedGroup(null);
                  setGroupContacts([]);
                  setSelectedContacts(new Set());
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedContacts.size === groupContacts.length && groupContacts.length > 0}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    {selectedContacts.size} selected
                  </span>
                </div>
                {selectedContacts.size > 0 && (
                  <button
                    onClick={handleDeleteSelectedContacts}
                    disabled={isDeleting}
                    className="inline-flex items-center rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('contacts.groups.contacts.deleteSelected', { count: selectedContacts.size })}
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {groupContacts.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {groupContacts.map((contact) => (
                    <li key={contact.id} className="py-3 flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedContacts.has(contact.id)}
                        onChange={() => toggleContactSelection(contact.id)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-4"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{contact.name}</p>
                        {contact.name_ar && (
                          <p className="text-sm text-gray-600 arabic-text" lang="ar" dir="rtl">
                            {contact.name_ar}
                          </p>
                        )}
                        <p className="text-sm text-gray-500">{contact.phone_number}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-center text-gray-500 py-4">
                  {t('contacts.groups.contacts.empty')}
                </p>
              )}
            </div>
            <div className="px-4 py-3 border-t border-gray-200">
              <button
                onClick={() => {
                  setIsViewingContacts(false);
                  setSelectedGroup(null);
                  setGroupContacts([]);
                  setSelectedContacts(new Set());
                }}
                className="w-full inline-flex justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                {t('contacts.groups.contacts.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
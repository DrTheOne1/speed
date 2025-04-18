import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, Trash2, Eye, X, Import, Edit } from 'lucide-react';
import { supabase, verifyArabicStorage } from '../lib/supabase';
import { useTranslation } from '../contexts/TranslationContext';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Tooltip from '../components/Tooltip';

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

interface GroupWithMembers extends Group {
  group_members: { contact_id: string }[];
}

export default function Groups() {
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
  const [isEditing, setIsEditing] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);

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
          group_members (
            contact_id
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Count the number of group members for each group
      const groupsWithCounts = (data as GroupWithMembers[]).map(group => {
        const count = Array.isArray(group.group_members) ? group.group_members.length : 0;
        return {
          ...group,
          contact_count: count
        };
      });

      return groupsWithCounts;
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

  const handleEditGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup) return;

    try {
      const { error } = await supabase
        .from('groups')
        .update({
          name: editingGroup.name,
          description: editingGroup.description
        })
        .eq('id', editingGroup.id);

      if (error) throw error;

      setIsEditing(false);
      setEditingGroup(null);
      refetchGroups();
      toast.success(t('contacts.groups.success.updated'));
    } catch (error) {
      console.error('Error updating group:', error);
      toast.error(t('contacts.groups.error.update'));
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm(t('contacts.groups.confirm.delete'))) return;

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

      // Only delete the group membership association, not the contact itself
      const { error: deleteError } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', selectedGroup.id)
        .in('contact_id', contactsToDelete);

      if (deleteError) {
        console.error('Error deleting contacts from group:', deleteError);
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
      console.error('Error deleting contacts from group:', error);
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">{t('contacts.groups.title')}</h1>
        <div className="flex space-x-4">
          <Tooltip text={t('contacts.groups.import')}>
            <Link
              to="/import-contacts"
              className="inline-flex items-center p-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Import className="h-5 w-5" />
            </Link>
          </Tooltip>
          <Tooltip text={t('contacts.groups.add')}>
            <button
              onClick={() => setIsAddingGroup(true)}
              className="inline-flex items-center p-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Plus className="h-5 w-5" />
            </button>
          </Tooltip>
        </div>
      </div>

      {isAddingGroup && (
        <div className="bg-white shadow rounded-lg p-6">
          <form onSubmit={handleAddGroup} className="space-y-4">
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
                value={newGroup.description}
                onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-3">
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
        </div>
      )}

      {isEditing && editingGroup && (
        <div className="bg-white shadow rounded-lg p-6">
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
                value={editingGroup.description}
                onChange={(e) => setEditingGroup({ ...editingGroup, description: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setEditingGroup(null);
                }}
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
      )}

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups?.map((group) => (
              <div key={group.id} className="bg-white border rounded-lg shadow-sm p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{group.name}</h3>
                    <p className="mt-1 text-sm text-gray-500">{group.description}</p>
                    <p className="mt-2 text-sm text-gray-500 flex items-center">
                      <span className="flex items-center gap-2" dir="auto">
                        <Users className="h-4 w-4 text-gray-400" />
                        {t('contacts.groups.memberCount', { count: group.contact_count || 0 })}
                      </span>
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Tooltip text={t('contacts.groups.view')}>
                      <button
                        onClick={() => handleViewContacts(group)}
                        className="inline-flex items-center p-2 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </Tooltip>
                    <Tooltip text={t('contacts.groups.edit')}>
                      <button
                        onClick={() => {
                          setEditingGroup(group);
                          setIsEditing(true);
                        }}
                        className="inline-flex items-center p-2 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </Tooltip>
                    <Tooltip text={t('contacts.groups.delete')}>
                      <button
                        onClick={() => handleDeleteGroup(group.id)}
                        className="inline-flex items-center p-2 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </Tooltip>
                  </div>
                </div>
              </div>
            ))}
            {(!groups || groups.length === 0) && (
              <div className="col-span-full text-center text-gray-500 py-8">
                {t('contacts.groups.empty')}
              </div>
            )}
          </div>
        </div>
      </div>

      {isViewingContacts && selectedGroup && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center border-b">
              <h3 className="text-lg font-medium text-gray-900">
                {t('contacts.groups.viewContacts', { group: selectedGroup.name })}
              </h3>
              <Tooltip text={t('contacts.groups.contacts.close')}>
                <button
                  onClick={() => {
                    setIsViewingContacts(false);
                    setSelectedGroup(null);
                    setGroupContacts([]);
                    setSelectedContacts(new Set());
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </Tooltip>
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
                    {selectedContacts.size} {t('contacts.groups.contacts.selected')}
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

            <div className="overflow-y-auto max-h-[60vh] p-4">
              {groupContacts.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {groupContacts.map((contact) => (
                    <li key={contact.id} className="py-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedContacts.has(contact.id)}
                          onChange={() => toggleContactSelection(contact.id)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-4"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{contact.name}</p>
                          {contact.name_ar && (
                            <p className="text-sm text-gray-600 arabic-text" lang="ar" dir="rtl">
                              {contact.name_ar}
                            </p>
                          )}
                          <p className="text-sm text-gray-500">{contact.phone_number}</p>
                        </div>
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

            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
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
import { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useTranslation } from '../contexts/TranslationContext';
import { Clock, Send, Users, Plus, CreditCard } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { classNames } from '../utils/classNames';
import { useCredits } from '../hooks/useCredits';

interface SendGroupMessageFormData {
  message: string;
  scheduled: boolean;
  scheduleTime?: Date | undefined;
}

interface Group {
  id: string;
  name: string;
  description: string;
  contact_count?: number;
}

interface Contact {
  id: string;
  name: string;
  phone_number: string;
}

interface GroupWithMembers extends Group {
  group_members: { contact_id: string }[];
}

export default function SendGroupMessages() {
  const { t, language, direction } = useTranslation();
  const { credits, loading: creditsLoading, deductCredits } = useCredits();
  const [formData, setFormData] = useState<SendGroupMessageFormData>({
    message: '',
    scheduled: false,
  });
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupContacts, setGroupContacts] = useState<Contact[]>([]);
  const [charactersRemaining, setCharactersRemaining] = useState(800);
  const [messageSegments, setMessageSegments] = useState(1);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [renderKey, setRenderKey] = useState(0);
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', description: '' });
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);
  const groupDropdownRef = useRef<HTMLDivElement>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isScheduleDropdownOpen, setIsScheduleDropdownOpen] = useState(false);
  const [availableSenders, setAvailableSenders] = useState<string[]>([]);
  const [selectedSender, setSelectedSender] = useState<string>(() => {
    // Try to get previously selected sender from localStorage
    return localStorage.getItem('lastSelectedSender') || '';
  });

  // Add these functions to save selections to localStorage
  const saveSelectedSender = (senderId: string) => {
    setSelectedSender(senderId);
    localStorage.setItem('lastSelectedSender', senderId);
  };

  const saveSelectedGroup = (group: Group) => {
    setSelectedGroup(group);
    localStorage.setItem('lastSelectedGroupId', group.id);
    // Store the group name too for display purposes if needed
    localStorage.setItem('lastSelectedGroupName', group.name);
  };

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

  // Fetch available sender IDs
  useEffect(() => {
    const fetchSenderIds = async () => {
      if (!userId) return;

      const { data, error } = await supabase
        .from('users')
        .select('sender_names')
        .eq('id', userId)
        .single();

      if (!error && data && Array.isArray(data.sender_names)) {
        setAvailableSenders(data.sender_names);
        if (data.sender_names.length > 0) {
          setSelectedSender(data.sender_names[0]);
        }
      }
    };

    fetchSenderIds();
  }, [userId]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (groupDropdownRef.current && !groupDropdownRef.current.contains(event.target as Node)) {
        setIsGroupDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Query for groups
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

  // Add this useEffect after the groups query is defined
  useEffect(() => {
    // Try to restore the last selected group when groups are loaded
    if (groups?.length && !selectedGroup) {
      const lastGroupId = localStorage.getItem('lastSelectedGroupId');
      if (lastGroupId) {
        const savedGroup = groups.find(g => g.id === lastGroupId);
        if (savedGroup) {
          setSelectedGroup(savedGroup);
        }
      }
    }
  }, [groups, selectedGroup]);

  // Fetch contacts when a group is selected
  useEffect(() => {
    const fetchGroupContacts = async () => {
      if (selectedGroup) {
        const { data, error } = await supabase
          .from('group_members')
          .select(`
            contacts (
              id,
              name,
              phone_number
            )
          `)
          .eq('group_id', selectedGroup.id);

        if (!error && data) {
          const contacts = data
            .flatMap(item => item.contacts || [])
            .filter((contact): contact is Contact => 
              contact !== null && 
              typeof contact === 'object' &&
              'id' in contact &&
              'name' in contact &&
              'phone_number' in contact
            );
          setGroupContacts(contacts);
        }
      }
    };

    fetchGroupContacts();
  }, [selectedGroup]);

  // Calculate characters remaining and message segments
  useEffect(() => {
    const charCount = formData.message.length;
    const isArabic = /[\u0600-\u06FF]/.test(formData.message); // Check if message contains Arabic characters
    
    // Character limits based on language
    const singleMessageLimit = isArabic ? 70 : 160;
    const multiMessageLimit = isArabic ? 68 : 153; // Characters per segment in multi-part messages
    
    let remaining = singleMessageLimit - charCount;
    let segments = 1;
    
    if (charCount > singleMessageLimit) {
      segments = Math.ceil(charCount / multiMessageLimit);
      remaining = (segments * multiMessageLimit) - charCount;
    }
    
    setCharactersRemaining(remaining);
    setMessageSegments(segments);
  }, [formData.message]);

  // Calculate message points based on segments
  const calculateMessagePoints = (segments: number) => {
    return segments; // Each segment equals one point
  };

  // Force re-render when language changes
  useEffect(() => {
    setRenderKey(prev => prev + 1);
  }, [language]);

  // Replace or update your existing validatePhoneNumbers function
  const validatePhoneNumbers = (contacts: Contact[]) => {
    const invalidContacts: { name: string; phone: string }[] = [];
    
    contacts.forEach(contact => {
      // Clean the number first
      const cleanNumber = contact.phone_number.replace(/[\s\-\(\)\.]/g, '');
      
      // Special case for Swedish numbers
      if (cleanNumber.startsWith('+46') && cleanNumber.length >= 10) {
        // Swedish numbers are valid, skip validation
        return;
      }
      
      // For other numbers, perform validation
      try {
        if (!cleanNumber.startsWith('+')) {
          // Missing country code
          invalidContacts.push({
            name: contact.name, 
            phone: contact.phone_number
          });
          return;
        }
        
        // Accept any number that starts with + and has at least 8 digits
        if (cleanNumber.startsWith('+') && cleanNumber.length >= 8) {
          return; // Valid enough
        }
        
        // Only get here for obviously invalid numbers
        invalidContacts.push({
          name: contact.name, 
          phone: contact.phone_number
        });
      } catch (e) {
        invalidContacts.push({
          name: contact.name, 
          phone: contact.phone_number
        });
      }
    });
    
    return invalidContacts;
  };

  // Send SMS mutation
  const sendSMSMutation = useMutation({
    mutationFn: async (data: SendGroupMessageFormData) => {
      if (!selectedGroup) throw new Error('No group selected');
      if (!groupContacts.length) throw new Error('No contacts in the selected group');
      if (!data.message.trim()) throw new Error('Message cannot be empty');

      try {
        // Get current user session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session?.user) {
          throw new Error('Authentication error: Please log in again');
        }

        // Get user details including gateway_id
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('gateway_id')
          .eq('id', session.user.id)
          .single();

        if (userError || !userData) {
          throw new Error('Failed to get user details');
        }

        if (!userData.gateway_id) {
          throw new Error('No gateway configured for your account');
        }

        // Calculate required credits based on message segments and number of recipients
        const requiredCredits = messageSegments * groupContacts.length;
        if (requiredCredits > credits) {
          throw new Error(`Insufficient credits. Required: ${requiredCredits}, Available: ${credits}`);
        }

        const minutesFromNow = data.scheduleTime 
          ? Math.round((data.scheduleTime.getTime() - new Date().getTime()) / 60000) 
          : null;

        // Insert messages into the database with the new field
        const { data: messagesData, error: insertError } = await supabase
          .from('messages')
          .insert(
            groupContacts.map(contact => ({
              user_id: session.user.id,
              gateway_id: userData.gateway_id,
              sender_id: selectedSender,
              recipient: contact.phone_number,
              message: data.message,
              scheduled_for: data.scheduled && data.scheduleTime 
                ? data.scheduleTime.toISOString() 
                : null,
              minutes_from_now: minutesFromNow,  // Store the relative time
              status: 'pending' // ✅ CORRECT
            }))
          )
          .select('id, recipient');
        
        if (insertError) {
          console.error('Error inserting messages:', insertError);
          throw new Error(insertError.message || 'Failed to send messages');
        }

        // If not scheduled, send messages immediately
        if (!data.scheduled) {
          const endpoint = 'send-sms';
          
          for (const messageData of messagesData) {
            // In your edge function, add status updates:
            // 1. Mark as processing first
            await supabase
              .from('messages')
              .update({ status: 'processing' })
              .eq('id', messageData.id);

            try {
              // Send message logic
              const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${endpoint}`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    gateway_id: userData.gateway_id,
                    sender_id: selectedSender,
                    recipient: messageData.recipient,
                    message: data.message,
                    message_id: messageData.id
                  }),
                }
              );

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to send message');
              }

              // Update to sent if successful
              await supabase
                .from('messages')
                .update({ 
                  status: 'sent',
                  sent_at: new Date().toISOString() 
                })
                .eq('id', messageData.id);

            } catch (error: unknown) {
              console.error(`Error sending message ${messageData.id}:`, error);
              
              // Mark as failed with error message
              await supabase
                .from('messages')
                .update({ 
                  status: 'failed',
                  error_message: error instanceof Error ? error.message : 'Unknown error occurred'
                })
                .eq('id', messageData.id);
            }
          }
        }
        
        // After successful message sending, deduct credits
        await deductCredits(requiredCredits);
        
        return true;
      } catch (error: unknown) {
        console.error('Error in sendSMSMutation:', error);
        throw error instanceof Error ? error : new Error('Unknown error occurred');
      }
    },
    onSuccess: () => {
      toast.success(t('sendGroupMessages.success'));
      setFormData({
        message: '',
        scheduled: false
      });
      setSelectedGroup(null);
      setGroupContacts([]);
    },
    onError: (error: Error) => {
      console.error('Error sending messages:', error);
      toast.error(error.message || t('sendGroupMessages.error'));
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Add validation for sender_id
    if (!selectedSender) {
      toast.error(t('sendGroupMessages.errors.noSenderId'));
      return;
    }
    
    // Validate form data before showing confirmation
    if (!selectedGroup) {
      toast.error(t('sendGroupMessages.errors.noGroup'));
      return;
    }
    
    if (!formData.message.trim()) {
      toast.error(t('sendGroupMessages.errors.noMessage'));
      return;
    }
    
    if (formData.scheduled && !formData.scheduleTime) {
      toast.error(t('sendGroupMessages.errors.noScheduleTime'));
      return;
    }
    
    // Add phone number validation
    const invalidPhones = validatePhoneNumbers(groupContacts);
    if (invalidPhones.length > 0) {
      const errorMessage = `The following contacts have invalid phone numbers:\n${invalidPhones.map(c => `${c.name}: ${c.phone}`).join('\n')}`;
      toast.error(errorMessage);
      return;
    }
    
    setIsConfirmModalOpen(true);
  };

  // Add group function
  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      toast.error(t('contacts.groups.error.noUser'));
      return;
    }

    try {
      const { data, error } = await supabase
        .from('groups')
        .insert([{
          name: newGroup.name,
          description: newGroup.description,
          user_id: userId
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success(t('contacts.groups.success.added'));
      setNewGroup({ name: '', description: '' });
      setIsAddingGroup(false);
      
      // Refresh groups list
      refetchGroups();
    } catch (error) {
      console.error('Error adding group:', error);
      toast.error(t('contacts.groups.error.add'));
    }
  };

  // Update the schedule time handler
  const handleScheduleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const dateValue = e.target.value ? new Date(e.target.value) : undefined;
      setFormData({...formData, scheduleTime: dateValue});
    } catch (err) {
      console.error("Invalid date format:", err);
      toast.error(t('sendGroupMessages.errors.invalidDate'));
    }
  };

  // Update the scheduled messages query
  const processScheduledMessages = async () => {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('messages')
      .update({ status: 'processing' })
      .eq('status', 'pending')
      .eq('scheduled_for', now);
      
    if (error) {
      console.error('Error processing scheduled messages:', error);
      toast.error(t('sendGroupMessages.errors.processScheduled'));
    }
  };

  return (
    <div className={`container mx-auto px-4 py-8 ${direction}`} key={`group-messages-container-${language}`}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {t('sendGroupMessages.title')}
        </h1>
        
        <div className="bg-white py-2 px-4 rounded-full shadow border border-gray-200 flex items-center">
          <CreditCard className="h-5 w-5 text-indigo-600 mr-2" />
          <span className="font-medium">
            {creditsLoading 
              ? t('dashboard.credits.loading')
              : `${t('dashboard.credits.title')}: ${credits}`}
          </span>
          {credits <= 50 && (
            <span className="ml-2 text-amber-600">
              ({t('dashboard.credits.low')})
            </span>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Main Form */}
        <div className="md:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-6">
            {/* Group Selection */}
            <div className="relative">
              <label htmlFor="group" className="block text-sm font-medium text-gray-700">
                {t('sendGroupMessages.groupLabel')}
              </label>
              <div className="mt-1 relative">
                <button
                  type="button"
                  onClick={() => setIsGroupDropdownOpen(!isGroupDropdownOpen)}
                  className="relative w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <span className="block truncate">
                    {selectedGroup ? selectedGroup.name : t('sendGroupMessages.selectGroup')}
                  </span>
                  <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </span>
                </button>
                
                {isGroupDropdownOpen && (
                  <div 
                    ref={groupDropdownRef}
                    className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none sm:text-sm"
                  >
                    <div className="px-3 py-2 border-b border-gray-200">
                      <button
                        type="button"
                        onClick={() => setIsAddingGroup(true)}
                        className="flex items-center text-sm text-indigo-600 hover:text-indigo-500"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {t('contacts.groups.add')}
                      </button>
                    </div>
                    
                    {groups?.map(group => (
                      <div
                        key={group.id}
                        className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-indigo-50"
                        onClick={() => {
                          saveSelectedGroup(group);
                          setIsGroupDropdownOpen(false);
                        }}
                      >
                        <div className="flex items-center">
                          <span className="ml-3 block truncate">
                            {group.name} ({group.contact_count} {t('sendGroupMessages.members')})
                          </span>
                        </div>
                        
                        {selectedGroup?.id === group.id && (
                          <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-indigo-600">
                            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Add Group Form */}
            {isAddingGroup && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">{t('contacts.groups.add')}</h3>
                <form onSubmit={handleAddGroup} className="space-y-4">
                  <div>
                    <label htmlFor="groupName" className="block text-sm font-medium text-gray-700">
                      {t('contacts.groups.name')}
                    </label>
                    <input
                      type="text"
                      id="groupName"
                      value={newGroup.name}
                      onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="groupDescription" className="block text-sm font-medium text-gray-700">
                      {t('contacts.groups.description')}
                    </label>
                    <textarea
                      id="groupDescription"
                      rows={3}
                      value={newGroup.description}
                      onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setIsAddingGroup(false)}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      {t('contacts.groups.cancel')}
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      {t('contacts.groups.save')}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Sender Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t('sendGroupMessages.senderLabel') || 'Avsändar-ID'}
              </label>
              <select
                id="sender_id"
                name="sender_id"
                value={selectedSender}
                onChange={(e) => saveSelectedSender(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                required
              >
                {availableSenders.length === 0 ? (
                  <option value="">{t('sendGroupMessages.noSendersAvailable')}</option>
                ) : (
                  availableSenders.map((sender) => (
                    <option key={sender} value={sender}>
                      {sender}
                    </option>
                  ))
                )}
              </select>
              {availableSenders.length === 0 && (
                <p className="mt-2 text-sm text-red-600">
                  {t('sendGroupMessages.configureSenderIdsFirst')}
                </p>
              )}
            </div>

            {/* Message */}
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                {t('sendGroupMessages.messageLabel')}
              </label>
              <div className="mt-1">
                <textarea
                  id="message"
                  name="message"
                  rows={5}
                  value={formData.message}
                  onChange={e => setFormData({...formData, message: e.target.value})}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  placeholder={t('sendGroupMessages.messagePlaceholder')}
                  required
                ></textarea>
                <div className="mt-2 flex justify-between text-sm text-gray-500">
                  <div>
                    {t('sendGroupMessages.charactersRemaining', { count: charactersRemaining })}
                  </div>
                  <div>
                    {messageSegments > 1 && (
                      <>
                        {t('sendGroupMessages.messageWillBeSplit', { count: messageSegments })}
                        <span className="ml-2">
                          ({t('sendGroupMessages.messagePoints', { points: calculateMessagePoints(messageSegments) })})
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Schedule Option */}
            <div>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsScheduleDropdownOpen(!isScheduleDropdownOpen)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Send className="h-5 w-5 mr-2" />
                  {formData.scheduled ? t('sendGroupMessages.scheduleLater') : t('sendGroupMessages.scheduleNow')}
                  <svg className="ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {isScheduleDropdownOpen && (
                  <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none sm:text-sm">
                    <div
                      className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-indigo-50"
                      onClick={() => {
                        setFormData({...formData, scheduled: false});
                        setIsScheduleDropdownOpen(false);
                      }}
                    >
                      <div className="flex items-center">
                        <Send className="h-5 w-5 text-indigo-600 mr-3" />
                        <span className="block truncate">{t('sendGroupMessages.scheduleNow')}</span>
                      </div>
                    </div>
                    <div
                      className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-indigo-50"
                      onClick={() => {
                        setFormData({...formData, scheduled: true});
                        setIsScheduleDropdownOpen(false);
                      }}
                    >
                      <div className="flex items-center">
                        <Clock className="h-5 w-5 text-indigo-600 mr-3" />
                        <span className="block truncate">{t('sendGroupMessages.scheduleLater')}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {formData.scheduled && (
                <div className="mt-3">
                  <label htmlFor="scheduleTime" className="block text-sm font-medium text-gray-700">
                    {t('sendGroupMessages.scheduledFor')}
                  </label>
                  <input
                    type="datetime-local"
                    id="scheduleTime"
                    name="scheduleTime"
                    onChange={handleScheduleTimeChange}
                    className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                className={classNames(
                  "inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500",
                  direction === 'rtl' ? 'flex-row-reverse' : ''
                )}
                disabled={sendSMSMutation.isPending || !selectedGroup}
              >
                <Send className={classNames(
                  "h-5 w-5",
                  direction === 'rtl' ? 'ml-2' : 'mr-2'
                )} />
                {t('sendGroupMessages.sendButton')}
              </button>
            </div>
          </form>
        </div>

        {/* Group Info */}
        <div className="bg-white p-6 rounded-lg shadow" key={`group-info-${renderKey}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">
              {t('sendGroupMessages.groupInfo')}
            </h2>
            <Users className="h-5 w-5 text-gray-400" />
          </div>

          {selectedGroup ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">{t('sendGroupMessages.groupName')}</h3>
                <p className="mt-1 text-sm text-gray-900">{selectedGroup.name}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">{t('sendGroupMessages.groupDescription')}</h3>
                <p className="mt-1 text-sm text-gray-900">{selectedGroup.description}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">{t('sendGroupMessages.memberCount')}</h3>
                <p className="mt-1 text-sm text-gray-900">{groupContacts.length}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">{t('sendGroupMessages.recipients')}</h3>
                <ul className="mt-1 text-sm text-gray-900 space-y-1">
                  {groupContacts.map(contact => (
                    <li key={contact.id}>{contact.name} ({contact.phone_number})</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">{t('sendGroupMessages.selectGroupPrompt')}</p>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75">
          <div className="bg-white p-6 rounded-lg shadow space-y-4">
            <h2 className="text-lg font-medium text-gray-900">{t('sendGroupMessages.confirmTitle')}</h2>
            <p className="text-sm text-gray-700">
              {t('sendGroupMessages.confirmMessage', { 
                group: selectedGroup?.name,
                count: groupContacts.length
              })}
            </p>
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                {t('sendGroupMessages.cancelButton')}
              </button>
              <button
                type="button"
                onClick={() => {
                  sendSMSMutation.mutate(formData);
                  setIsConfirmModalOpen(false);
                }}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                {t('sendGroupMessages.confirmButton')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
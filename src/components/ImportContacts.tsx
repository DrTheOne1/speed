import { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, Download, CheckCircle, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTranslation } from '../contexts/TranslationContext';
import { countryCodes } from '../config/countryCodes';
import toast from 'react-hot-toast';

interface ImportedContact {
  name: string;
  name_ar?: string;
  phone_number: string;
  user_id?: string;
}

interface Contact {
  id: string;
  name: string;
  name_ar?: string;
  phone_number: string;
}

const STORAGE_KEY = 'lastSelectedGroup';

const normalizePhoneNumber = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

const formatPhoneNumber = (phone: string, countryCode: string): string => {
  let digits = phone.replace(/\D/g, '');
  
  if (phone.startsWith('+') && phone.slice(1).startsWith(countryCode)) {
    digits = digits.substring(countryCode.length);
  }
  else if (digits.startsWith('00') && digits.slice(2).startsWith(countryCode)) {
    digits = digits.substring(countryCode.length + 2);
  }
  else if (digits.startsWith(countryCode)) {
    digits = digits.substring(countryCode.length);
  }
  
  if (digits.startsWith('0')) {
    digits = digits.substring(1);
  }
  
  return `+${countryCode}${digits}`;
};

const processContacts = (text: string, countryCode: string, userId: string): ImportedContact[] => {
  // First, detect and handle BOM if present
  const cleanText = text.replace(/^\uFEFF/, '');
  
  // Split by newlines, handling both \r\n and \n
  const lines = cleanText.split(/\r?\n/);
  
  return lines
    .filter(line => line.trim().length > 0)
    .map((line, index) => {
      // Split by comma, but handle quoted values to preserve commas within quotes
      const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/)
        .map(part => part.trim().replace(/^"(.*)"$/, '$1'));

      let name = '';
      let nameAr = '';
      let phone = '';

      if (parts.length >= 3) {
        [name, nameAr, phone] = parts;
      } else if (parts.length === 2) {
        [name, phone] = parts;
      } else {
        phone = parts[0];
        name = `Contact ${index + 1}`;
      }

      // Clean up any remaining quotes and trim
      name = name.replace(/^["']|["']$/g, '').trim();
      nameAr = nameAr.replace(/^["']|["']$/g, '').trim();
      phone = phone.replace(/^["']|["']$/g, '').trim();

      const formattedPhone = formatPhoneNumber(phone, countryCode);

      return {
        name,
        name_ar: nameAr || undefined,
        phone_number: formattedPhone,
        user_id: userId
      };
    })
    .filter(contact => contact.phone_number.match(/^\+\d{7,15}$/));
};

export function ImportContacts() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedCountry, setSelectedCountry] = useState<string>('46');
  const [phoneNumbers, setPhoneNumbers] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) || '';
  });
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', description: '' });
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);
  const groupDropdownRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        setUserId(data.session.user.id);
      }
    };
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      localStorage.setItem(STORAGE_KEY, selectedGroup);
    }
  }, [selectedGroup]);

  const { data: groups, refetch: refetchGroups } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (groups && selectedGroup) {
      const groupExists = groups.some(group => group.id === selectedGroup);
      if (!groupExists) {
        setSelectedGroup('');
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, [groups, selectedGroup]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (groupDropdownRef.current && !groupDropdownRef.current.contains(event.target as Node)) {
        setIsGroupDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleFileContent = async (content: string) => {
    try {
      if (!selectedGroup) {
        toast.error(t('contacts.import.error.noGroup'));
        return;
      }

      if (!userId) {
        toast.error("You must be logged in to import contacts");
        return;
      }

      const contacts = processContacts(content, selectedCountry, userId);

      if (contacts.length === 0) {
        toast.error(t('contacts.import.error.noValidContacts'));
        return;
      }

      // Log the processed contacts to verify Arabic text
      console.log('Processed contacts:', contacts);

      // Find existing contacts
      const { data: existingContacts, error: contactsError } = await supabase
        .from('contacts')
        .select('id, phone_number')
        .in('phone_number', contacts.map(c => c.phone_number));

      if (contactsError) {
        throw new Error('Failed to check existing contacts');
      }

      const existingPhoneNumbers = new Map(
        (existingContacts || []).map(c => [c.phone_number, c.id])
      );

      // Prepare contacts for insertion and group memberships
      const newContacts = [];
      const groupMembers = [];
      const existingMembers = new Set();

      // Get existing group members
      const { data: currentGroupMembers, error: groupMembersError } = await supabase
        .from('group_members')
        .select('contact_id')
        .eq('group_id', selectedGroup);

      if (groupMembersError) {
        throw new Error('Failed to check existing group members');
      }

      // Create a set of existing contact IDs in the group
      const existingGroupMembers = new Set(
        (currentGroupMembers || []).map(member => member.contact_id)
      );

      for (const contact of contacts) {
        const existingId = existingPhoneNumbers.get(contact.phone_number);
        
        if (existingId) {
          // Only add to group if not already a member
          if (!existingGroupMembers.has(existingId)) {
            groupMembers.push({
              group_id: selectedGroup,
              contact_id: existingId
            });
          }
        } else {
          // Create new contact with proper encoding
          const { data: insertedContact, error: insertError } = await supabase
            .from('contacts')
            .insert([{
              ...contact,
              name: contact.name,
              name_ar: contact.name_ar || null,
              phone_number: contact.phone_number,
              user_id: userId
            }])
            .select('id')
            .single();

          if (insertError) {
            console.error('Failed to insert contact:', insertError);
            continue;
          }

          if (insertedContact) {
            newContacts.push(contact);
            groupMembers.push({
              group_id: selectedGroup,
              contact_id: insertedContact.id
            });
          }
        }
      }

      // Add new members to the group
      if (groupMembers.length > 0) {
        const { error: memberError } = await supabase
          .from('group_members')
          .insert(groupMembers)
          .select();

        if (memberError) {
          console.error('Failed to add contacts to group:', memberError);
          toast.error('Failed to add some contacts to the group');
          return;
        }
      }

      const totalImported = groupMembers.length;
      const newlyCreated = newContacts.length;
      const existingAdded = totalImported - newlyCreated;
      const skippedCount = contacts.length - totalImported;

      if (skippedCount > 0) {
        toast.success(
          `Added ${totalImported} contacts to the group (${newlyCreated} new, ${existingAdded} existing). ${skippedCount} contacts were already in the group.`
        );
      } else {
        toast.success(
          `Successfully added ${totalImported} contacts to the group (${newlyCreated} new, ${existingAdded} existing)`
        );
      }
      
      setProgress(100);
      queryClient.invalidateQueries({ queryKey: ['groups-with-counts'] });
      
      // Clear input states after successful import
      setPhoneNumbers('');
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error(error instanceof Error ? error.message : 'An unexpected error occurred');
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      setIsLoading(true);
      setFile(file);

      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target?.result as string;
        await handleFileContent(content);
      };

      reader.onerror = () => {
        toast.error(t('contacts.import.error.fileRead'));
      };

      // Explicitly set UTF-8 encoding for the FileReader
      reader.readAsText(file, 'UTF-8');
    } catch (error) {
      console.error('File upload error:', error);
      toast.error(t('contacts.import.error.general'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleTextAreaImport = async () => {
    try {
      if (!phoneNumbers.trim()) {
        toast.error('Please enter phone numbers to import');
        return;
      }

      setIsLoading(true);
      await handleFileContent(phoneNumbers);
    } catch (error) {
      console.error('Text area import error:', error);
      toast.error(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadTemplate = () => {
    // Add BOM for UTF-8 encoding
    const bom = '\uFEFF';
    const template = `${bom}English Name,Arabic Name,Phone Number\nJohn Doe,جون دو,+1234567890\nJane Smith,جين سميث,+1234567891`;
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contacts_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {t('contacts.import.title')}
        </h2>
      </div>

      <div className="space-y-8">
        {/* Manual Import Section */}
        <div>
          <h3 className="text-base font-semibold leading-6 text-gray-900">
            {t('contacts.import.manual.title')}
          </h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>{t('contacts.import.manual.description')}</p>
            <p className="mt-2">{t('contacts.import.format.description')}</p>
          </div>
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="relative">
                <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                  {t('contacts.import.manual.country')}
                </label>
                <select
                  id="country"
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm max-h-[200px] overflow-y-auto"
                >
                  {countryCodes.map((country) => (
                    <option
                      key={country.code}
                      value={country.dialCode}
                      className="py-1 px-2 hover:bg-indigo-50"
                    >
                      {country.name} (+{country.dialCode})
                    </option>
                  ))}
                </select>
              </div>
              <div className="relative" ref={groupDropdownRef}>
                <label htmlFor="group" className="block text-sm font-medium text-gray-700">
                  {t('contacts.import.manual.group')}
                </label>
                <button
                  type="button"
                  onClick={() => setIsGroupDropdownOpen(!isGroupDropdownOpen)}
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-left shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                >
                  {selectedGroup ? groups?.find(g => g.id === selectedGroup)?.name : t('contacts.import.manual.noGroup')}
                </button>
                {isGroupDropdownOpen && (
                  <div className="absolute z-10 mt-1 w-full rounded-md bg-white shadow-lg max-h-60 overflow-y-auto">
                    <ul className="py-1">
                      <li>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedGroup('');
                            setIsGroupDropdownOpen(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-indigo-50"
                        >
                          {t('contacts.import.manual.noGroup')}
                        </button>
                      </li>
                      {groups?.map((group) => (
                        <li key={group.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedGroup(group.id);
                              setIsGroupDropdownOpen(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-indigo-50"
                          >
                            {group.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="phoneNumbers" className="block text-sm font-medium text-gray-700">
                {t('contacts.import.manual.numbers')}
              </label>
              <textarea
                id="phoneNumbers"
                rows={10}
                value={phoneNumbers}
                onChange={(e) => setPhoneNumbers(e.target.value)}
                placeholder="John Doe,جون دو,+1234567890"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-mono whitespace-pre overflow-x-auto"
                style={{
                  minHeight: '200px',
                  maxHeight: '400px',
                  padding: '8px 12px',
                  margin: '2px'
                }}
                dir="auto"
              />
              <p className="mt-1 text-sm text-gray-500">
                {t('contacts.import.manual.format')}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {t('contacts.import.manual.count', { count: phoneNumbers.split('\n').filter(num => num.trim()).length })}
              </p>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleTextAreaImport}
                disabled={isLoading || !phoneNumbers.trim()}
                className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
              >
                {isLoading ? t('contacts.import.upload.importing') : t('contacts.import.upload.import')}
              </button>
            </div>
          </div>
        </div>

        {/* CSV Import Section */}
        <div>
          <h3 className="text-base font-semibold leading-6 text-gray-900">
            {t('contacts.import.template.title')}
          </h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>{t('contacts.import.template.format')}</p>
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

        <div>
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
                  accept=".csv,.txt"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileUpload(file);
                    }
                  }}
                  ref={fileInputRef}
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
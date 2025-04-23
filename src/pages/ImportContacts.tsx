import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Upload, Download, CheckCircle, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTranslation } from '../contexts/TranslationContext';
import { countryCodes } from '../config/countryCodes';
import toast from 'react-hot-toast';

interface ImportedContact {
  name: string;
  phone_number: string;
  user_id?: string;
}

interface Contact {
  name: string;
  phone_number: string;
}

export default function ImportContacts() {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedCountry, setSelectedCountry] = useState<string>('46'); // Default to Sweden
  const [phoneNumbers, setPhoneNumbers] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>(() => {
    // Try to get previously selected group from localStorage
    const savedGroup = localStorage.getItem('lastSelectedGroup');
    return savedGroup || '';
  });
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', description: '' });
  const [newGroupName, setNewGroupName] = useState<string>('');
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);
  const groupDropdownRef = useRef<HTMLDivElement>(null);
  const [importedContacts, setImportedContacts] = useState<ImportedContact[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 1. Get current user ID
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

  // Debug database connection
  useEffect(() => {
    const debugTables = async () => {
      console.log("Checking database tables...");

      // Check groups table
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('*')
        .limit(1);

      console.log("Groups table:", { data: groupsData, error: groupsError });

      // Check contacts table
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .limit(1);

      console.log("Contacts table:", { data: contactsData, error: contactsError });
    };

    debugTables();
  }, []);

  const { data: groups, refetch: refetchGroups } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups') // Use consistent table name
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

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
      toast.error("You must be logged in to create groups");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('groups')
        .insert([{
          ...newGroup,
          user_id: userId
        }])
        .select('id') // Get the ID of the newly created group
        .single();

      if (error) throw error;

      // Select the newly created group
      if (data?.id) {
        selectGroup(data.id); // Use our new function
      }

      setNewGroup({ name: '', description: '' });
      setIsAddingGroup(false);
      refetchGroups();
      toast.success(t('contacts.groups.success.added'));
    } catch (error) {
      console.error('Error adding group:', error);
      toast.error(t('contacts.groups.error.add'));
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    try {
      setIsLoading(true);
      setFile(file); // Store the file reference

      if (!selectedGroup && !newGroupName) {
        toast.error(t('contacts.import.error.noGroup'));
        setIsLoading(false);
        return;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result as string;
        const rows = text.split('\n');

        // Skip header row and filter empty rows
        const contacts = rows.slice(1)
          .filter(row => row.trim().length > 0)
          .map(row => {
            const [name, phone] = row.split(',').map(item => item?.trim() || '');
            // Ensure phone number is properly formatted with country code
            let formattedPhone = phone?.replace(/\s+/g, '');
            if (formattedPhone && !formattedPhone.startsWith('+')) {
              formattedPhone = `+${selectedCountry}${formattedPhone}`;
            }
            return {
              name: name || '',
              phone_number: formattedPhone // Important: match database column name
            };
          })
          .filter(contact => contact.phone_number && contact.phone_number.length > 5);

        if (contacts.length === 0) {
          toast.error(t('contacts.import.error.noValidContacts'));
          setIsLoading(false);
          return;
        }

        // First create new group if needed
        let targetGroupId = selectedGroup;
        if (!targetGroupId && newGroupName && userId) {
          try {
            const { data: newGroupData, error } = await supabase
              .from('groups') // Use consistent table name
              .insert({
                name: newGroupName,
                description: '',
                user_id: userId
              })
              .select('id')
              .single();

            if (error) throw error;

            if (newGroupData) {
              targetGroupId = newGroupData.id;
              // Update selected group and refresh groups
              setSelectedGroup(targetGroupId);
              refetchGroups();
            }
          } catch (err) {
            console.error('Error creating new group:', err);
            toast.error(t('contacts.import.error.groupCreation'));
            setIsLoading(false);
            return;
          }
        }

        if (!targetGroupId) {
          toast.error(t('contacts.import.error.noGroup'));
          setIsLoading(false);
          return;
        }

        if (!userId) {
          toast.error("You must be logged in to import contacts");
          setIsLoading(false);
          return;
        }

        // Prepare contacts for database
        const contactsToInsert = contacts.map(contact => ({
          name: contact.name,
          phone_number: contact.phone_number,
          user_id: userId
        }));

        // Insert contacts into database
        console.log('Inserting', contactsToInsert.length, 'contacts...');
        console.log('Contacts to insert:', contactsToInsert);
        console.log('Target group ID:', targetGroupId);
        console.log('User ID:', userId);

        // Log the first contact as a sample to check the structure
        if (contactsToInsert.length > 0) {
          console.log('Sample contact structure:', contactsToInsert[0]);
        }

        const { data: insertData, error: insertError } = await supabase
          .from('contacts')
          .insert(contactsToInsert)
          .select();

        if (insertError) {
          console.error('Contact insertion failed:', {
            code: insertError.code,
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint,
            error: insertError
          });

          // Check for specific error types
          if (insertError.code === '23505') {
            toast.error('Database Error: Duplicate phone numbers found. Please check for duplicates.');
          } else if (insertError.code === '23503') {
            toast.error('Database Error: Invalid group ID or user ID. Please try selecting a different group.');
          } else if (insertError.code === '42501') {
            toast.error('Database Error: Permission denied. Please check your database permissions.');
          } else {
            toast.error(`Database Error: ${insertError.message}. Please try again.`);
          }
          return;
        }

        console.log('Insert successful:', insertData);
        toast.success(t('contacts.import.success.imported', { count: contacts.length }));
        setImportedContacts(contacts);
        setProgress(100);
      };

      reader.onerror = () => {
        toast.error(t('contacts.import.error.fileRead'));
        setIsLoading(false);
      };

      reader.readAsText(file);
    } catch (error) {
      console.error('CSV upload error:', error);
      toast.error(t('contacts.import.error.general'));
    } finally {
      setIsLoading(false);
    }
  };

  const [importStatus, setImportStatus] = useState<{
    success: number;
    errors: number;
    errorMessages: string[];
  }>({ success: 0, errors: 0, errorMessages: [] });

  const [isImporting, setIsImporting] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);

  const handleTextAreaImport = async () => {
    try {
      if (!phoneNumbers.trim()) {
        toast.error('Please enter phone numbers to import');
        return;
      }

      if (!selectedGroup && !newGroupName) {
        toast.error('Please select a group or create a new one');
        return;
      }

      if (!userId) {
        toast.error('You must be logged in to import contacts');
        return;
      }

      setIsImporting(true);
      setImportStatus({ success: 0, errors: 0, errorMessages: [] });
      console.log('Starting import process...');

      // Process phone numbers from input - this part is fine
      const lines = phoneNumbers.split('\n');
      const contactsToProcess = lines
        .filter(line => line.trim().length > 0)
        .map((line, index) => {
          let name = '';
          let phone = line.trim();

          if (line.includes(',')) {
            [name, phone] = line.split(',').map(item => item?.trim() || '');
          }

          // Format phone number
          const digits = phone.replace(/\D/g, '');
          if (!phone.startsWith('+')) {
            phone = `+${selectedCountry}${digits.startsWith(selectedCountry) ? digits.substring(selectedCountry.length) : digits}`;
          }

          return {
            name: name || `Contact ${index + 1}`,
            phone_number: phone,
            user_id: userId
          };
        });

      // Add type definitions for these arrays

      // Remove duplicates from input
      const uniquePhoneNumbers = new Set<string>();
      const uniqueContacts: ImportedContact[] = [];
      const duplicatesInInput: ImportedContact[] = [];

      contactsToProcess.forEach(contact => {
        if (uniquePhoneNumbers.has(contact.phone_number)) {
          duplicatesInInput.push(contact);
        } else {
          uniquePhoneNumbers.add(contact.phone_number);
          uniqueContacts.push(contact);
        }
      });

      // Get or create group
      let targetGroupId = selectedGroup;
      if (!targetGroupId && newGroupName) {
        const { data: newGroup, error: groupError } = await supabase
          .from('groups')
          .insert({
            name: newGroupName,
            description: '',
            user_id: userId
          })
          .select('id')
          .single();

        if (groupError) {
          console.error('Error creating group:', groupError);
          toast.error('Failed to create new group');
          setIsImporting(false);
          return;
        }
        
        targetGroupId = newGroup.id;
      }

      // FIX 1: Use two-step process to handle contacts properly
      const addedContacts = [];
      const failedContacts = [];

      // Step 1: First try to insert ALL contacts - some will fail with constraint error
      console.log(`Attempting to insert ${uniqueContacts.length} contacts`);
      for (const contact of uniqueContacts) {
        try {
          const { data, error } = await supabase
            .from('contacts')
            .insert(contact)
            .select('id, phone_number')
            .single();

          if (error) {
            if (error.code === '23505') { // Unique constraint error
              console.log(`Contact with phone ${contact.phone_number} already exists - will find ID later`);
              failedContacts.push(contact);
            } else {
              console.error(`Error inserting contact ${contact.phone_number}:`, error);
              failedContacts.push(contact);
            }
          } else if (data) {
            console.log(`Successfully inserted new contact with ID ${data.id}`);
            addedContacts.push({
              id: data.id,
              phone_number: data.phone_number
            });
          }
        } catch (err) {
          console.error(`Error processing contact ${contact.phone_number}:`, err);
          failedContacts.push(contact);
        }
      }

      // Step 2: For failed contacts, look up their IDs in the database
      if (failedContacts.length > 0) {
        console.log(`Looking up IDs for ${failedContacts.length} existing contacts`);
        const phoneNumbers = failedContacts.map(c => c.phone_number);
        
        const { data: existingContacts, error: lookupError } = await supabase
          .from('contacts')
          .select('id, phone_number')
          .in('phone_number', phoneNumbers);
          
        if (lookupError) {
          console.error('Error looking up existing contacts:', lookupError);
        } else if (existingContacts && existingContacts.length > 0) {
          console.log(`Found ${existingContacts.length} existing contacts`);
          
          // Add these to our list of contacts to add to the group
          addedContacts.push(...existingContacts);
        }
      }

      // Step 3: Check which contacts are already in this group
      console.log(`Checking which contacts are already in group ${targetGroupId}`);
      const contactIds = addedContacts.map(c => c.id);
      
      const { data: existingMembers, error: memberCheckError } = await supabase
        .from('group_members')
        .select('contact_id')
        .eq('group_id', targetGroupId)
        .in('contact_id', contactIds);
        
      if (memberCheckError) {
        console.error('Error checking existing group members:', memberCheckError);
      }
      
      // Create set of IDs already in group
      const existingMemberIds = new Set((existingMembers || []).map(m => m.contact_id));
      
      // Filter out contacts already in group
      const contactsToAddToGroup = addedContacts.filter(c => !existingMemberIds.has(c.id));
      const alreadyInGroup = addedContacts.filter(c => existingMemberIds.has(c.id));
      
      console.log(`${contactsToAddToGroup.length} contacts to add to group, ${alreadyInGroup.length} already in group`);

      // Step 4: Add contacts to group
      let addedToGroup = 0;
      if (contactsToAddToGroup.length > 0) {
        const groupMembers = contactsToAddToGroup.map(contact => ({
          contact_id: contact.id,
          group_id: targetGroupId
        }));
        
        const { data: addedMembers, error: addError } = await supabase
          .from('group_members')
          .insert(groupMembers)
          .select();
          
        if (addError) {
          console.error('Error adding contacts to group:', addError);
        } else {
          addedToGroup = addedMembers?.length || 0;
          console.log(`Successfully added ${addedToGroup} contacts to group`);
        }
      }

      // Final status update
      const totalSuccess = addedToGroup;
      const totalDuplicates = duplicatesInInput.length + alreadyInGroup.length;
      
      toast.success(`Import complete: ${totalSuccess} contacts added${totalDuplicates > 0 ? `, ${totalDuplicates} duplicates filtered` : ''}`);
      
      setImportStatus({
        success: totalSuccess,
        errors: totalDuplicates,
        errorMessages: [
          ...duplicatesInInput.map(c => `${c.phone_number} - Duplicate in input`),
          ...alreadyInGroup.map(c => `${c.phone_number} - Already in this group`)
        ]
      });

      // Reset form
      setPhoneNumbers('');
      setCurrentProgress(100);

    } catch (error) {
      console.error('Import process failed:', error);
      toast.error('An unexpected error occurred during import');
    } finally {
      setIsImporting(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Handle form submission based on import method
    if (file) {
      await handleFileUpload(file);
    } else {
      await handleTextAreaImport();
    }
  };

  const handleClear = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setImportedContacts([]);
    setProgress(0);
    setImportStatus({ success: 0, errors: 0, errorMessages: [] });
  };

  // Add this function to check table structure
  const checkContactsTable = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .limit(1);
      
      if (error) {
        console.error('Error checking contacts table:', error);
        return;
      }
      
      if (data && data.length > 0) {
        console.log('Contacts table structure:', Object.keys(data[0]));
      }
    } catch (error) {
      console.error('Error checking contacts table:', error);
    }
  };

  // Add this useEffect to check table structure on component mount
  useEffect(() => {
    checkContactsTable();
  }, []);

  // Add this function to inspect database schema
  const inspectDatabaseSchema = async () => {
    try {
      console.log('Inspecting database schema...');

      // Get all tables using the correct RPC call
      const { data: tables, error: tablesError } = await supabase
        .rpc('get_tables');

      if (tablesError) {
        console.error('Error fetching tables:', tablesError);
        return;
      }

      console.log('Tables in database:', tables);

      // Get columns for each table using the correct RPC call
      for (const table of tables || []) {
        // Make sure we're using the table name string, not the whole object
        const tableName = typeof table === 'object' ? table.name : table;
        
        const { data: columns, error: columnsError } = await supabase
          .rpc('get_columns', { table_name: tableName });

        if (columnsError) {
          console.error(`Error fetching columns for ${tableName}:`, columnsError);
          continue;
        }

        console.log(`Columns in ${tableName}:`, columns);
      }
    } catch (error) {
      console.error('Error inspecting schema:', error);
    }
  };

  // Call it in useEffect
  useEffect(() => {
    inspectDatabaseSchema();
  }, []);

  const selectGroup = (groupId: string) => {
    setSelectedGroup(groupId);
    localStorage.setItem('lastSelectedGroup', groupId);
    setIsGroupDropdownOpen(false);
  };

  // Add this function to fetch user data
  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('No user found');
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('No user data found, creating new user record');
          // Create new user record
          const { error: insertError } = await supabase
            .from('users')
            .insert([{ id: user.id, email: user.email }]);
          
          if (insertError) {
            console.error('Error creating user record:', insertError);
          }
        } else {
          console.error('Error fetching user data:', error);
        }
        return;
      }

      console.log('User data:', data);
    } catch (error) {
      console.error('Error in fetchUserData:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">{t('contacts.import.title')}</h1>

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          {/* Manual Import Section */}
          <div className="mb-8">
            <h3 className="text-base font-semibold leading-6 text-gray-900">
              {t('contacts.import.manual.title')}
            </h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <p>{t('contacts.import.manual.description')}</p>
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
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <label htmlFor="group" className="block text-sm font-medium text-gray-700">
                      {t('contacts.import.manual.group')}
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsAddingGroup(true)}
                      className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-500"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      {t('contacts.groups.add')}
                    </button>
                  </div>
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
                              localStorage.removeItem('lastSelectedGroup'); // Clear saved group
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
                              onClick={() => selectGroup(group.id)}
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

              {isAddingGroup && (
                <form onSubmit={handleAddGroup} className="mt-4 space-y-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <label htmlFor="groupName" className="block text-sm font-medium text-gray-700">
                      {t('contacts.groups.name')}
                    </label>
                    <input
                      type="text"
                      id="groupName"
                      value={newGroup.name}
                      onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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

              <div>
                <label htmlFor="phoneNumbers" className="block text-sm font-medium text-gray-700">
                  {t('contacts.import.manual.numbers')}
                </label>
                <textarea
                  id="phoneNumbers"
                  rows={10}
                  value={phoneNumbers}
                  onChange={(e) => setPhoneNumbers(e.target.value)}
                  placeholder={t('contacts.import.manual.placeholder')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-mono whitespace-pre overflow-x-auto"
                  style={{
                    minHeight: '200px',
                    maxHeight: '400px',
                    padding: '8px 12px',
                    margin: '2px'
                  }}
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
                  disabled={isImporting || !phoneNumbers.trim()}
                  className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
                >
                  {isImporting ? t('contacts.import.upload.importing') : t('contacts.import.upload.import')}
                </button>
              </div>
            </div>
          </div>

          {/* CSV Import Section */}
          <div className="mt-8">
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
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const selectedFile = e.target.files?.[0];
                      if (selectedFile) {
                        handleFileUpload(selectedFile);
                      }
                    }}
                    className="hidden"
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
                  onClick={handleClear}
                  disabled={isLoading}
                  className="mt-4 inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
                >
                  {t('contacts.import.clear')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
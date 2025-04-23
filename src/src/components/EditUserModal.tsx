import { useState, useEffect } from 'react';
import { X, Plus, Trash } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useQuery } from '@tanstack/react-query'; // Fixed import

interface User {
  id: string;
  email: string;
  role: string;
  confirmed: boolean;
  sender_names?: string[];
  gateway_id?: string;
}

interface EditUserModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export default function EditUserModal({ user, isOpen, onClose, onUpdate }: EditUserModalProps) {
  const [role, setRole] = useState(user?.role || '');
  const [isActive, setIsActive] = useState(user?.confirmed || false);
  const [loading, setLoading] = useState(false);
  const [senderNames, setSenderNames] = useState<string[]>([]);
  const [newSenderName, setNewSenderName] = useState('');
  const [selectedGateway, setSelectedGateway] = useState(user?.gateway_id || '');

  const { data: gateways } = useQuery({
    queryKey: ['gateways'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gateways')
        .select('*');
      if (error) throw error;
      return data || [];
    }
  });

  useEffect(() => {
    if (user) {
      setRole(user.role);
      setIsActive(user.confirmed);
      if (user.sender_names) {
        setSenderNames(user.sender_names);
      }
      setSelectedGateway(user.gateway_id || '');
    }
  }, [user]);

  const handleAddSenderName = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent form submission
    if (newSenderName.trim() && senderNames.length < 5) {
      setSenderNames(prev => [...prev, newSenderName.trim()]);
      setNewSenderName('');
    } else if (!newSenderName.trim()) {
      toast.error('Sender name cannot be empty');
    } else if (senderNames.length >= 5) {
      toast.error('Maximum 5 sender names allowed');
    }
  };

  const handleRemoveSenderName = (index: number) => {
    setSenderNames(senderNames.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('users')
        .update({
          role: role,
          confirmed: isActive,
          sender_names: senderNames,
          gateway_id: selectedGateway
        })
        .eq('id', user?.id);

      if (error) throw error;

      toast.success('User updated successfully');
      onUpdate();
      onClose();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onClose} />
        
        <div className="relative w-full max-w-md rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Edit User
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 shadow-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label
                htmlFor="isActive"
                className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
              >
                Active Account
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Sender Names ({senderNames.length}/5)
              </label>
              <div className="space-y-2">
                {senderNames.map((name, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={name}
                      disabled
                      className="block w-full rounded-md border-gray-300 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveSenderName(index)}
                      className="p-1 text-red-500 hover:text-red-700 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash className="h-5 w-5" />
                    </button>
                  </div>
                ))}
                {senderNames.length < 5 && (
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={newSenderName}
                      onChange={(e) => setNewSenderName(e.target.value)}
                      placeholder="Enter sender name"
                      className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddSenderName}
                      disabled={!newSenderName.trim()}
                      className="p-1 text-green-500 hover:text-green-700 rounded-full hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Gateway
              </label>
              <select
                value={selectedGateway}
                onChange={(e) => setSelectedGateway(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="">Select Gateway</option>
                {gateways?.map((gateway) => (
                  <option key={gateway.id} value={gateway.id}>
                    {gateway.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
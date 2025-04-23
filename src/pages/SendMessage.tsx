import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCredits } from '../hooks/useCredits';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { CreditsDebug } from '../components/CreditsDebug';

interface SelectedUser {
  id: string;
  email: string;
  // Add other user properties as needed
}

export default function SendMessage() {
  const { user } = useAuth();
  const { credits, loading: creditsLoading, deductCredits } = useCredits();
  const [message, setMessage] = useState('');
  const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null);
  const [users, setUsers] = useState<SelectedUser[]>([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email')
        .neq('id', user?.id);

      if (error) {
        console.error('Error fetching users:', error);
        toast.error('Failed to load users');
        return;
      }

      setUsers(data || []);
    } catch (err) {
      console.error('Error in fetchUsers:', err);
      toast.error('Failed to load users');
    }
  };

  const handleSendMessage = async () => {
    if (!selectedUser || !message.trim()) {
      toast.error('Please select a user and enter a message');
      return;
    }

    if (credits < 1) {
      toast.error('Insufficient credits to send message');
      return;
    }

    try {
      const { error } = await supabase
        .from('messages')
        .insert([
          {
            sender_id: user?.id,
            receiver_id: selectedUser.id,
            content: message.trim(),
          },
        ]);

      if (error) {
        console.error('Error sending message:', error);
        toast.error('Failed to send message');
        return;
      }

      await deductCredits(1);
      setMessage('');
      toast.success('Message sent successfully');
    } catch (err) {
      console.error('Error in handleSendMessage:', err);
      toast.error('Failed to send message');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="mb-8">
        <CreditsDebug />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-4">Send Message</h1>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Available Credits: {creditsLoading ? 'Loading...' : credits}
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select User
          </label>
          <select
            className="w-full p-2 border rounded"
            value={selectedUser?.id || ''}
            onChange={(e) => {
              const user = users.find(u => u.id === e.target.value);
              setSelectedUser(user || null);
            }}
          >
            <option value="">Select a user</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.email}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Message
          </label>
          <textarea
            className="w-full p-2 border rounded"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message here..."
          />
        </div>

        <button
          className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:opacity-50"
          onClick={handleSendMessage}
          disabled={!selectedUser || !message.trim() || credits < 1 || creditsLoading}
        >
          Send Message
        </button>
      </div>
    </div>
  );
} 
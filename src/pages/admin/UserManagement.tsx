import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Loader2, Plus, X } from 'lucide-react';

interface User {
  id: string;
  email: string;
  role: string;
  gateway_id: string | null;
  credits: number;
  created_at: string | null;
  sender_names: string[];
}

interface Gateway {
  id: string;
  name: string;
}

export default function UserManagement() {
  const { session } = useAuth();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editedCredits, setEditedCredits] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isConfirmingAction, setIsConfirmingAction] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: 'save' | 'delete' | 'credit';
    userId: string;
    data?: any;
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const queryClient = useQueryClient();

  const { data: users, isLoading: isLoadingUsers, error: usersError } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    retry: 1
  });

  const { data: gateways, isLoading: isLoadingGateways, error: gatewaysError } = useQuery({
    queryKey: ['gateways'],
    queryFn: async () => {
        const { data, error } = await supabase
          .from('gateways')
        .select('*');
      
      if (error) throw error;
        return data;
    },
    retry: 1
  });

  const updateUserMutation = useMutation({
    mutationFn: async (user: User) => {
      const { error } = await supabase
        .from('users')
        .update({
          email: user.email,
          role: user.role,
          gateway_id: user.gateway_id,
          credits: parseFloat(editedCredits) || user.credits,
          sender_names: user.sender_names
        })
        .eq('id', user.id);

      if (error) throw error;
      return user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditingUser(null);
      toast.success('User updated successfully', {
        duration: 3000,
        position: 'top-right',
      });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update user: ${error.message}`);
    }
  });

  const handleEdit = (user: User) => {
    setEditingUser(user);
  };

  const handleSave = () => {
    if (!editingUser) return;
    
    // Validate sender names and remove empty ones
    const validSenderNames = editingUser.sender_names.filter(name => name.trim() !== '');
    
    // Validate credits
    const credits = parseFloat(editedCredits);
    if (isNaN(credits) || credits < 0) {
      toast.error('Please enter a valid credit amount');
      return;
    }

    // Make sure we're passing all the data including sender names
    updateUserMutation.mutate({
      ...editingUser,
      sender_names: validSenderNames,
      credits: credits
    });
  };

  const addSenderName = () => {
    if (!editingUser) return;
    if (editingUser.sender_names.length >= 5) {
      toast.error('Maximum 5 sender names allowed');
      return;
    }
    setEditingUser({
      ...editingUser,
      sender_names: [...editingUser.sender_names, '']
    });
  };

  const removeSenderName = (index: number) => {
    if (!editingUser) return;
    setEditingUser({
      ...editingUser,
      sender_names: editingUser.sender_names.filter((_, i) => i !== index)
    });
  };

  const updateSenderName = (index: number, value: string) => {
    if (!editingUser) return;
    const newSenderNames = [...editingUser.sender_names];
    newSenderNames[index] = value;
    setEditingUser({
      ...editingUser,
      sender_names: newSenderNames
    });
  };

  const filteredUsers = users?.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const totalPages = Math.ceil((filteredUsers?.length || 0) / itemsPerPage);
  const paginatedUsers = filteredUsers?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const LoadingSpinner = () => (
    <div className="flex items-center justify-center p-4">
      <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
    </div>
  );

  if (isLoadingUsers || isLoadingGateways) {
  return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  if (usersError || gatewaysError) {
    return (
      <div className="flex items-center justify-center h-screen text-red-500">
        Error loading data. Please try again.
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">User Management</h1>
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center space-x-2">
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Gateway</TableHead>
              <TableHead>Sender Names</TableHead>
              <TableHead>Credits</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedUsers?.map((user: User, index: number) => (
              <TableRow 
                key={user.id}
                className={`
                  ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                  hover:bg-gray-100 transition-colors duration-150
                `}
              >
                {editingUser?.id === user.id ? (
                  <>
                    <TableCell>
                      <Input
                        value={editingUser.email}
                        onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={editingUser.role}
                        onValueChange={(value: string) => setEditingUser({ ...editingUser, role: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={editingUser.gateway_id || ''}
                        onValueChange={(value: string) => setEditingUser({ ...editingUser, gateway_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select gateway" />
                        </SelectTrigger>
                        <SelectContent>
                          {gateways?.map((gateway: Gateway) => (
                            <SelectItem key={gateway.id} value={gateway.id}>
                              {gateway.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-2">
                        {editingUser.sender_names.map((name, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              value={name}
                              onChange={(e) => updateSenderName(index, e.target.value)}
                              placeholder="Sender name"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeSenderName(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        {editingUser.sender_names.length < 5 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={addSenderName}
                            className="w-full"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Sender Name
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={editedCredits}
                        onChange={(e) => setEditedCredits(e.target.value)}
                        className="w-24"
                        min="0"
                        step="1"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            setPendingAction({
                              type: 'save',
                              userId: user.id
                            });
                            setIsConfirmingAction(true);
                          }}
                        >
                          Save
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            setEditingUser(null);
                            setEditedCredits('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell>{gateways?.find(g => g.id === user.gateway_id)?.name || 'None'}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {user.sender_names.map((name, index) => (
                          <div key={index} className="text-sm">{name}</div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{user.credits}</TableCell>
                    <TableCell>
                      <Button 
                        size="sm"
                        onClick={() => {
                          setEditingUser(user);
                          setEditedCredits(user.credits.toString());
                        }}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredUsers?.length || 0)} of {filteredUsers?.length} users
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      </div>
      {isConfirmingAction && pendingAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Confirm Action</h3>
            <p className="mb-4">Are you sure you want to save these changes?</p>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsConfirmingAction(false);
                  setPendingAction(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (pendingAction.type === 'save') {
                    handleSave();
                  }
                  setIsConfirmingAction(false);
                  setPendingAction(null);
                }}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
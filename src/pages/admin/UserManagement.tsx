import { useState, useEffect } from 'react';
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

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  user: User | null;
}

export default function UserManagement() {
  const { session } = useAuth();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    user: null,
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenu.visible) {
        setContextMenu(prev => ({ ...prev, visible: false }));
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [contextMenu.visible]);

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
      const { data, error } = await supabase
        .from('users')
        .update({
          email: user.email,
          role: user.role,
          gateway_id: user.gateway_id,
          sender_names: user.sender_names
        })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditingUser(null);
      toast.success('User updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const handleEdit = (user: User) => {
    setEditingUser(user);
  };

  const handleSave = () => {
    if (!editingUser) return;
    updateUserMutation.mutate(editingUser);
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

  const calculateMenuPosition = (e: React.MouseEvent) => {
    const x = e.clientX;
    const y = e.clientY;
    
    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Menu dimensions (adjust these values based on your actual menu size)
    const menuWidth = 200;
    const menuHeight = 150;
    
    // Calculate positions
    let posX = x;
    let posY = y;
    
    // Check right edge
    if (x + menuWidth > viewportWidth) {
      posX = viewportWidth - menuWidth - 10;
    }
    
    // Check bottom edge
    if (y + menuHeight > viewportHeight) {
      posY = viewportHeight - menuHeight - 10;
    }
    
    return { x: posX, y: posY };
  };

  const handleContextMenu = (e: React.MouseEvent, user: User) => {
    e.preventDefault();
    const { x, y } = calculateMenuPosition(e);
    setContextMenu({
      visible: true,
      x,
      y,
      user,
    });
  };

  const handleAddCredit = (user: User) => {
    // Placeholder function for adding credit
    toast.success(`Credit added to user: ${user.email}`);
  };

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
            {users?.map((user: User) => (
              <TableRow key={user.id} onContextMenu={(e) => handleContextMenu(e, user)}>
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
                    <TableCell>{user.credits}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button onClick={handleSave}>Save</Button>
                        <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
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
                      <Button onClick={() => handleEdit(user)}>Edit</Button>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {contextMenu.visible && (
        <div
          className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200"
          style={{
            top: contextMenu.y,
            left: contextMenu.x,
            width: 'auto',
            minWidth: '200px',
            maxWidth: '250px'
          }}
        >
          <div className="py-1">
            {/* Menu items */}
            <button
              onClick={() => handleEdit(contextMenu.user!)}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Edit User
            </button>
            <button
              onClick={() => handleAddCredit(contextMenu.user!)}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Add Credit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
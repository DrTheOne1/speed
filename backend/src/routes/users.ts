import { Router } from 'express';
import { supabase } from '../server';

const router = Router();

// Get all users
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*');

    if (error) throw error;

    // Fetch metadata for each user
    const usersWithMetadata = await Promise.all(
      data.map(async (user) => {
        const { data: { user: authUser } } = await supabase.auth.admin.getUserById(user.id);
        return {
          ...user,
          sender_names: authUser?.user_metadata?.sender_names || []
        };
      })
    );

    res.json(usersWithMetadata);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, role, gateway_id, sender_names } = req.body;

    // Update user metadata if sender_names is provided
    if (sender_names !== undefined) {
      const { error: metadataError } = await supabase.auth.admin.updateUserById(
        id,
        { user_metadata: { sender_names } }
      );
      if (metadataError) throw metadataError;
    }

    // Update other fields in the users table
    const updateData: any = { email, role };
    if (gateway_id !== undefined) {
      updateData.gateway_id = gateway_id;
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Return updated user with metadata
    const { data: { user: authUser } } = await supabase.auth.admin.getUserById(id);
    res.json({
      ...data,
      sender_names: authUser?.user_metadata?.sender_names || []
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Update user credits
router.patch('/:id/credits', async (req, res) => {
  try {
    const { id } = req.params;
    const { credits } = req.body;

    const { data, error } = await supabase
      .from('users')
      .update({ credits })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update credits' });
  }
});

export default router; 
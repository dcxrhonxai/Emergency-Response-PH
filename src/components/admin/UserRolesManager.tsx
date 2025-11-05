import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Trash2, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  profiles?: {
    full_name: string | null;
  } | null;
}

const UserRolesManager = () => {
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [addingAdmin, setAddingAdmin] = useState(false);

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load user roles');
      console.error(error);
      setLoading(false);
      return;
    }

    // Fetch profiles separately for each role
    const rolesWithProfiles = await Promise.all(
      (data || []).map(async (role) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', role.user_id)
          .maybeSingle();

        return {
          ...role,
          profiles: profile,
        };
      })
    );

    setRoles(rolesWithProfiles as UserRole[]);
    setLoading(false);
  };

  const handleAddAdmin = async () => {
    if (!newUserEmail.trim()) {
      toast.error('Please enter a user email');
      return;
    }

    setAddingAdmin(true);
    try {
      // First, find the user by email
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', newUserEmail)
        .maybeSingle();

      if (userError || !userData) {
        toast.error('User not found. Please check the email address.');
        setAddingAdmin(false);
        return;
      }

      // Add admin role
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userData.id,
          role: 'admin'
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('User is already an admin');
        } else {
          toast.error('Failed to add admin role');
          console.error(error);
        }
      } else {
        toast.success('Admin role added successfully');
        setNewUserEmail('');
        loadRoles();
      }
    } catch (error) {
      console.error('Error adding admin:', error);
      toast.error('An error occurred');
    } finally {
      setAddingAdmin(false);
    }
  };

  const handleRemoveRole = async (roleId: string) => {
    if (!confirm('Are you sure you want to remove this admin role?')) return;

    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('id', roleId);

    if (error) {
      toast.error('Failed to remove role');
      console.error(error);
    } else {
      toast.success('Role removed successfully');
      loadRoles();
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading user roles...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">User Roles Management</h2>
          <p className="text-sm text-muted-foreground">Manage administrator access</p>
        </div>

        {/* Add Admin Form */}
        <Card className="p-4 mb-6 bg-muted/50">
          <div className="flex gap-4">
            <div className="flex-1 space-y-2">
              <Label>User ID</Label>
              <Input
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="Enter user UUID"
                type="text"
              />
              <p className="text-xs text-muted-foreground">
                You can find the user ID in the profiles table
              </p>
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleAddAdmin}
                disabled={addingAdmin}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                {addingAdmin ? 'Adding...' : 'Add Admin'}
              </Button>
            </div>
          </div>
        </Card>

        {/* Roles List */}
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Current Administrators
          </h3>
          {roles.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No admin users found</p>
          ) : (
            roles.map((role) => (
              <Card key={role.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium">
                        {role.profiles?.full_name || 'Unknown User'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        User ID: {role.user_id.slice(0, 8)}...
                      </p>
                    </div>
                    <Badge variant="secondary">{role.role}</Badge>
                  </div>
                  <Button
                    onClick={() => handleRemoveRole(role.id)}
                    variant="destructive"
                    size="sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};

export default UserRolesManager;

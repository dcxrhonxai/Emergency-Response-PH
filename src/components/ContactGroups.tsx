import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
} from "@/components/ui/dialog";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit, 
  UserPlus,
  AlertTriangle,
  Heart,
  Flame,
  Shield,
  Phone
} from "lucide-react";
import { toast } from "sonner";

interface ContactGroup {
  id: string;
  name: string;
  description: string | null;
  emergency_types: string[];
  color: string;
  created_at: string;
}

interface PersonalContact {
  id: string;
  name: string;
  phone: string;
  relationship: string | null;
}

interface GroupMember {
  id: string;
  contact_id: string;
  contact: PersonalContact;
}

interface ContactGroupsProps {
  userId: string;
}

const EMERGENCY_TYPES = [
  { value: 'police', label: 'Police', icon: Shield },
  { value: 'medical', label: 'Medical', icon: Heart },
  { value: 'fire', label: 'Fire', icon: Flame },
  { value: 'disaster', label: 'Disaster', icon: AlertTriangle },
  { value: 'sos', label: 'General SOS', icon: Phone },
];

const COLOR_OPTIONS = [
  '#3b82f6', // Blue
  '#ef4444', // Red
  '#22c55e', // Green
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
];

export function ContactGroups({ userId }: ContactGroupsProps) {
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [contacts, setContacts] = useState<PersonalContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ContactGroup | null>(null);
  const [managingGroup, setManagingGroup] = useState<ContactGroup | null>(null);
  const [groupMembers, setGroupMembers] = useState<string[]>([]);
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    setLoading(true);
    
    // Load groups and contacts in parallel
    const [groupsResult, contactsResult] = await Promise.all([
      supabase
        .from('contact_groups')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      supabase
        .from('personal_contacts')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true })
    ]);

    if (groupsResult.error) {
      toast.error("Failed to load contact groups");
    } else {
      setGroups((groupsResult.data || []) as ContactGroup[]);
    }

    if (contactsResult.error) {
      toast.error("Failed to load contacts");
    } else {
      setContacts(contactsResult.data || []);
    }

    setLoading(false);
  };

  const loadGroupMembers = async (groupId: string) => {
    const { data, error } = await supabase
      .from('contact_group_members')
      .select('contact_id')
      .eq('group_id', groupId);

    if (!error && data) {
      setGroupMembers(data.map(m => m.contact_id));
    }
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setSelectedTypes([]);
    setSelectedColor(COLOR_OPTIONS[0]);
    setEditingGroup(null);
  };

  const handleCreateGroup = async () => {
    if (!name.trim()) {
      toast.error("Group name is required");
      return;
    }

    const { error } = await supabase
      .from('contact_groups')
      .insert({
        user_id: userId,
        name: name.trim(),
        description: description.trim() || null,
        emergency_types: selectedTypes,
        color: selectedColor,
      });

    if (error) {
      toast.error("Failed to create group");
    } else {
      toast.success("Contact group created!");
      setShowCreateDialog(false);
      resetForm();
      loadData();
    }
  };

  const handleUpdateGroup = async () => {
    if (!editingGroup || !name.trim()) return;

    const { error } = await supabase
      .from('contact_groups')
      .update({
        name: name.trim(),
        description: description.trim() || null,
        emergency_types: selectedTypes,
        color: selectedColor,
      })
      .eq('id', editingGroup.id);

    if (error) {
      toast.error("Failed to update group");
    } else {
      toast.success("Contact group updated!");
      setEditingGroup(null);
      resetForm();
      loadData();
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    const { error } = await supabase
      .from('contact_groups')
      .delete()
      .eq('id', groupId);

    if (error) {
      toast.error("Failed to delete group");
    } else {
      toast.success("Contact group deleted");
      loadData();
    }
  };

  const handleToggleMember = async (contactId: string) => {
    if (!managingGroup) return;

    const isMember = groupMembers.includes(contactId);

    if (isMember) {
      // Remove member
      const { error } = await supabase
        .from('contact_group_members')
        .delete()
        .eq('group_id', managingGroup.id)
        .eq('contact_id', contactId);

      if (!error) {
        setGroupMembers(prev => prev.filter(id => id !== contactId));
        toast.success("Contact removed from group");
      }
    } else {
      // Add member
      const { error } = await supabase
        .from('contact_group_members')
        .insert({
          group_id: managingGroup.id,
          contact_id: contactId,
        });

      if (!error) {
        setGroupMembers(prev => [...prev, contactId]);
        toast.success("Contact added to group");
      }
    }
  };

  const openEditDialog = (group: ContactGroup) => {
    setEditingGroup(group);
    setName(group.name);
    setDescription(group.description || "");
    setSelectedTypes(group.emergency_types || []);
    setSelectedColor(group.color);
  };

  const openManageDialog = async (group: ContactGroup) => {
    setManagingGroup(group);
    await loadGroupMembers(group.id);
  };

  const toggleEmergencyType = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  if (loading) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground" role="status" aria-live="polite">
        Loading contact groups...
      </div>
    );
  }

  return (
    <div className="space-y-4" role="region" aria-label="Contact Groups Management">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Contact Groups</h2>
          <p className="text-xs text-muted-foreground">
            Organize contacts for different emergencies
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button size="sm" aria-label="Create new contact group">
              <Plus className="w-4 h-4 mr-1" aria-hidden="true" />
              New Group
            </Button>
          </DialogTrigger>
          <DialogContent aria-describedby="create-group-description">
            <DialogHeader>
              <DialogTitle>Create Contact Group</DialogTitle>
              <DialogDescription id="create-group-description">
                Create a group to quickly alert multiple contacts during specific emergencies.
              </DialogDescription>
            </DialogHeader>
            <GroupForm
              name={name}
              setName={setName}
              description={description}
              setDescription={setDescription}
              selectedTypes={selectedTypes}
              toggleEmergencyType={toggleEmergencyType}
              selectedColor={selectedColor}
              setSelectedColor={setSelectedColor}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateGroup}>Create Group</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Groups List */}
      {groups.length === 0 ? (
        <Card className="p-6 text-center">
          <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" aria-hidden="true" />
          <p className="text-sm text-muted-foreground mb-3">
            No contact groups yet. Create groups to quickly alert multiple people during emergencies.
          </p>
          <Button onClick={() => setShowCreateDialog(true)} size="sm">
            <Plus className="w-4 h-4 mr-1" aria-hidden="true" />
            Create First Group
          </Button>
        </Card>
      ) : (
        <ul className="space-y-3" role="list" aria-label="Contact groups">
          {groups.map((group) => (
            <li key={group.id}>
              <Card className="overflow-hidden">
                <div 
                  className="h-2" 
                  style={{ backgroundColor: group.color }}
                  aria-hidden="true"
                />
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground">{group.name}</h3>
                      {group.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {group.description}
                        </p>
                      )}
                      {group.emergency_types && group.emergency_types.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2" role="list" aria-label="Emergency types">
                          {group.emergency_types.map(type => {
                            const typeInfo = EMERGENCY_TYPES.find(t => t.value === type);
                            return (
                              <Badge key={type} variant="secondary" className="text-xs">
                                {typeInfo?.label || type}
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openManageDialog(group)}
                        aria-label={`Manage members in ${group.name}`}
                      >
                        <UserPlus className="w-4 h-4" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(group)}
                        aria-label={`Edit ${group.name}`}
                      >
                        <Edit className="w-4 h-4" aria-hidden="true" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8"
                            aria-label={`Delete ${group.name}`}
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Group?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete "{group.name}" and remove all member associations.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteGroup(group.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingGroup} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent aria-describedby="edit-group-description">
          <DialogHeader>
            <DialogTitle>Edit Contact Group</DialogTitle>
            <DialogDescription id="edit-group-description">
              Update group settings and emergency type associations.
            </DialogDescription>
          </DialogHeader>
          <GroupForm
            name={name}
            setName={setName}
            description={description}
            setDescription={setDescription}
            selectedTypes={selectedTypes}
            toggleEmergencyType={toggleEmergencyType}
            selectedColor={selectedColor}
            setSelectedColor={setSelectedColor}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => resetForm()}>
              Cancel
            </Button>
            <Button onClick={handleUpdateGroup}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Members Dialog */}
      <Dialog open={!!managingGroup} onOpenChange={(open) => !open && setManagingGroup(null)}>
        <DialogContent aria-describedby="manage-members-description">
          <DialogHeader>
            <DialogTitle>Manage Group Members</DialogTitle>
            <DialogDescription id="manage-members-description">
              Add or remove contacts from "{managingGroup?.name}".
            </DialogDescription>
          </DialogHeader>
          
          {contacts.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <p className="text-sm">No contacts available.</p>
              <p className="text-xs mt-1">Add personal contacts first to add them to groups.</p>
            </div>
          ) : (
            <div className="max-h-[300px] overflow-y-auto space-y-2" role="list" aria-label="Available contacts">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                  onClick={() => handleToggleMember(contact.id)}
                  role="listitem"
                >
                  <Checkbox
                    checked={groupMembers.includes(contact.id)}
                    onCheckedChange={() => handleToggleMember(contact.id)}
                    aria-label={`${groupMembers.includes(contact.id) ? 'Remove' : 'Add'} ${contact.name} ${groupMembers.includes(contact.id) ? 'from' : 'to'} group`}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{contact.name}</p>
                    <p className="text-xs text-muted-foreground">{contact.phone}</p>
                  </div>
                  {contact.relationship && (
                    <Badge variant="outline" className="text-xs">
                      {contact.relationship}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setManagingGroup(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Separate form component for reusability
function GroupForm({
  name,
  setName,
  description,
  setDescription,
  selectedTypes,
  toggleEmergencyType,
  selectedColor,
  setSelectedColor,
}: {
  name: string;
  setName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  selectedTypes: string[];
  toggleEmergencyType: (type: string) => void;
  selectedColor: string;
  setSelectedColor: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="group-name">Group Name *</Label>
        <Input
          id="group-name"
          placeholder="e.g., Family, Work, Medical Team"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-required="true"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="group-description">Description</Label>
        <Input
          id="group-description"
          placeholder="Optional description..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label id="emergency-types-label">Alert for Emergency Types</Label>
        <div 
          className="flex flex-wrap gap-2"
          role="group"
          aria-labelledby="emergency-types-label"
        >
          {EMERGENCY_TYPES.map((type) => {
            const Icon = type.icon;
            const isSelected = selectedTypes.includes(type.value);
            return (
              <Button
                key={type.value}
                type="button"
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => toggleEmergencyType(type.value)}
                aria-pressed={isSelected}
                aria-label={`${type.label} emergency type ${isSelected ? 'selected' : 'not selected'}`}
              >
                <Icon className="w-4 h-4 mr-1" aria-hidden="true" />
                {type.label}
              </Button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          This group will be suggested when these emergency types are triggered.
        </p>
      </div>

      <div className="space-y-2">
        <Label id="group-color-label">Group Color</Label>
        <div 
          className="flex gap-2"
          role="radiogroup"
          aria-labelledby="group-color-label"
        >
          {COLOR_OPTIONS.map((color) => (
            <button
              key={color}
              type="button"
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                selectedColor === color ? 'border-foreground scale-110' : 'border-transparent'
              }`}
              style={{ backgroundColor: color }}
              onClick={() => setSelectedColor(color)}
              aria-label={`Select ${color} color`}
              aria-checked={selectedColor === color}
              role="radio"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default ContactGroups;

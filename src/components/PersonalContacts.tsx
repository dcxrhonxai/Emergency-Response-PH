import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Phone, Trash2, Plus, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { personalContactSchema } from "@/lib/validation";
import { usePhoneCaller } from "@/hooks/usePhoneCaller";

interface PersonalContact {
  id: string;
  name: string;
  phone: string;
  relationship: string | null;
}

interface PersonalContactsProps {
  userId: string;
}

const PersonalContacts = ({ userId }: PersonalContactsProps) => {
  const [contacts, setContacts] = useState<PersonalContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState("");

  useEffect(() => {
    loadContacts();
  }, [userId]);

  const loadContacts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('personal_contacts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error("Failed to load contacts");
    } else {
      setContacts(data || []);
    }
    setLoading(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input using Zod schema
    const result = personalContactSchema.safeParse({
      name,
      phone,
      relationship,
    });

    if (!result.success) {
      const firstError = result.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    const { error } = await supabase
      .from('personal_contacts')
      .insert({
        user_id: userId,
        name: result.data.name,
        phone: result.data.phone,
        relationship: result.data.relationship || null,
      });

    if (error) {
      toast.error("Failed to add contact");
    } else {
      toast.success("Contact added!");
      setName("");
      setPhone("");
      setRelationship("");
      setShowForm(false);
      loadContacts();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('personal_contacts')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error("Failed to delete contact");
    } else {
      toast.success("Contact deleted");
      loadContacts();
    }
  };

  const handleDeleteAll = async () => {
    const { error } = await supabase
      .from('personal_contacts')
      .delete()
      .eq('user_id', userId);

    if (error) {
      toast.error("Failed to delete all contacts");
    } else {
      setContacts([]);
      toast.success("All contacts deleted");
    }
  };

  const { makeCall, sendSMS } = usePhoneCaller();

  const handleCall = (phone: string, name: string) => {
    makeCall(phone, name);
  };

  const handleMessage = (phone: string, name: string) => {
    sendSMS(phone);
  };

  if (loading) {
    return (
      <div className="text-center py-4 text-xs text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Emergency Contacts</h2>
          <p className="text-xs text-muted-foreground">
            Quick access to family & friends
          </p>
        </div>
        <div className="flex gap-1">
          {contacts.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="h-7 text-xs">
                  <Trash2 className="w-3 h-3 mr-1" />
                  <span className="hidden sm:inline">Delete All</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete All Contacts?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all your emergency contacts. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button onClick={() => setShowForm(!showForm)} size="sm" className="h-7 text-xs">
            <Plus className="w-3 h-3 mr-1" />
            <span className="hidden sm:inline">Add</span>
          </Button>
        </div>
      </div>

      {/* Add Form */}
      {showForm && (
        <Card className="p-3">
          <form onSubmit={handleAdd} className="space-y-2">
            <div className="space-y-1">
              <Label htmlFor="name" className="text-xs">Name *</Label>
              <Input
                id="name"
                placeholder="Juan Dela Cruz"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone" className="text-xs">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+63 912 345 6789"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="relationship" className="text-xs">Relationship</Label>
              <Input
                id="relationship"
                placeholder="e.g., Family, Friend"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="flex-1 h-9 text-sm">Add</Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowForm(false)}
                className="h-9 text-sm"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Contacts List */}
      {contacts.length === 0 ? (
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground mb-2">
            No contacts added yet
          </p>
          <Button onClick={() => setShowForm(true)} size="sm" className="h-7 text-xs">
            <Plus className="w-3 h-3 mr-1" />
            Add First Contact
          </Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {contacts.map((contact) => (
            <Card key={contact.id} className="p-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground mb-0.5">{contact.name}</h3>
                  {contact.relationship && (
                    <p className="text-xs text-muted-foreground mb-1">
                      {contact.relationship}
                    </p>
                  )}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="w-3 h-3" />
                    <span className="font-mono truncate">{contact.phone}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <Button
                    onClick={() => handleCall(contact.phone, contact.name)}
                    size="sm"
                    className="h-7 px-2 text-xs min-w-16"
                  >
                    <Phone className="w-3 h-3 mr-1" />
                    Call
                  </Button>
                  <Button
                    onClick={() => handleMessage(contact.phone, contact.name)}
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs min-w-16"
                  >
                    <MessageSquare className="w-3 h-3 mr-1" />
                    Text
                  </Button>
                  <Button
                    onClick={() => handleDelete(contact.id)}
                    size="sm"
                    variant="destructive"
                    className="h-7 px-2 text-xs min-w-16"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Del
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PersonalContacts;

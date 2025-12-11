import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ContactGroup {
  id: string;
  name: string;
  description: string | null;
  emergency_types: string[];
  color: string;
}

interface GroupContact {
  id: string;
  name: string;
  phone: string;
  relationship: string | null;
}

interface GroupWithContacts extends ContactGroup {
  contacts: GroupContact[];
}

export function useContactGroups(userId: string | null) {
  const [groups, setGroups] = useState<GroupWithContacts[]>([]);
  const [loading, setLoading] = useState(false);

  const loadGroups = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    
    try {
      // Load groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('contact_groups')
        .select('*')
        .eq('user_id', userId);

      if (groupsError) throw groupsError;

      // Load all group members with contact details
      const groupsWithContacts: GroupWithContacts[] = [];

      for (const group of (groupsData || [])) {
        const { data: membersData } = await supabase
          .from('contact_group_members')
          .select('contact_id')
          .eq('group_id', group.id);

        const contactIds = (membersData || []).map(m => m.contact_id);
        
        let contacts: GroupContact[] = [];
        if (contactIds.length > 0) {
          const { data: contactsData } = await supabase
            .from('personal_contacts')
            .select('id, name, phone, relationship')
            .in('id', contactIds);
          
          contacts = contactsData || [];
        }

        groupsWithContacts.push({
          ...group as ContactGroup,
          contacts,
        });
      }

      setGroups(groupsWithContacts);
    } catch (error) {
      console.error('Error loading contact groups:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const getGroupsForEmergencyType = useCallback((emergencyType: string): GroupWithContacts[] => {
    return groups.filter(group => 
      group.emergency_types.length === 0 || // No specific types = all emergencies
      group.emergency_types.includes(emergencyType) ||
      group.emergency_types.includes('sos') // SOS groups apply to all
    );
  }, [groups]);

  const getContactsForEmergencyType = useCallback((emergencyType: string): GroupContact[] => {
    const relevantGroups = getGroupsForEmergencyType(emergencyType);
    const contactMap = new Map<string, GroupContact>();
    
    // Deduplicate contacts across groups
    relevantGroups.forEach(group => {
      group.contacts.forEach(contact => {
        contactMap.set(contact.id, contact);
      });
    });

    return Array.from(contactMap.values());
  }, [getGroupsForEmergencyType]);

  const notifyGroupContacts = useCallback(async (
    emergencyType: string,
    alertId: string,
    location: { lat: number; lng: number },
    situation: string
  ) => {
    const contacts = getContactsForEmergencyType(emergencyType);
    
    if (contacts.length === 0) {
      return { notified: 0, contacts: [] };
    }

    // Store notification records
    const notifications = contacts.map(contact => ({
      alert_id: alertId,
      contact_name: contact.name,
      contact_phone: contact.phone,
    }));

    const { error } = await supabase
      .from('alert_notifications')
      .insert(notifications);

    if (error) {
      console.error('Error storing notifications:', error);
    }

    return {
      notified: contacts.length,
      contacts,
    };
  }, [getContactsForEmergencyType]);

  return {
    groups,
    loading,
    loadGroups,
    getGroupsForEmergencyType,
    getContactsForEmergencyType,
    notifyGroupContacts,
  };
}

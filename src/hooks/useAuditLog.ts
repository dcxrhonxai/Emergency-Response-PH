import { supabase } from "@/integrations/supabase/client";

interface AuditLogEntry {
  action: string;
  entityType: string;
  entityId?: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
}

export const useAuditLog = () => {
  const logAction = async ({
    action,
    entityType,
    entityId,
    oldData,
    newData
  }: AuditLogEntry) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn("No user found for audit log");
        return;
      }

      // Use raw fetch for audit_logs since types may not be regenerated yet
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/audit_logs`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            "Prefer": "return=minimal"
          },
          body: JSON.stringify({
            user_id: user.id,
            action,
            entity_type: entityType,
            entity_id: entityId,
            old_data: oldData,
            new_data: newData,
            user_agent: navigator.userAgent
          })
        }
      );

      if (!response.ok) {
        console.error("Failed to create audit log:", await response.text());
      }
    } catch (error) {
      console.error("Error logging action:", error);
    }
  };

  return { logAction };
};

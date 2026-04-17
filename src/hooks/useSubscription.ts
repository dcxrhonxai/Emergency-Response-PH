import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Subscription {
  id: string;
  product_id: string;
  status: string;
  is_premium: boolean;
  expires_at: string | null;
  purchased_at: string;
}

/**
 * Server-validated subscription status. Replaces localStorage-based premium
 * gating. Reads from the `subscriptions` table (RLS: own row only).
 */
export const useSubscription = () => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setSubscription(null);
      setIsPremium(false);
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("subscriptions")
      .select("id, product_id, status, is_premium, expires_at, purchased_at")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (error) {
      console.error("Failed to load subscription:", error);
      setSubscription(null);
      setIsPremium(false);
    } else if (data) {
      const active =
        data.is_premium &&
        data.status === "active" &&
        (!data.expires_at || new Date(data.expires_at) > new Date());
      setSubscription(data);
      setIsPremium(active);
    } else {
      setSubscription(null);
      setIsPremium(false);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });
    return () => sub.subscription.unsubscribe();
  }, [refresh]);

  const validatePurchase = useCallback(
    async (productId: string, purchaseToken: string, platform = "android") => {
      const { data, error } = await supabase.functions.invoke("validate-purchase", {
        body: { productId, purchaseToken, platform },
      });
      if (error) throw error;
      await refresh();
      return data;
    },
    [refresh]
  );

  return { subscription, isPremium, isLoading, refresh, validatePurchase };
};

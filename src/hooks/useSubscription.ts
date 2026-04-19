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

const isActive = (s: Pick<Subscription, "is_premium" | "status" | "expires_at">) =>
  s.is_premium &&
  s.status === "active" &&
  (!s.expires_at || new Date(s.expires_at) > new Date());

/**
 * Server-validated subscription status. Aggregates across multiple subscription
 * rows per user (one per product). User is premium if ANY row is active.
 */
export const useSubscription = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [activeSubscription, setActiveSubscription] = useState<Subscription | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setSubscriptions([]);
      setActiveSubscription(null);
      setIsPremium(false);
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("subscriptions")
      .select("id, product_id, status, is_premium, expires_at, purchased_at")
      .eq("user_id", userData.user.id)
      .order("purchased_at", { ascending: false });

    if (error) {
      console.error("Failed to load subscriptions:", error);
      setSubscriptions([]);
      setActiveSubscription(null);
      setIsPremium(false);
    } else {
      const rows = data ?? [];
      const activeRows = rows.filter(isActive);
      // Prefer lifetime (no expiry), then furthest expiry
      const best =
        activeRows.find((r) => !r.expires_at) ??
        activeRows.sort(
          (a, b) =>
            new Date(b.expires_at!).getTime() - new Date(a.expires_at!).getTime()
        )[0] ??
        null;
      setSubscriptions(rows);
      setActiveSubscription(best);
      setIsPremium(activeRows.length > 0);
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

  return {
    subscription: activeSubscription,
    subscriptions,
    isPremium,
    isLoading,
    refresh,
    validatePurchase,
  };
};

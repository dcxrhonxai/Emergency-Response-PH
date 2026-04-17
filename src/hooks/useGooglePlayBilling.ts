import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';

// Product IDs for premium features
export const PRODUCT_IDS = {
  PREMIUM_MONTHLY: 'premium_monthly',
  PREMIUM_YEARLY: 'premium_yearly',
  PREMIUM_LIFETIME: 'premium_lifetime',
} as const;

interface Product {
  productId: string;
  title: string;
  description: string;
  price: string;
  priceAmount: number;
  currency: string;
  type: 'inapp' | 'subs';
}

interface Purchase {
  productId: string;
  purchaseToken: string;
  purchaseTime: number;
  acknowledged: boolean;
}

export const useGooglePlayBilling = () => {
  const { toast } = useToast();
  const { isPremium, validatePurchase, refresh: refreshSubscription } = useSubscription();
  const [isAvailable, setIsAvailable] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Check if running on Android with Capacitor
  const isAndroid = Capacitor.getPlatform() === 'android';
  const isNativePlatform = Capacitor.isNativePlatform();

  // Initialize billing on mount
  useEffect(() => {
    const initBilling = async () => {
      if (!isAndroid || !isNativePlatform) {
        console.log('Google Play Billing is only available on native Android');
        await loadMockProducts();
        setIsLoading(false);
        return;
      }

      try {
        // For now, simulate billing availability on Android
        // In production, this would use a real billing plugin
        console.log('Initializing Google Play Billing...');
        setIsAvailable(true);
        
        // Load mock products for development
        await loadMockProducts();
        
        // Check for existing purchases
        await checkExistingPurchases();
      } catch (error) {
        console.error('Failed to initialize Google Play Billing:', error);
        setIsAvailable(false);
      } finally {
        setIsLoading(false);
      }
    };

    initBilling();
  }, [isAndroid, isNativePlatform]);

  const loadMockProducts = useCallback(async () => {
    // Mock products for development - in production, query from Google Play
    const mockProducts: Product[] = [
      {
        productId: PRODUCT_IDS.PREMIUM_MONTHLY,
        title: 'Premium Monthly',
        description: 'Access all premium features with monthly billing',
        price: '₱149.00/month',
        priceAmount: 149,
        currency: 'PHP',
        type: 'subs',
      },
      {
        productId: PRODUCT_IDS.PREMIUM_YEARLY,
        title: 'Premium Yearly',
        description: 'Access all premium features - Save 20% with yearly billing',
        price: '₱1,429.00/year',
        priceAmount: 1429,
        currency: 'PHP',
        type: 'subs',
      },
      {
        productId: PRODUCT_IDS.PREMIUM_LIFETIME,
        title: 'Premium Lifetime',
        description: 'One-time purchase for lifetime premium access',
        price: '₱2,999.00',
        priceAmount: 2999,
        currency: 'PHP',
        type: 'inapp',
      },
    ];
    setProducts(mockProducts);
  }, []);

  const checkExistingPurchases = useCallback(async () => {
    // Premium status now comes from the server-validated `subscriptions` table
    // via useSubscription. Just refresh it here.
    await refreshSubscription();
  }, [refreshSubscription]);

  const queryProducts = useCallback(async () => {
    if (!isAndroid || !isNativePlatform) return;
    await loadMockProducts();
  }, [isAndroid, isNativePlatform, loadMockProducts]);

  const queryPurchases = useCallback(async () => {
    if (!isAndroid || !isNativePlatform) return;
    await checkExistingPurchases();
  }, [isAndroid, isNativePlatform, checkExistingPurchases]);

  const purchaseProduct = useCallback(async (productId: string): Promise<boolean> => {
    if (!isAndroid || !isNativePlatform) {
      toast({
        title: 'Purchase Not Available',
        description: 'In-app purchases are only available on Android devices.',
        variant: 'destructive',
      });
      return false;
    }

    if (!isAvailable) {
      toast({
        title: 'Billing Not Available',
        description: 'Google Play Billing is not available. Please try again later.',
        variant: 'destructive',
      });
      return false;
    }

    const product = products.find(p => p.productId === productId);
    if (!product) {
      toast({
        title: 'Product Not Found',
        description: 'The selected product is not available.',
        variant: 'destructive',
      });
      return false;
    }

    try {
      console.log(`Launching billing flow for: ${productId}`);

      // In production, the real Google Play purchase flow returns a token here.
      const purchaseToken = `mock_token_${Date.now()}`;

      // Server-side validation — the edge function writes to the
      // `subscriptions` table which is the source of truth for premium status.
      await validatePurchase(productId, purchaseToken, 'android');

      const newPurchase: Purchase = {
        productId,
        purchaseToken,
        purchaseTime: Date.now(),
        acknowledged: true,
      };
      setPurchases((prev) => [...prev, newPurchase]);

      toast({
        title: 'Purchase Successful',
        description: 'Thank you for upgrading to Premium!',
      });

      return true;
    } catch (error) {
      console.error('Purchase error:', error);
      toast({
        title: 'Purchase Error',
        description: 'Failed to complete the purchase. Please try again.',
        variant: 'destructive',
      });
      return false;
    }
  }, [isAndroid, isNativePlatform, isAvailable, products, validatePurchase, toast]);

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    if (!isAndroid || !isNativePlatform) {
      toast({
        title: 'Restore Not Available',
        description: 'Purchase restoration is only available on Android devices.',
        variant: 'destructive',
      });
      return false;
    }

    try {
      console.log('Restoring purchases...');
      await checkExistingPurchases();
      
      toast({
        title: 'Purchases Restored',
        description: isPremium 
          ? 'Your premium status has been restored!' 
          : 'No previous purchases found.',
      });
      return true;
    } catch (error) {
      console.error('Restore error:', error);
      toast({
        title: 'Restore Failed',
        description: 'Failed to restore purchases. Please try again.',
        variant: 'destructive',
      });
      return false;
    }
  }, [isAndroid, isNativePlatform, checkExistingPurchases, isPremium, toast]);

  return {
    isAvailable,
    isLoading,
    products,
    purchases,
    isPremium,
    isAndroid,
    isNativePlatform,
    purchaseProduct,
    restorePurchases,
    queryProducts,
    queryPurchases,
  };
};

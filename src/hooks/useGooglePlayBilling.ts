import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { useToast } from '@/hooks/use-toast';

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
  const [isAvailable, setIsAvailable] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check if running on Android with Capacitor
  const isAndroid = Capacitor.getPlatform() === 'android';

  // Initialize billing on mount
  useEffect(() => {
    const initBilling = async () => {
      if (!isAndroid) {
        console.log('Google Play Billing is only available on Android');
        setIsLoading(false);
        return;
      }

      try {
        // Dynamic import for Android-only plugin
        const { AndroidBilling } = await import('@nicholasodonnell/capacitor-android-billing');
        
        // Connect to billing service
        const result = await AndroidBilling.connect();
        setIsAvailable(result.connected);

        if (result.connected) {
          // Query available products
          await queryProducts();
          // Query existing purchases
          await queryPurchases();
        }
      } catch (error) {
        console.error('Failed to initialize Google Play Billing:', error);
        setIsAvailable(false);
      } finally {
        setIsLoading(false);
      }
    };

    initBilling();
  }, [isAndroid]);

  const queryProducts = useCallback(async () => {
    if (!isAndroid) return;

    try {
      const { AndroidBilling } = await import('@nicholasodonnell/capacitor-android-billing');
      
      const productIds = Object.values(PRODUCT_IDS);
      
      // Query in-app products
      const inAppResult = await AndroidBilling.queryProductDetails({
        productIds: [PRODUCT_IDS.PREMIUM_LIFETIME],
        productType: 'inapp',
      });

      // Query subscription products
      const subsResult = await AndroidBilling.queryProductDetails({
        productIds: [PRODUCT_IDS.PREMIUM_MONTHLY, PRODUCT_IDS.PREMIUM_YEARLY],
        productType: 'subs',
      });

      const allProducts: Product[] = [
        ...(inAppResult.products || []).map((p: any) => ({
          productId: p.productId,
          title: p.title,
          description: p.description,
          price: p.price,
          priceAmount: p.priceAmountMicros / 1000000,
          currency: p.priceCurrencyCode,
          type: 'inapp' as const,
        })),
        ...(subsResult.products || []).map((p: any) => ({
          productId: p.productId,
          title: p.title,
          description: p.description,
          price: p.price,
          priceAmount: p.priceAmountMicros / 1000000,
          currency: p.priceCurrencyCode,
          type: 'subs' as const,
        })),
      ];

      setProducts(allProducts);
    } catch (error) {
      console.error('Failed to query products:', error);
    }
  }, [isAndroid]);

  const queryPurchases = useCallback(async () => {
    if (!isAndroid) return;

    try {
      const { AndroidBilling } = await import('@nicholasodonnell/capacitor-android-billing');
      
      // Query in-app purchases
      const inAppPurchases = await AndroidBilling.queryPurchases({
        productType: 'inapp',
      });

      // Query subscription purchases
      const subsPurchases = await AndroidBilling.queryPurchases({
        productType: 'subs',
      });

      const allPurchases: Purchase[] = [
        ...(inAppPurchases.purchases || []).map((p: any) => ({
          productId: p.productId,
          purchaseToken: p.purchaseToken,
          purchaseTime: p.purchaseTime,
          acknowledged: p.acknowledged,
        })),
        ...(subsPurchases.purchases || []).map((p: any) => ({
          productId: p.productId,
          purchaseToken: p.purchaseToken,
          purchaseTime: p.purchaseTime,
          acknowledged: p.acknowledged,
        })),
      ];

      setPurchases(allPurchases);

      // Check if user has any premium purchase
      const hasPremium = allPurchases.some(p => 
        Object.values(PRODUCT_IDS).includes(p.productId as any)
      );
      setIsPremium(hasPremium);

      // Store premium status locally
      localStorage.setItem('isPremiumUser', hasPremium.toString());
    } catch (error) {
      console.error('Failed to query purchases:', error);
    }
  }, [isAndroid]);

  const purchaseProduct = useCallback(async (productId: string): Promise<boolean> => {
    if (!isAndroid || !isAvailable) {
      toast({
        title: 'Purchase Not Available',
        description: 'Google Play Billing is only available on Android devices.',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const { AndroidBilling } = await import('@nicholasodonnell/capacitor-android-billing');
      
      const product = products.find(p => p.productId === productId);
      if (!product) {
        toast({
          title: 'Product Not Found',
          description: 'The selected product is not available.',
          variant: 'destructive',
        });
        return false;
      }

      const result = await AndroidBilling.launchBillingFlow({
        productId,
        productType: product.type,
      });

      if (result.responseCode === 0) { // BillingResponseCode.OK
        toast({
          title: 'Purchase Successful',
          description: 'Thank you for upgrading to Premium!',
        });
        
        // Acknowledge the purchase
        if (result.purchaseToken) {
          await AndroidBilling.acknowledgePurchase({
            purchaseToken: result.purchaseToken,
          });
        }

        // Refresh purchases
        await queryPurchases();
        return true;
      } else if (result.responseCode === 1) { // User cancelled
        return false;
      } else {
        toast({
          title: 'Purchase Failed',
          description: `Error code: ${result.responseCode}`,
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      console.error('Purchase error:', error);
      toast({
        title: 'Purchase Error',
        description: 'Failed to complete the purchase. Please try again.',
        variant: 'destructive',
      });
      return false;
    }
  }, [isAndroid, isAvailable, products, queryPurchases, toast]);

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    if (!isAndroid || !isAvailable) {
      return false;
    }

    try {
      await queryPurchases();
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
  }, [isAndroid, isAvailable, queryPurchases, isPremium, toast]);

  // Check local premium status for non-Android platforms
  useEffect(() => {
    if (!isAndroid) {
      const storedPremium = localStorage.getItem('isPremiumUser');
      setIsPremium(storedPremium === 'true');
    }
  }, [isAndroid]);

  return {
    isAvailable,
    isLoading,
    products,
    purchases,
    isPremium,
    purchaseProduct,
    restorePurchases,
    queryProducts,
    queryPurchases,
  };
};

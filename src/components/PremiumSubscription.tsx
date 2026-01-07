import { useTranslation } from 'react-i18next';
import { useGooglePlayBilling, PRODUCT_IDS } from '@/hooks/useGooglePlayBilling';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Crown, 
  Check, 
  Star, 
  Zap, 
  Shield, 
  RefreshCw,
  Smartphone,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';

const PREMIUM_FEATURES = [
  { icon: Shield, label: 'Priority Emergency Response', description: 'Get faster response times during emergencies' },
  { icon: Zap, label: 'Unlimited Alerts', description: 'No limit on emergency alerts per month' },
  { icon: Star, label: 'Advanced Analytics', description: 'Detailed insights on your safety metrics' },
  { icon: Crown, label: 'Premium Support', description: '24/7 priority customer support' },
];

export const PremiumSubscription = () => {
  const { t } = useTranslation();
  const {
    isAvailable,
    isLoading,
    products,
    isPremium,
    isAndroid,
    isNativePlatform,
    purchaseProduct,
    restorePurchases,
  } = useGooglePlayBilling();

  const monthlyProduct = products.find(p => p.productId === PRODUCT_IDS.PREMIUM_MONTHLY);
  const yearlyProduct = products.find(p => p.productId === PRODUCT_IDS.PREMIUM_YEARLY);
  const lifetimeProduct = products.find(p => p.productId === PRODUCT_IDS.PREMIUM_LIFETIME);

  const handlePurchase = async (productId: string) => {
    await purchaseProduct(productId);
  };

  const handleRestore = async () => {
    await restorePurchases();
  };

  if (isPremium) {
    return (
      <Card className="border-primary/50 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
            <Crown className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Premium Active</CardTitle>
          <CardDescription>
            You have full access to all premium features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {PREMIUM_FEATURES.map((feature) => (
              <div key={feature.label} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <feature.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{feature.label}</p>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Premium Benefits */}
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center mb-4">
            <Crown className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Upgrade to Premium</CardTitle>
          <CardDescription>
            Unlock advanced features and priority support
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {PREMIUM_FEATURES.map((feature) => (
              <div key={feature.label} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{feature.label}</p>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Platform Notice */}
      {!isNativePlatform && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Smartphone className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-700 dark:text-yellow-400">
                  Android App Required
                </p>
                <p className="text-sm text-muted-foreground">
                  In-app purchases are only available on the Android app. 
                  Download from Google Play Store to subscribe.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscription Plans */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Monthly Plan */}
        <Card className="relative">
          <CardHeader>
            <CardTitle>Monthly</CardTitle>
            <CardDescription>Billed monthly</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {monthlyProduct?.price || '₱149'}
              <span className="text-sm font-normal text-muted-foreground">/month</span>
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                All premium features
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Cancel anytime
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => handlePurchase(PRODUCT_IDS.PREMIUM_MONTHLY)}
              disabled={isLoading || !isNativePlatform}
            >
              Subscribe
            </Button>
          </CardFooter>
        </Card>

        {/* Yearly Plan - Best Value */}
        <Card className="relative border-primary">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="bg-primary">Best Value</Badge>
          </div>
          <CardHeader>
            <CardTitle>Yearly</CardTitle>
            <CardDescription>Save 20% with annual billing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {yearlyProduct?.price || '₱1,429'}
              <span className="text-sm font-normal text-muted-foreground">/year</span>
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                All premium features
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Save ₱359/year
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Priority support
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full"
              onClick={() => handlePurchase(PRODUCT_IDS.PREMIUM_YEARLY)}
              disabled={isLoading || !isNativePlatform}
            >
              Subscribe & Save
            </Button>
          </CardFooter>
        </Card>

        {/* Lifetime Plan */}
        <Card className="relative">
          <CardHeader>
            <CardTitle>Lifetime</CardTitle>
            <CardDescription>One-time purchase</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {lifetimeProduct?.price || '₱2,999'}
              <span className="text-sm font-normal text-muted-foreground"> once</span>
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                All premium features
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Lifetime access
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                All future updates
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => handlePurchase(PRODUCT_IDS.PREMIUM_LIFETIME)}
              disabled={isLoading || !isNativePlatform}
            >
              Buy Lifetime
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Restore Purchases */}
      <div className="text-center">
        <Button 
          variant="ghost" 
          onClick={handleRestore}
          disabled={isLoading || !isNativePlatform}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
          Restore Purchases
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          Already purchased? Restore your subscription here
        </p>
      </div>
    </div>
  );
};

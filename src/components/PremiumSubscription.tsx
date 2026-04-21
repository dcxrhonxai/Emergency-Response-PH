import { useTranslation } from 'react-i18next';
import { useGooglePlayBilling, PRODUCT_IDS } from '@/hooks/useGooglePlayBilling';
import { useSubscription } from '@/hooks/useSubscription';
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
  AlertTriangle,
  Calendar,
  ExternalLink,
  HelpCircle,
  XCircle,
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const PREMIUM_FEATURES = [
  { icon: Shield, label: 'Priority Emergency Response', description: 'Get faster response times during emergencies' },
  { icon: Zap, label: 'Unlimited Alerts', description: 'No limit on emergency alerts per month' },
  { icon: Star, label: 'Advanced Analytics', description: 'Detailed insights on your safety metrics' },
  { icon: Crown, label: 'Premium Support', description: '24/7 priority customer support' },
];

const PRODUCT_LABELS: Record<string, string> = {
  premium_monthly: 'Monthly',
  premium_yearly: 'Yearly',
  premium_lifetime: 'Lifetime',
};

const STATUS_VARIANTS: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  active: { label: 'Active', variant: 'default' },
  cancelled: { label: 'Cancelled', variant: 'secondary' },
  expired: { label: 'Expired', variant: 'outline' },
  billing_issue: { label: 'Billing Issue', variant: 'destructive' },
  paused: { label: 'Paused', variant: 'secondary' },
};

const formatDate = (iso: string | null) => {
  if (!iso) return 'Never (Lifetime)';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

interface SubscriptionRow {
  id: string;
  product_id: string;
  status: string;
  is_premium: boolean;
  expires_at: string | null;
  purchased_at: string;
}

const SubscriptionHistory = ({ rows }: { rows: SubscriptionRow[] }) => {
  if (rows.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5 text-primary" />
          Your Subscriptions
        </CardTitle>
        <CardDescription>All purchased products and their status</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {rows.map((row) => {
            const status = STATUS_VARIANTS[row.status] ?? { label: row.status, variant: 'outline' as const };
            const label = PRODUCT_LABELS[row.product_id] ?? row.product_id;
            return (
              <div
                key={row.id}
                className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{label}</span>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Purchased {formatDate(row.purchased_at)}
                  </p>
                </div>
                <div className="text-sm text-right">
                  <p className="text-muted-foreground text-xs">Expires</p>
                  <p className="font-medium">{formatDate(row.expires_at)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

const PLAY_PACKAGE_NAME = 'com.dcxrhonx.emergencyresponseph';

const ManageSubscriptionButton = ({ activeProductId }: { activeProductId?: string }) => {
  const url = activeProductId
    ? `https://play.google.com/store/account/subscriptions?sku=${activeProductId}&package=${PLAY_PACKAGE_NAME}`
    : `https://play.google.com/store/account/subscriptions?package=${PLAY_PACKAGE_NAME}`;
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <ExternalLink className="h-4 w-4 mr-2" />
          Manage Subscription on Google Play
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Open Google Play?</AlertDialogTitle>
          <AlertDialogDescription>
            You'll be redirected to the Google Play Store to manage your subscription.
            From there you can change plans, update payment methods, or cancel your
            subscription at any time.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
          >
            Continue to Google Play
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

const CancelSubscriptionGuide = () => {
  const url = `https://play.google.com/store/account/subscriptions?package=${PLAY_PACKAGE_NAME}`;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <HelpCircle className="h-5 w-5 text-primary" />
          How to Cancel Your Subscription
        </CardTitle>
        <CardDescription>
          Step-by-step guide to cancel through Google Play
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="steps" className="border-b-0">
            <AccordionTrigger>View cancellation steps</AccordionTrigger>
            <AccordionContent>
              <ol className="space-y-3 text-sm list-decimal list-inside">
                <li>
                  Open the <span className="font-medium">Google Play Store</span> app on your Android device.
                </li>
                <li>
                  Tap your <span className="font-medium">profile icon</span> in the top-right corner.
                </li>
                <li>
                  Select <span className="font-medium">Payments &amp; subscriptions</span>, then tap <span className="font-medium">Subscriptions</span>.
                </li>
                <li>
                  Find and tap <span className="font-medium">Emergency Response PH</span> in your subscription list.
                </li>
                <li>
                  Tap <span className="font-medium">Cancel subscription</span> and follow the on-screen prompts.
                </li>
                <li>
                  You'll keep premium access until the end of your current billing period.
                </li>
              </ol>
              <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    Lifetime purchases cannot be cancelled — they are one-time payments
                    with permanent access.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-4"
                onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Go to Google Play Subscriptions
              </Button>

              <Button
                variant="secondary"
                size="sm"
                className="w-full mt-3"
                onClick={() => window.open('mailto:support@emergencyresponse.ph?subject=Subscription Help', '_blank')}
              >
                <HelpCircle className="h-4 w-4 mr-2" />
                Contact Support
              </Button>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
};

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
  const { subscriptions } = useSubscription();

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
      <div className="space-y-6">
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
        <SubscriptionHistory rows={subscriptions} />
        <ManageSubscriptionButton activeProductId={subscriptions.find(s => s.status === 'active')?.product_id} />
        <CancelSubscriptionGuide />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SubscriptionHistory rows={subscriptions} />
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

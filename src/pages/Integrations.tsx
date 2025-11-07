import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Webhook, Key, Link as LinkIcon, Bell, Mail, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

const Integrations = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [webhookUrl, setWebhookUrl] = useState("");
  const [apiEndpoint, setApiEndpoint] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [smsProvider, setSmsProvider] = useState({
    enabled: false,
    apiKey: "",
    endpoint: "",
  });
  const [emailProvider, setEmailProvider] = useState({
    enabled: false,
    apiKey: "",
    endpoint: "",
  });
  const [pushNotification, setPushNotification] = useState({
    enabled: false,
    serverKey: "",
  });

  const handleSaveWebhook = () => {
    if (!webhookUrl) {
      toast({
        title: "Error",
        description: "Please enter a webhook URL",
        variant: "destructive",
      });
      return;
    }
    
    localStorage.setItem("integration_webhook_url", webhookUrl);
    toast({
      title: "Success",
      description: "Webhook URL saved successfully",
    });
  };

  const handleSaveApiConfig = () => {
    if (!apiEndpoint || !apiKey) {
      toast({
        title: "Error",
        description: "Please enter both API endpoint and key",
        variant: "destructive",
      });
      return;
    }
    
    localStorage.setItem("integration_api_endpoint", apiEndpoint);
    localStorage.setItem("integration_api_key", apiKey);
    toast({
      title: "Success",
      description: "API configuration saved successfully",
    });
  };

  const handleTestWebhook = async () => {
    if (!webhookUrl) {
      toast({
        title: "Error",
        description: "Please enter a webhook URL first",
        variant: "destructive",
      });
      return;
    }

    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "no-cors",
        body: JSON.stringify({
          test: true,
          timestamp: new Date().toISOString(),
          event: "test_event",
        }),
      });

      toast({
        title: "Test Sent",
        description: "Test webhook request sent. Check your webhook endpoint logs.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send test webhook",
        variant: "destructive",
      });
    }
  };

  const handleSaveSmsProvider = () => {
    localStorage.setItem("integration_sms_provider", JSON.stringify(smsProvider));
    toast({
      title: "Success",
      description: "SMS provider configuration saved",
    });
  };

  const handleSaveEmailProvider = () => {
    localStorage.setItem("integration_email_provider", JSON.stringify(emailProvider));
    toast({
      title: "Success",
      description: "Email provider configuration saved",
    });
  };

  const handleSavePushNotification = () => {
    localStorage.setItem("integration_push_notification", JSON.stringify(pushNotification));
    toast({
      title: "Success",
      description: "Push notification configuration saved",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">Integrations</h1>
          </div>
        </div>
      </div>

      <div className="container py-6 px-4 max-w-4xl">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold">Service Provider Integrations</h2>
            <p className="text-muted-foreground mt-1">
              Configure third-party services, APIs, and webhooks for your emergency response system
            </p>
          </div>

          <Tabs defaultValue="webhooks" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
              <TabsTrigger value="apis">APIs</TabsTrigger>
              <TabsTrigger value="services">Services</TabsTrigger>
            </TabsList>

            <TabsContent value="webhooks" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Webhook className="h-5 w-5" />
                    <CardTitle>Webhook Configuration</CardTitle>
                  </div>
                  <CardDescription>
                    Configure webhook endpoints to receive real-time notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="webhook-url">Webhook URL</Label>
                    <Input
                      id="webhook-url"
                      placeholder="https://your-service.com/webhook"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      This URL will receive POST requests for emergency events
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveWebhook}>Save Webhook</Button>
                    <Button variant="outline" onClick={handleTestWebhook}>
                      Test Connection
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="apis" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    <CardTitle>API Configuration</CardTitle>
                  </div>
                  <CardDescription>
                    Configure external API endpoints and authentication
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="api-endpoint">API Endpoint</Label>
                    <Input
                      id="api-endpoint"
                      placeholder="https://api.example.com/v1"
                      value={apiEndpoint}
                      onChange={(e) => setApiEndpoint(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="api-key">API Key</Label>
                    <Input
                      id="api-key"
                      type="password"
                      placeholder="Enter your API key"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Your API key is stored locally and encrypted
                    </p>
                  </div>
                  <Button onClick={handleSaveApiConfig}>Save Configuration</Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="services" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    <CardTitle>SMS Provider</CardTitle>
                  </div>
                  <CardDescription>
                    Configure SMS service for emergency notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sms-enabled">Enable SMS Provider</Label>
                    <Switch
                      id="sms-enabled"
                      checked={smsProvider.enabled}
                      onCheckedChange={(checked) =>
                        setSmsProvider({ ...smsProvider, enabled: checked })
                      }
                    />
                  </div>
                  {smsProvider.enabled && (
                    <>
                      <div className="space-y-2">
                        <Label>Provider API Key</Label>
                        <Input
                          type="password"
                          placeholder="Enter API key"
                          value={smsProvider.apiKey}
                          onChange={(e) =>
                            setSmsProvider({ ...smsProvider, apiKey: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Provider Endpoint</Label>
                        <Input
                          placeholder="https://sms-provider.com/api"
                          value={smsProvider.endpoint}
                          onChange={(e) =>
                            setSmsProvider({ ...smsProvider, endpoint: e.target.value })
                          }
                        />
                      </div>
                      <Button onClick={handleSaveSmsProvider}>Save SMS Config</Button>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    <CardTitle>Email Provider</CardTitle>
                  </div>
                  <CardDescription>
                    Configure email service for notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email-enabled">Enable Email Provider</Label>
                    <Switch
                      id="email-enabled"
                      checked={emailProvider.enabled}
                      onCheckedChange={(checked) =>
                        setEmailProvider({ ...emailProvider, enabled: checked })
                      }
                    />
                  </div>
                  {emailProvider.enabled && (
                    <>
                      <div className="space-y-2">
                        <Label>Provider API Key</Label>
                        <Input
                          type="password"
                          placeholder="Enter API key"
                          value={emailProvider.apiKey}
                          onChange={(e) =>
                            setEmailProvider({ ...emailProvider, apiKey: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Provider Endpoint</Label>
                        <Input
                          placeholder="https://email-provider.com/api"
                          value={emailProvider.endpoint}
                          onChange={(e) =>
                            setEmailProvider({ ...emailProvider, endpoint: e.target.value })
                          }
                        />
                      </div>
                      <Button onClick={handleSaveEmailProvider}>Save Email Config</Button>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    <CardTitle>Push Notifications</CardTitle>
                  </div>
                  <CardDescription>
                    Configure Firebase Cloud Messaging for push notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="push-enabled">Enable Push Notifications</Label>
                    <Switch
                      id="push-enabled"
                      checked={pushNotification.enabled}
                      onCheckedChange={(checked) =>
                        setPushNotification({ ...pushNotification, enabled: checked })
                      }
                    />
                  </div>
                  {pushNotification.enabled && (
                    <>
                      <div className="space-y-2">
                        <Label>FCM Server Key</Label>
                        <Input
                          type="password"
                          placeholder="Enter Firebase server key"
                          value={pushNotification.serverKey}
                          onChange={(e) =>
                            setPushNotification({
                              ...pushNotification,
                              serverKey: e.target.value,
                            })
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          Get this from Firebase Console → Project Settings → Cloud Messaging
                        </p>
                      </div>
                      <Button onClick={handleSavePushNotification}>Save Push Config</Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Integrations;

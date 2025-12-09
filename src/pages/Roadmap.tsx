import { Check, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Feature {
  name: string;
  completed: boolean;
  priority?: "high" | "medium" | "low";
}

interface FeatureCategory {
  category: string;
  description: string;
  features: Feature[];
}

const roadmapData: FeatureCategory[] = [
  {
    category: "Authentication & User Management",
    description: "User identity and access control",
    features: [
      { name: "Email/Password Authentication", completed: true },
      { name: "User Profiles", completed: true },
      { name: "Admin Role Management", completed: true },
      { name: "Two-Factor Authentication", completed: false, priority: "high" },
      { name: "Biometric Authentication", completed: false, priority: "medium" },
      { name: "Social Login (Google/Facebook)", completed: false, priority: "low" },
    ],
  },
  {
    category: "Emergency Alert System",
    description: "Core emergency response functionality",
    features: [
      { name: "Emergency Alert Creation", completed: true },
      { name: "Multiple Emergency Types", completed: true },
      { name: "Location Tracking", completed: true },
      { name: "Real-time Alert Updates", completed: true },
      { name: "Alert History", completed: true },
      { name: "Alert Escalation System", completed: true },
      { name: "Background Location Tracking", completed: true },
      { name: "Silent Panic Button", completed: true },
      { name: "False Alarm Cancellation", completed: true },
    ],
  },
  {
    category: "Evidence & Media",
    description: "Capture and manage emergency evidence",
    features: [
      { name: "Photo Capture", completed: true },
      { name: "Video Recording", completed: true },
      { name: "Audio Recording", completed: true },
      { name: "Video Compression", completed: true },
      { name: "Secure Storage (RLS)", completed: true },
      { name: "Live Video Streaming", completed: true },
      { name: "Automatic Evidence Upload", completed: false, priority: "medium" },
      { name: "Cloud Backup", completed: false, priority: "low" },
    ],
  },
  {
    category: "Notifications & Communications",
    description: "Alert and notify emergency contacts",
    features: [
      { name: "Email Notifications", completed: true },
      { name: "SMS Notifications", completed: true },
      { name: "Emergency Chat", completed: true },
      { name: "Push Notifications", completed: true },
      { name: "In-App Notifications", completed: true },
      { name: "Voice Call Integration", completed: true },
      { name: "Group Messaging", completed: true },
    ],
  },
  {
    category: "Contacts & Services",
    description: "Manage emergency contacts and services",
    features: [
      { name: "Personal Emergency Contacts", completed: true },
      { name: "Emergency Services Directory", completed: true },
      { name: "Community Service Submissions", completed: true },
      { name: "Pending Services Approval", completed: true },
      { name: "Service Rating System", completed: false, priority: "medium" },
      { name: "Service Verification", completed: false, priority: "high" },
      { name: "Contact Groups", completed: false, priority: "low" },
    ],
  },
  {
    category: "Location & Navigation",
    description: "Location services and routing",
    features: [
      { name: "Location Map Display", completed: true },
      { name: "Share Location", completed: true },
      { name: "Emergency Directions", completed: true },
      { name: "Distance Calculation", completed: true },
      { name: "Nearby Services Search", completed: false, priority: "high" },
      { name: "Route Optimization", completed: false, priority: "medium" },
      { name: "Offline Maps", completed: false, priority: "low" },
    ],
  },
  {
    category: "Medical Information",
    description: "Health and medical data management",
    features: [
      { name: "Medical ID Card", completed: true },
      { name: "Emergency Profile", completed: true },
      { name: "Medical History", completed: true },
      { name: "Medication Tracking", completed: true },
      { name: "Allergy Alerts", completed: true },
      { name: "Doctor Contact Integration", completed: true },
      { name: "Live Video Streaming", completed: true },
    ],
  },
  {
    category: "Admin Dashboard",
    description: "Administrative tools and monitoring",
    features: [
      { name: "Admin Authentication", completed: true },
      { name: "Alerts Monitor", completed: true },
      { name: "Emergency Services Manager", completed: true },
      { name: "User Roles Management", completed: true },
      { name: "Analytics Dashboard", completed: true },
      { name: "Report Generation (PDF/CSV)", completed: true },
      { name: "Audit Logs", completed: true },
      { name: "Real-time Dashboard Updates", completed: true },
      { name: "Bulk Operations", completed: false, priority: "low" },
    ],
  },
  {
    category: "Security & Privacy",
    description: "Data protection and security measures",
    features: [
      { name: "Row Level Security (RLS)", completed: true },
      { name: "Authenticated Edge Functions", completed: true },
      { name: "Input Validation & Sanitization", completed: true },
      { name: "Signed URLs for Storage", completed: true },
      { name: "Security Audit Logging", completed: true },
      { name: "Rate Limiting", completed: false, priority: "high" },
      { name: "Data Encryption at Rest", completed: false, priority: "high" },
      { name: "GDPR Compliance Tools", completed: false, priority: "medium" },
    ],
  },
  {
    category: "Integrations & Third-Party",
    description: "External service integrations",
    features: [
      { name: "Integrations Page Setup", completed: true },
      { name: "Firebase SDK (Android)", completed: true },
      { name: "Meta Ads SDK (Android)", completed: true },
      { name: "Billing Library (Android)", completed: true },
      { name: "Firebase Analytics", completed: false, priority: "high" },
      { name: "Firebase Crashlytics", completed: false, priority: "high" },
      { name: "Firebase Cloud Messaging", completed: false, priority: "high" },
      { name: "Google Play Billing", completed: false, priority: "medium" },
      { name: "Webhook Support", completed: false, priority: "medium" },
      { name: "Third-Party API Integration", completed: false, priority: "low" },
    ],
  },
  {
    category: "Offline & Performance",
    description: "Offline functionality and optimization",
    features: [
      { name: "Offline Sync System", completed: true },
      { name: "Service Worker", completed: false, priority: "high" },
      { name: "Progressive Web App (PWA)", completed: false, priority: "high" },
      { name: "Performance Monitoring", completed: false, priority: "medium" },
      { name: "Lazy Loading", completed: false, priority: "low" },
      { name: "Image Optimization", completed: false, priority: "low" },
    ],
  },
  {
    category: "Localization & Accessibility",
    description: "Multi-language and accessibility features",
    features: [
      { name: "English Language", completed: true },
      { name: "Tagalog Language", completed: true },
      { name: "Language Switcher", completed: true },
      { name: "Additional Languages", completed: false, priority: "medium" },
      { name: "Screen Reader Support", completed: false, priority: "high" },
      { name: "High Contrast Mode", completed: false, priority: "medium" },
      { name: "Voice Commands", completed: false, priority: "low" },
    ],
  },
];

export default function Roadmap() {
  const totalFeatures = roadmapData.reduce((acc, category) => acc + category.features.length, 0);
  const completedFeatures = roadmapData.reduce(
    (acc, category) => acc + category.features.filter((f) => f.completed).length,
    0
  );
  const completionPercentage = Math.round((completedFeatures / totalFeatures) * 100);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Feature Roadmap</h1>
          <p className="text-muted-foreground text-lg">
            Emergency Response PH - Development Progress Tracker
          </p>
        </div>

        {/* Progress Summary */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-2xl">Overall Progress</CardTitle>
            <CardDescription>Track our development journey</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-6 text-lg">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                <span className="font-semibold">{completedFeatures} Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <X className="h-5 w-5 text-destructive" />
                <span className="font-semibold">{totalFeatures - completedFeatures} Pending</span>
              </div>
              <div className="ml-auto">
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  {completionPercentage}% Complete
                </Badge>
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-500 rounded-full"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Feature Categories */}
        <div className="grid gap-6">
          {roadmapData.map((category, idx) => {
            const categoryCompleted = category.features.filter((f) => f.completed).length;
            const categoryTotal = category.features.length;
            const categoryPercentage = Math.round((categoryCompleted / categoryTotal) * 100);

            return (
              <Card key={idx} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-xl">{category.category}</CardTitle>
                      <CardDescription>{category.description}</CardDescription>
                    </div>
                    <Badge variant="outline" className="ml-4">
                      {categoryCompleted}/{categoryTotal}
                    </Badge>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden mt-4">
                    <div
                      className="bg-primary h-full transition-all duration-500"
                      style={{ width: `${categoryPercentage}%` }}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {category.features.map((feature, featureIdx) => (
                      <div
                        key={featureIdx}
                        className={`flex items-center gap-2 p-2 rounded-md ${
                          feature.completed
                            ? "bg-green-500/10 border border-green-500/20"
                            : "bg-destructive/10 border border-destructive/20"
                        }`}
                      >
                        {feature.completed ? (
                          <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        ) : (
                          <X className="h-4 w-4 text-destructive flex-shrink-0" />
                        )}
                        <span
                          className={`text-sm ${
                            feature.completed ? "text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {feature.name}
                        </span>
                        {!feature.completed && feature.priority && (
                          <Badge
                            variant={
                              feature.priority === "high"
                                ? "destructive"
                                : feature.priority === "medium"
                                ? "secondary"
                                : "outline"
                            }
                            className="ml-auto text-xs"
                          >
                            {feature.priority}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Legend */}
        <Card>
          <CardHeader>
            <CardTitle>Priority Legend</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Badge variant="destructive">High</Badge>
              <span className="text-sm text-muted-foreground">Critical functionality</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Medium</Badge>
              <span className="text-sm text-muted-foreground">Important enhancement</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Low</Badge>
              <span className="text-sm text-muted-foreground">Nice to have</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

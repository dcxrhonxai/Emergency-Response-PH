import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const serviceSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(200),
  type: z.string().min(1, "Please select a service type"),
  phone: z.string().trim().min(7, "Please enter a valid phone number").max(20),
  address: z.string().trim().max(500).optional(),
  city: z.string().trim().max(100).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const CommunityServices = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    phone: "",
    address: "",
    city: "",
    latitude: 0,
    longitude: 0,
  });

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));
        toast.success("Location captured successfully");
        setGettingLocation(false);
      },
      (error) => {
        console.error("Location error:", error);
        toast.error("Could not get your location. Please try again.");
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate form data
      const validated = serviceSchema.parse(formData);
      
      setSubmitting(true);

      const { error } = await supabase
        .from("emergency_services")
        .insert({
          name: validated.name,
          type: validated.type,
          phone: validated.phone,
          address: validated.address || null,
          city: validated.city || null,
          latitude: validated.latitude,
          longitude: validated.longitude,
          is_national: false,
        });

      if (error) throw error;

      toast.success("Thank you! Service submitted successfully and will be available to the community.");
      navigate("/");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        console.error("Submission error:", error);
        toast.error("Failed to submit service. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground shadow-lg">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Add Emergency Service</h1>
            <p className="text-sm opacity-90">Share with the community</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Submit Emergency Service Provider</CardTitle>
            <CardDescription>
              Help others by adding emergency service providers not listed in our database. 
              This information will be shared with the community.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Service Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., City Hospital Emergency Room"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  maxLength={200}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Service Type *</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select service type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fire">Fire Station</SelectItem>
                    <SelectItem value="medical">Medical / Hospital</SelectItem>
                    <SelectItem value="police">Police Station</SelectItem>
                    <SelectItem value="rescue">Rescue Services</SelectItem>
                    <SelectItem value="disaster">Disaster Response</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Contact Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="e.g., +63 912 345 6789"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  required
                  maxLength={20}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  placeholder="e.g., 123 Main St, Barangay Sample"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  maxLength={500}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City / Municipality</Label>
                <Input
                  id="city"
                  placeholder="e.g., Manila"
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label>Location Coordinates *</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGetLocation}
                    disabled={gettingLocation}
                    className="flex-1"
                  >
                    {gettingLocation ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <MapPin className="mr-2 h-4 w-4" />
                    )}
                    {formData.latitude !== 0 ? "Update Location" : "Get My Location"}
                  </Button>
                </div>
                {formData.latitude !== 0 && (
                  <p className="text-xs text-muted-foreground">
                    Lat: {formData.latitude.toFixed(6)}, Lng: {formData.longitude.toFixed(6)}
                  </p>
                )}
              </div>

              <div className="pt-4 space-y-2">
                <Button type="submit" disabled={submitting || formData.latitude === 0} className="w-full">
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Submit Service
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  * Required fields
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CommunityServices;

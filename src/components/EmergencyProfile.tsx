import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Camera, X } from "lucide-react";
import imageCompression from "browser-image-compression";

interface EmergencyProfileProps {
  userId: string;
}

const bloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export const EmergencyProfile = ({ userId }: EmergencyProfileProps) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [bloodType, setBloodType] = useState("");
  const [allergies, setAllergies] = useState("");
  const [medicalConditions, setMedicalConditions] = useState("");
  const [emergencyNotes, setEmergencyNotes] = useState("");
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("blood_type, allergies, medical_conditions, emergency_notes, profile_picture")
        .eq("id", userId)
        .single();

      if (error) throw error;

      if (data) {
        setBloodType(data.blood_type || "");
        setAllergies(data.allergies || "");
        setMedicalConditions(data.medical_conditions || "");
        setEmergencyNotes(data.emergency_notes || "");
        setProfilePicture(data.profile_picture || null);
      }
    } catch (error: any) {
      console.error("Error loading emergency profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "File size must be less than 2MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      // Compress image
      const options = {
        maxSizeMB: 2,
        maxWidthOrHeight: 800,
        useWebWorker: true
      };
      const compressedFile = await imageCompression(file, options);

      // Delete old profile picture if exists
      if (profilePicture) {
        const oldPath = profilePicture.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('profile-pictures')
            .remove([`${userId}/${oldPath}`]);
        }
      }

      // Upload new profile picture
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, compressedFile, {
          contentType: compressedFile.type,
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(fileName);

      // Update profile with new picture URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ profile_picture: publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      setProfilePicture(publicUrl);
      toast({
        title: "Success",
        description: "Profile picture updated successfully",
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Error",
        description: "Failed to upload profile picture",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!profilePicture) return;

    setUploading(true);
    try {
      // Delete from storage
      const path = profilePicture.split('/').pop();
      if (path) {
        await supabase.storage
          .from('profile-pictures')
          .remove([`${userId}/${path}`]);
      }

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({ profile_picture: null })
        .eq('id', userId);

      if (error) throw error;

      setProfilePicture(null);
      toast({
        title: "Success",
        description: "Profile picture removed",
      });
    } catch (error: any) {
      console.error("Remove error:", error);
      toast({
        title: "Error",
        description: "Failed to remove profile picture",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          blood_type: bloodType,
          allergies: allergies,
          medical_conditions: medicalConditions,
          emergency_notes: emergencyNotes,
        })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Emergency profile updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Emergency Medical Information</CardTitle>
        <CardDescription>
          This information will be shared with emergency contacts during alerts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Profile Picture */}
        <div className="flex flex-col items-center space-y-4">
          <Avatar className="w-32 h-32">
            {profilePicture ? (
              <AvatarImage src={profilePicture} alt="Profile" />
            ) : (
              <AvatarFallback className="text-4xl">👤</AvatarFallback>
            )}
          </Avatar>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Camera className="mr-2 h-4 w-4" />
              )}
              {profilePicture ? "Change Photo" : "Upload Photo"}
            </Button>
            {profilePicture && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemovePhoto}
                disabled={uploading}
              >
                <X className="mr-2 h-4 w-4" />
                Remove
              </Button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
          />
          <p className="text-xs text-muted-foreground text-center">
            Max size: 2MB. Recommended: 800x800px
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="blood-type">Blood Type</Label>
          <Select value={bloodType} onValueChange={setBloodType}>
            <SelectTrigger id="blood-type">
              <SelectValue placeholder="Select blood type" />
            </SelectTrigger>
            <SelectContent>
              {bloodTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="allergies">Allergies</Label>
          <Textarea
            id="allergies"
            placeholder="e.g., Penicillin, Peanuts, Latex"
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
            className="min-h-[80px]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="medical-conditions">Medical Conditions</Label>
          <Textarea
            id="medical-conditions"
            placeholder="e.g., Diabetes, Asthma, Heart condition"
            value={medicalConditions}
            onChange={(e) => setMedicalConditions(e.target.value)}
            className="min-h-[80px]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="emergency-notes">Additional Emergency Notes</Label>
          <Textarea
            id="emergency-notes"
            placeholder="Any other important information for first responders"
            value={emergencyNotes}
            onChange={(e) => setEmergencyNotes(e.target.value)}
            className="min-h-[80px]"
          />
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Emergency Profile
        </Button>
      </CardContent>
    </Card>
  );
};

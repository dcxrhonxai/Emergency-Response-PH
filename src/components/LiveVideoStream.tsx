import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Video, VideoOff, Radio, StopCircle, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface LiveVideoStreamProps {
  alertId: string;
  userId: string;
}

const LiveVideoStream = ({ alertId, userId }: LiveVideoStreamProps) => {
  const { t } = useTranslation();
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamId, setStreamId] = useState<string | null>(null);
  const [viewers, setViewers] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, []);

  const startStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: 1280, height: 720 },
        audio: true
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Create stream record in database
      const { data, error } = await supabase
        .from("video_streams")
        .insert({
          alert_id: alertId,
          user_id: userId,
          status: "active"
        })
        .select()
        .single();

      if (error) throw error;

      setStreamId(data.id);
      setIsStreaming(true);

      // Set up media recorder for chunks
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9"
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          // In a production app, you would upload chunks to storage
          // and update the stream URL for viewers
          console.log("Video chunk recorded:", event.data.size, "bytes");
        }
      };

      mediaRecorder.start(1000); // Record in 1-second chunks

      toast.success(t("alerts.liveStreamStarted", "Live stream started"));
    } catch (error) {
      console.error("Error starting stream:", error);
      toast.error(t("alerts.streamError", "Failed to start stream"));
    }
  };

  const stopStream = async () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (streamId) {
      await supabase
        .from("video_streams")
        .update({ status: "ended", ended_at: new Date().toISOString() })
        .eq("id", streamId);
    }

    setIsStreaming(false);
    setStreamId(null);
    toast.info(t("alerts.streamEnded", "Live stream ended"));
  };

  // Subscribe to viewer count updates
  useEffect(() => {
    if (!streamId) return;

    const channel = supabase
      .channel(`stream-${streamId}`)
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setViewers(Object.keys(state).length);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamId]);

  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Video className="h-5 w-5" />
            {t("alerts.liveStream", "Live Video Stream")}
          </CardTitle>
          {isStreaming && (
            <div className="flex items-center gap-2">
              <Badge variant="destructive" className="animate-pulse">
                <Radio className="h-3 w-3 mr-1" />
                LIVE
              </Badge>
              <Badge variant="secondary">
                <Users className="h-3 w-3 mr-1" />
                {viewers}
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          {!isStreaming && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <VideoOff className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {!isStreaming ? (
            <Button
              onClick={startStream}
              className="flex-1 bg-destructive hover:bg-destructive/90"
            >
              <Radio className="h-4 w-4 mr-2" />
              {t("alerts.startStream", "Start Live Stream")}
            </Button>
          ) : (
            <Button
              onClick={stopStream}
              variant="outline"
              className="flex-1 border-destructive text-destructive hover:bg-destructive/10"
            >
              <StopCircle className="h-4 w-4 mr-2" />
              {t("alerts.stopStream", "Stop Stream")}
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          {t("alerts.streamInfo", "Stream video to emergency contacts and responders")}
        </p>
      </CardContent>
    </Card>
  );
};

export default LiveVideoStream;

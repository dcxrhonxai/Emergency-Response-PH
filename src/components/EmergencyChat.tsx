import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Send, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import type { Database } from "@/integrations/supabase/types";

type Message = Database['public']['Tables']['emergency_messages']['Row'];

interface EmergencyChatProps {
  alertId: string;
  userId: string;
  userName: string;
}

export const EmergencyChat = ({ alertId, userId, userName }: EmergencyChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    fetchMessages();
    
    // Subscribe to new messages
    const channel = supabase
      .channel(`chat-${alertId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'emergency_messages',
          filter: `alert_id=eq.${alertId}`
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [alertId]);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('emergency_messages')
      .select('*')
      .eq('alert_id', alertId)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data);
      setTimeout(scrollToBottom, 100);
    }
    if (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;

    setIsLoading(true);
    const { error } = await supabase
      .from('emergency_messages')
      .insert({
        alert_id: alertId,
        sender_id: userId,
        sender_name: userName,
        message: newMessage.trim()
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
      console.error('Error sending message:', error);
    } else {
      setNewMessage("");
    }

    setIsLoading(false);
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <MessageCircle className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">{t('chat.title')}</h3>
      </div>

      <ScrollArea ref={scrollRef} className="h-64 pr-4">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            {t('chat.noMessages')}
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex flex-col ${
                  message.sender_id === userId ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`rounded-lg px-4 py-2 max-w-[80%] ${
                    message.sender_id === userId
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-xs font-semibold mb-1">
                    {message.sender_name}
                  </p>
                  <p className="text-sm">{message.message}</p>
                </div>
                <span className="text-xs text-muted-foreground mt-1">
                  {new Date(message.created_at).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <form onSubmit={sendMessage} className="flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={t('chat.placeholder')}
          disabled={isLoading}
        />
        <Button type="submit" disabled={isLoading || !newMessage.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </Card>
  );
};

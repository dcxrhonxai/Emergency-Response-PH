import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SEMAPHORE_API_KEY = Deno.env.get("SEMAPHORE_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory rate limiter
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const checkRateLimit = (identifier: string, maxRequests: number, windowMs: number) => {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count };
};

const getClientIP = (req: Request): string => {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
         req.headers.get("x-real-ip") || "unknown";
};

// Input validation schemas
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^[\d\s+()-]{7,20}$/;

interface EmergencyEmailRequest {
  alertId: string;
  contacts: Array<{
    name: string;
    email?: string;
    phone: string;
  }>;
  emergencyType: string;
  situation: string;
  location: {
    latitude: number;
    longitude: number;
  };
  evidenceFiles?: Array<{
    url: string;
    type: string;
  }>;
}

// Sanitize HTML to prevent XSS
const escapeHtml = (text: string): string => {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};

// Validate input data
const validateInput = (data: EmergencyEmailRequest): { valid: boolean; error?: string } => {
  // Validate alert ID format
  if (!data.alertId || typeof data.alertId !== 'string' || data.alertId.length < 10) {
    return { valid: false, error: "Invalid alert ID" };
  }

  // Validate emergency type
  if (!data.emergencyType || data.emergencyType.length > 100) {
    return { valid: false, error: "Invalid emergency type" };
  }

  // Validate situation description
  if (!data.situation || data.situation.length > 2000) {
    return { valid: false, error: "Situation description too long" };
  }

  // Validate coordinates
  if (
    typeof data.location.latitude !== 'number' ||
    typeof data.location.longitude !== 'number' ||
    data.location.latitude < -90 || data.location.latitude > 90 ||
    data.location.longitude < -180 || data.location.longitude > 180
  ) {
    return { valid: false, error: "Invalid location coordinates" };
  }

  // Validate contacts
  if (!Array.isArray(data.contacts) || data.contacts.length === 0 || data.contacts.length > 20) {
    return { valid: false, error: "Invalid number of contacts" };
  }

  for (const contact of data.contacts) {
    if (!contact.name || contact.name.length > 200) {
      return { valid: false, error: "Invalid contact name" };
    }
    if (contact.email && !emailRegex.test(contact.email)) {
      return { valid: false, error: `Invalid email address for ${contact.name}` };
    }
    if (!phoneRegex.test(contact.phone)) {
      return { valid: false, error: `Invalid phone number for ${contact.name}` };
    }
  }

  return { valid: true };
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting: 10 requests per minute per IP
  const clientIP = getClientIP(req);
  const rateLimit = checkRateLimit(`emergency_${clientIP}`, 10, 60000);
  
  if (!rateLimit.allowed) {
    console.log(`Rate limit exceeded for IP: ${clientIP}`);
    return new Response(
      JSON.stringify({ error: "Too many requests. Please try again later." }),
      { 
        status: 429, 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "Retry-After": "60"
        } 
      }
    );
  }

  try {
    // Extract and validate JWT token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const requestData: EmergencyEmailRequest = await req.json();

    // Validate input
    const validation = validateInput(requestData);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { alertId, contacts, emergencyType, situation, location, evidenceFiles } = requestData;

    // Verify the alert belongs to the authenticated user
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: alert, error: alertError } = await supabaseService
      .from("emergency_alerts")
      .select("user_id")
      .eq("id", alertId)
      .single();

    if (alertError || !alert) {
      return new Response(
        JSON.stringify({ error: "Alert not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (alert.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Unauthorized to send notifications for this alert" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const googleMapsUrl = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;

    // Sanitize user inputs for HTML
    const safeEmergencyType = escapeHtml(emergencyType);
    const safeSituation = escapeHtml(situation);

    const evidenceHtml = evidenceFiles && evidenceFiles.length > 0
      ? `
        <h3 style="color: #333; margin-top: 20px;">Evidence Files:</h3>
        <ul style="list-style: none; padding: 0;">
          ${evidenceFiles.map(file => `
            <li style="margin: 10px 0;">
              <a href="${escapeHtml(file.url)}" style="color: #e74c3c; text-decoration: none;">
                📎 View ${escapeHtml(file.type)}
              </a>
            </li>
          `).join('')}
        </ul>
      `
      : '';

    const emailPromises = contacts
      .filter(contact => contact.email)
      .map(async (contact) => {
        try {
          const safeName = escapeHtml(contact.name);
          const emailHtml = `
              <!DOCTYPE html>
              <html>
                <head>
                  <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .alert-header { background-color: #e74c3c; color: white; padding: 20px; border-radius: 5px; text-align: center; }
                    .content { background-color: #f9f9f9; padding: 20px; margin-top: 20px; border-radius: 5px; }
                    .button { display: inline-block; background-color: #e74c3c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 15px; }
                    .info-box { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="alert-header">
                      <h1 style="margin: 0;">🚨 EMERGENCY ALERT</h1>
                      <p style="margin: 10px 0 0 0; font-size: 18px;">${safeEmergencyType.toUpperCase()}</p>
                    </div>
                    
                    <div class="content">
                      <h2 style="color: #e74c3c;">Dear ${safeName},</h2>
                      <p style="font-size: 16px;">
                        Your emergency contact has triggered an emergency alert and needs assistance.
                      </p>
                      
                      <div class="info-box">
                        <strong>Emergency Type:</strong> ${safeEmergencyType}<br>
                        <strong>Situation:</strong> ${safeSituation}
                      </div>
                      
                      <h3 style="color: #333;">📍 Location:</h3>
                      <p>
                        Latitude: ${location.latitude}<br>
                        Longitude: ${location.longitude}
                      </p>
                      <a href="${googleMapsUrl}" class="button" target="_blank">
                        View Location on Map
                      </a>
                      
                      ${evidenceHtml}
                      
                      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                        <p style="color: #666; font-size: 14px;">
                          <strong>What to do:</strong><br>
                          1. Try to contact them immediately<br>
                          2. If you cannot reach them, consider contacting emergency services<br>
                          3. Share this location information with authorities if needed
                        </p>
                      </div>
                    </div>
                    
                    <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
                      <p>This is an automated emergency notification. Please respond immediately.</p>
                    </div>
                  </div>
                </body>
              </html>
            `;

          const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Emergency Alert <onboarding@resend.dev>",
              to: [contact.email!],
              subject: `🚨 EMERGENCY ALERT: ${safeEmergencyType.toUpperCase()}`,
              html: emailHtml,
            }),
          });

          if (!emailResponse.ok) {
            throw new Error(`Email API error: ${emailResponse.status}`);
          }

          await supabaseService.from("alert_notifications").insert({
            alert_id: alertId,
            contact_name: contact.name,
            contact_phone: contact.phone,
            notified_at: new Date().toISOString(),
          });

          return { success: true, contact: contact.name };
        } catch (error: any) {
          return { success: false, contact: contact.name, error: error.message };
        }
      });

    const emailResults = await Promise.all(emailPromises);
    const emailSuccessful = emailResults.filter(r => r.success).length;
    const emailFailed = emailResults.filter(r => !r.success).length;

    // Send SMS notifications via Semaphore
    const smsContacts = contacts.filter(contact => contact.phone);
    const smsPromises = smsContacts.map(async (contact) => {
      try {
        const smsMessage = `🚨 EMERGENCY ALERT 🚨\n\n${emergencyType}\n\n${situation}\n\nLocation: https://www.google.com/maps?q=${location.latitude},${location.longitude}\n\nThis is an automated emergency notification.`;

        const response = await fetch("https://api.semaphore.co/api/v4/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            apikey: SEMAPHORE_API_KEY!,
            number: contact.phone,
            message: smsMessage.substring(0, 480), // SMS length limit
            sendername: "EmergencyPH",
          }),
        });

        const smsData = await response.json();

        if (response.ok && Array.isArray(smsData) && smsData.length > 0 && smsData[0].message_id) {
          await supabaseService.from("alert_notifications").insert({
            alert_id: alertId,
            contact_name: contact.name,
            contact_phone: contact.phone,
            notified_at: new Date().toISOString(),
          });

          return { success: true, contact: contact.name };
        } else {
          return { success: false, contact: contact.name, error: "SMS delivery failed" };
        }
      } catch (error: any) {
        return { success: false, contact: contact.name, error: error.message };
      }
    });

    const smsResults = await Promise.all(smsPromises);
    const smsSuccessful = smsResults.filter(r => r.success).length;
    const smsFailed = smsResults.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        emailSent: emailSuccessful,
        emailFailed: emailFailed,
        smsSent: smsSuccessful,
        smsFailed: smsFailed,
        results: {
          email: emailResults,
          sms: smsResults,
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    // Only log error type, not sensitive details
    console.error("Error type:", error.name);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
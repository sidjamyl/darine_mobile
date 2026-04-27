import { env } from "@app/env/server";

type DeliveryAttemptResult = {
  success: boolean;
  provider: string;
  recipient: string;
  errorMessage?: string;
  shouldInvalidateToken?: boolean;
};

export type EmailMessageInput = {
  to: string;
  subject: string;
  text: string;
};

export type ExpoPushMessageInput = {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
};

export type WhatsAppTemplateInput = {
  phoneNumber: string;
  templateKey: string;
  variables: Record<string, string>;
};

export async function sendResendEmail(message: EmailMessageInput): Promise<DeliveryAttemptResult> {
  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
    return {
      success: false,
      provider: "resend",
      recipient: message.to,
      errorMessage: "Resend is not configured",
    };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.RESEND_FROM_EMAIL,
        to: [message.to],
        subject: message.subject,
        text: message.text,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return {
        success: false,
        provider: "resend",
        recipient: message.to,
        errorMessage: `HTTP ${response.status}: ${errorBody}`,
      };
    }

    return {
      success: true,
      provider: "resend",
      recipient: message.to,
    };
  } catch (error) {
    return {
      success: false,
      provider: "resend",
      recipient: message.to,
      errorMessage: error instanceof Error ? error.message : "Unknown Resend error",
    };
  }
}

export async function sendExpoPushMessage(message: ExpoPushMessageInput): Promise<DeliveryAttemptResult> {
  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: message.token,
        title: message.title,
        body: message.body,
        data: message.data,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          data?: {
            status?: string;
            message?: string;
            details?: {
              error?: string;
            };
          };
          errors?: Array<{ message?: string }>;
        }
      | null;

    const pushError = payload?.data?.details?.error ?? payload?.data?.message ?? payload?.errors?.[0]?.message;

    if (!response.ok || payload?.data?.status === "error") {
      const shouldInvalidateToken = pushError === "DeviceNotRegistered";

      return {
        success: false,
        provider: "expo",
        recipient: message.token,
        errorMessage: pushError ?? `HTTP ${response.status}`,
        shouldInvalidateToken,
      };
    }

    return {
      success: true,
      provider: "expo",
      recipient: message.token,
    };
  } catch (error) {
    return {
      success: false,
      provider: "expo",
      recipient: message.token,
      errorMessage: error instanceof Error ? error.message : "Unknown Expo push error",
    };
  }
}

export async function sendWhatsAppTemplate(_message: WhatsAppTemplateInput): Promise<DeliveryAttemptResult> {
  return {
    success: false,
    provider: "whatsapp-abstraction",
    recipient: _message.phoneNumber,
    errorMessage: "WhatsApp sending is not enabled in V1",
  };
}

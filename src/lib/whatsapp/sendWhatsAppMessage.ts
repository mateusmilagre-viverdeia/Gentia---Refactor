import { invokeAuthenticatedFunction } from "@/lib/authenticatedFetch";

export type WhatsAppProvider = "zapi";

export interface SendWhatsAppMessageParams {
  toPhoneE164: string;
  message: string;
  provider?: WhatsAppProvider;
}

export async function sendWhatsAppMessage(params: SendWhatsAppMessageParams) {
  return invokeAuthenticatedFunction<{ success: boolean; provider: string }>("whatsapp-send", {
    provider: params.provider || "zapi",
    toPhoneE164: params.toPhoneE164,
    message: params.message,
  });
}

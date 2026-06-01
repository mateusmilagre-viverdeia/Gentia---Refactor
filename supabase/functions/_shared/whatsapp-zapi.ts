type ZApiResult = {
  status: number;
  response: unknown;
};

function normalizePhoneE164(input: string): string {
  // Keep digits only; Z-API expects numbers without '+'
  return (input || "").replace(/\D/g, "");
}

export function isZApiConfigured() {
  const baseUrl = Deno.env.get("ZAPI_BASE_URL")?.replace(/\/$/, "");
  const instanceId = Deno.env.get("ZAPI_INSTANCE_ID");
  const token = Deno.env.get("ZAPI_TOKEN");
  return Boolean(baseUrl && instanceId && token);
}

export async function sendWhatsAppViaZApi(params: {
  toPhoneE164: string;
  message: string;
}): Promise<ZApiResult> {
  const baseUrl = Deno.env.get("ZAPI_BASE_URL")?.replace(/\/$/, "");
  const instanceId = Deno.env.get("ZAPI_INSTANCE_ID");
  const token = Deno.env.get("ZAPI_TOKEN");

  if (!baseUrl || !instanceId || !token) {
    throw new Error(
      "Z-API secrets not configured (ZAPI_BASE_URL, ZAPI_INSTANCE_ID, ZAPI_TOKEN)"
    );
  }

  // Common Z-API pattern: /instances/{instanceId}/token/{token}/send-text
  const url = `${baseUrl}/instances/${instanceId}/token/${token}/send-text`;
  const payload = {
    phone: normalizePhoneE164(params.toPhoneE164),
    message: params.message,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    console.error("Z-API error", { status: res.status, body: json });
    throw new Error(`Z-API request failed (${res.status})`);
  }

  return { status: res.status, response: json };
}

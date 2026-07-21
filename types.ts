export interface GmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  body: string;
  labels: string[];
}

export interface GmailUserProfile {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
}

// Recursively find body data in parts
function findBodyData(part: any): { data: string; mimeType: string } | null {
  if (part.body && part.body.data) {
    return { data: part.body.data, mimeType: part.mimeType };
  }
  if (part.parts) {
    // Try to find html first
    for (const subPart of part.parts) {
      if (subPart.mimeType === "text/html") {
        const found = findBodyData(subPart);
        if (found) return found;
      }
    }
    // Fall back to any found body part
    for (const subPart of part.parts) {
      const found = findBodyData(subPart);
      if (found) return found;
    }
  }
  return null;
}

export function decodeGmailBody(encoded: string): string {
  if (!encoded) return "";
  try {
    // Convert base64url to standard base64
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    // Decode with UTF-8 support
    return decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
  } catch (err) {
    try {
      return atob(encoded.replace(/-/g, "+").replace(/_/g, "/"));
    } catch {
      return "Unable to decode message body content.";
    }
  }
}

export async function getGmailProfile(token: string): Promise<GmailUserProfile> {
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch Gmail profile: ${res.statusText}`);
  }
  return res.json();
}

export async function listGmailMessages(
  token: string,
  queryParam: string = "",
  maxResults: number = 20
): Promise<{ id: string; threadId: string }[]> {
  const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
  url.searchParams.set("maxResults", maxResults.toString());
  if (queryParam) {
    url.searchParams.set("q", queryParam);
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to list messages: ${res.statusText}`);
  }

  const data = await res.json();
  return data.messages || [];
}

export async function getGmailMessageDetails(token: string, id: string): Promise<GmailMessage> {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch message details: ${res.statusText}`);
  }

  const data = await res.json();
  const headers = data.payload?.headers || [];

  const getHeader = (name: string) => {
    return headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || "";
  };

  // Find the message body
  let rawBody = "";
  if (data.payload?.body?.data) {
    rawBody = data.payload.body.data;
  } else if (data.payload?.parts) {
    const found = findBodyData(data.payload);
    if (found) {
      rawBody = found.data;
    }
  }

  const decodedBody = decodeGmailBody(rawBody);

  return {
    id: data.id,
    threadId: data.threadId,
    subject: getHeader("Subject") || "(No Subject)",
    from: getHeader("From") || "Unknown Sender",
    to: getHeader("To") || "Unknown Recipient",
    date: getHeader("Date") || "",
    snippet: data.snippet || "",
    body: decodedBody,
    labels: data.labelIds || [],
  };
}

export async function sendGmailEmail(
  token: string,
  to: string,
  subject: string,
  body: string
): Promise<any> {
  // Construct a clean, standard MIME email string
  const emailLines = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "Content-Type: text/html; charset=utf-8",
    "MIME-Version: 1.0",
    "",
    body,
  ];

  const email = emailLines.join("\r\n");
  
  // Safe base64url encode
  const base64Safe = btoa(unescape(encodeURIComponent(email)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: base64Safe }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to send email: ${errText || res.statusText}`);
  }

  return res.json();
}

export async function trashGmailMessage(token: string, id: string): Promise<any> {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}/trash`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to move message to trash: ${res.statusText}`);
  }

  return res.json();
}

import "server-only";

import { createSign } from "node:crypto";

type DriveConfig = {
  email: string;
  key: string;
  folderId: string;
};

export function driveConfig(): DriveConfig | null {
  const email = process.env.GOOGLE_CLIENT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  const folderId = process.env.DRIVE_FOLDER_ID;
  if (!email || !key || !folderId) return null;
  return { email, key: key.replace(/\\n/g, "\n"), folderId };
}

function base64url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

async function accessToken(config: DriveConfig): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(
    JSON.stringify({
      iss: config.email,
      scope: "https://www.googleapis.com/auth/drive.file",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsigned = `${header}.${claim}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  const assertion = `${unsigned}.${signer.sign(config.key).toString("base64url")}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const body = (await response.json()) as { access_token?: string; error?: string };
  if (!response.ok || !body.access_token) {
    throw new Error(body.error || "Drive no entregó un token.");
  }
  return body.access_token;
}

export async function uploadToDrive(bytes: Uint8Array, filename: string, contentType: string): Promise<string | null> {
  const config = driveConfig();
  if (!config) return null;
  const token = await accessToken(config);
  const boundary = `dvc${Date.now()}`;
  const meta = JSON.stringify({
    name: filename,
    parents: [config.folderId],
  });
  const preamble = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: ${contentType}\r\n\r\n`;
  const ending = `\r\n--${boundary}--`;
  const body = Buffer.concat([Buffer.from(preamble), Buffer.from(bytes), Buffer.from(ending)]);
  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );
  const uploaded = (await response.json()) as { id?: string; webViewLink?: string; error?: { message?: string } };
  if (!response.ok || !uploaded.id) {
    throw new Error(uploaded.error?.message || "No pude subir el archivo a Drive.");
  }
  return uploaded.webViewLink || `https://drive.google.com/file/d/${uploaded.id}/view`;
}

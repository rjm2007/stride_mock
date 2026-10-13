import { createHash } from "node:crypto";
import SftpClient from "ssh2-sftp-client";

export type Upload = { name: string; content: string };

function privateKey(): string {
  const raw = process.env.SFTP_PRIVATE_KEY || "";
  // Hosting dashboards often store multi-line secrets on one line with literal \n.
  return raw.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;
}

// Upload each file under a temporary ".part" name, then rename it: the standard way to
// tell the receiver a file is complete. Our importer ignores ".part" files.
export async function uploadFiles(files: Upload[]): Promise<void> {
  const host = process.env.SFTP_HOST;
  const key = privateKey();
  if (!host || !key) throw new Error("SFTP_HOST and SFTP_PRIVATE_KEY must be set");
  const expected = (process.env.SFTP_HOST_FINGERPRINT || "").replace(/^SHA256:/, "").replace(/=+$/, "");
  const dir = (process.env.SFTP_DIR || "/incoming").replace(/\/+$/, "");
  const client = new SftpClient("mock-stride");
  await client.connect({
    host,
    port: Number(process.env.SFTP_PORT || 22),
    username: process.env.SFTP_USERNAME || "stride",
    privateKey: key,
    readyTimeout: 20000,
    // Refuse to talk to an impostor server when a fingerprint is configured.
    hostVerifier: expected
      ? (hostKey: Buffer) =>
          createHash("sha256").update(hostKey).digest("base64").replace(/=+$/, "") === expected
      : undefined,
  });
  try {
    for (const file of files) {
      const temporary = `${dir}/${file.name}.part`;
      await client.put(Buffer.from(file.content, "utf8"), temporary);
      await client.rename(temporary, `${dir}/${file.name}`);
    }
  } finally {
    await client.end();
  }
}

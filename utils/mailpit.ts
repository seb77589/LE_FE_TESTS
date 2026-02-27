import type { APIRequestContext } from '@playwright/test';

type MailpitAddress = {
  Address?: string;
};

type MailpitMessage = {
  ID: string;
  To?: MailpitAddress[];
};

type MailpitMessagesResponse = {
  messages?: MailpitMessage[];
};

type MailpitMessageDetail = {
  HTML?: string;
  Text?: string;
};

const DEFAULT_MAILPIT_URL = 'http://localhost:8025';

function getMailpitBaseUrl(): string {
  return (
    process.env.SMTP_TEST_SERVER ||
    process.env.MAILHOG_URL ||
    DEFAULT_MAILPIT_URL
  ).replace(/\/$/, '');
}

function extractResetToken(content: string): string | null {
  const patterns = [
    /reset-password\?token=([A-Za-z0-9._-]+)/,
    /token=([A-Za-z0-9._-]{20,})/,
    /reset\?token=([A-Za-z0-9._-]+)/,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

export async function clearMailpitInbox(request: APIRequestContext): Promise<void> {
  const response = await request.delete(`${getMailpitBaseUrl()}/api/v1/messages`);
  if (!response.ok()) {
    throw new Error(`Failed to clear Mailpit inbox: ${response.status()}`);
  }
}

export async function waitForPasswordResetToken(
  request: APIRequestContext,
  recipientEmail: string,
  timeoutMs = 60000,
): Promise<string> {
  const startedAt = Date.now();
  const pollIntervalMs = 1500;

  while (Date.now() - startedAt < timeoutMs) {
    const listResponse = await request.get(`${getMailpitBaseUrl()}/api/v1/messages`);
    if (!listResponse.ok()) {
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
      continue;
    }

    const payload = (await listResponse.json()) as MailpitMessagesResponse;
    const targetMessage = (payload.messages || []).find((message) =>
      (message.To || []).some(
        (address) =>
          (address.Address || '').toLowerCase() === recipientEmail.toLowerCase(),
      ),
    );

    if (!targetMessage?.ID) {
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
      continue;
    }

    const detailResponse = await request.get(
      `${getMailpitBaseUrl()}/api/v1/message/${targetMessage.ID}`,
    );
    if (!detailResponse.ok()) {
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
      continue;
    }

    const detail = (await detailResponse.json()) as MailpitMessageDetail;
    const combinedContent = `${detail.HTML || ''}\n${detail.Text || ''}`;
    const token = extractResetToken(combinedContent);
    if (token) {
      return token;
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(
    `Timed out waiting for password reset email token for ${recipientEmail}`,
  );
}

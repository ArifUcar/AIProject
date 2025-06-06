export interface SendMessageRequest {
    sessionId: string;
    message: string;
    base64Images?: string[];
  }
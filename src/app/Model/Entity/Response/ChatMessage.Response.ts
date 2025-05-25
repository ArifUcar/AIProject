export interface ChatMessageResponse {
    id: string;
    chatSessionId: string;
    messageContent: string;
    sender: number; // 1: user, 2: assistant
    sentAt: string;
    createdDate: string;
    inputTokens: number;
    outputTokens: number;
} 
export interface SendMessageResponse {
    id: string;
    sessionId: string;
    userId: string;
    content: string;
    base64Images: string[];
    senderType: number;
    messageStatus: number;
    hasImage: boolean;
    inputToken: number | null;
    outputToken: number | null;
    sentAt: string;
    createdDate: string;
    updatedDate: string | null;
    deleteDate: string | null;
    updatedByUserId: string | null;
    isActive: boolean;
  }
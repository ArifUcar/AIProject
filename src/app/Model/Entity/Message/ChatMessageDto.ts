export interface ChatMessageDto {
    content: string;
    createdDate: string;
    deleteDate: string | null;
    hasImage: boolean;
    id: string;
    imageUrl: string[];
    inputToken: string | null;
    isActive: boolean;
    messageStatus: number;
    outputToken: string | null;
    senderType: number;
    sentAt: string;
    sessionId: string;
    updatedByUserId: string | null;
    updatedDate: string;
    userId: string;
}
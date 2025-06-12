import { ChatMessageDto } from './ChatMessageDto';

export interface SendMessageResponse {
    userMessage: ChatMessageDto;
    aiResponse: ChatMessageDto;
} 
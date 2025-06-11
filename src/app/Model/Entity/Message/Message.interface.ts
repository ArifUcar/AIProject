export interface Message {
  id: number;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  hasImage: boolean;
  imageUrl?: string[];
  messageStatus: number;
  isActive: boolean;
} 
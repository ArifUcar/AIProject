export interface UserMessageStats {
    totalMessages: number;
    userMessages: number;
    aiMessages: number;
    systemMessages: number;
    averageMessageLength: number;
    messagesWithImages: number;
    dailyMessageDistribution: { [key: string]: number } | null;
    weeklyMessageDistribution: { [key: string]: number } | null;
    monthlyMessageDistribution: { [key: string]: number } | null;
    firstMessageDate: string | null;
    lastMessageDate: string | null;
  }
  
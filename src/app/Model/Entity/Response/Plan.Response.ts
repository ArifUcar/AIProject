export interface PlanModel {
    provider: string;
    name: string;
    version: string;
    features: string[];
    priority: number;
}

export interface PlanResponse {
    name: string;
    description: string;
    duration: number;
    price: number;
    internalCost: number;
    discountRate: number | null;
    isActive: boolean;
    displayOrder: number;
    colorCode: string;
    validFrom: string;
    validTo: string | null;
    models: string; // JSON string olarak saklanıyor
    allowedUsageTypes: string;
    weeklyInputTokenLimit: number;
    weeklyOutputTokenLimit: number;
    weeklyImageLimit: number;
    weeklyAudioMinutesLimit: number;
    monthlyInputTokenLimit: number;
    monthlyOutputTokenLimit: number;
    yearlyInputTokenLimit: number;
    yearlyOutputTokenLimit: number;
    monthlyImageLimit: number;
    yearlyImageLimit: number;
    monthlyAudioMinutesLimit: number;
    yearlyAudioMinutesLimit: number;
    inputTokenFee: number;
    outputTokenFee: number;
    imageFee: number;
    audioTTSFee: number;
    audioTranscriptFee: number;
    id: string;
    isDeleted: boolean;
    createdDate: string;
    updatedDate: string | null;
    deleteDate: string | null;
    createdByUserId: string;
    updatedByUserId: string | null;
    deleteByUserId: string | null;
} 
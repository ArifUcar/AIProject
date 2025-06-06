/**
 * Mesaj gönderici tipleri
 */
export enum SenderType {
    /**
     * Tanımsız gönderici tipi
     */
    None = 0,
  
    /**
     * İnsan kullanıcı tarafından gönderilen mesaj
     */
    User = 1,
  
    /**
     * AI asistan tarafından gönderilen mesaj (GPT-4, Claude, Gemini)
     */
    Assistant = 2,
  
    /**
     * Sistem tarafından gönderilen mesaj
     */
    System = 3
  }
  
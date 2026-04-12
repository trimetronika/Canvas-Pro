
export const formatPhoneNumber = (phone: string): string | null => {
  if (!phone) return null;
  // Remove non-digits
  let cleaned = phone.replace(/\D/g, '');
  
  // Replace leading 0 with 62
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  }
  
  // If it doesn't start with 62, assume it needs it (if it's a local number without 0)
  // But be careful, maybe it's already international format without +
  if (!cleaned.startsWith('62')) {
     // Simple heuristic: if length is 10-13, assume ID number
     if (cleaned.length >= 10 && cleaned.length <= 13) {
        cleaned = '62' + cleaned;
     }
  }

  return cleaned;
};

export const getWhatsAppLink = (phone: string, text?: string): string | null => {
  const formatted = formatPhoneNumber(phone);
  if (!formatted) return null;
  
  const baseUrl = `https://wa.me/${formatted}`;
  if (text) {
    return `${baseUrl}?text=${encodeURIComponent(text)}`;
  }
  return baseUrl;
};

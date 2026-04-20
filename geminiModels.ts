export const LOCAL_STORAGE_GEMINI_MODEL_KEY = 'canvasPro_geminiModel';
export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

export interface GeminiModelOption {
  id: string;
  label: string;
  description: string;
  experimental?: boolean;
}

export const GEMINI_MODEL_OPTIONS: GeminiModelOption[] = [
  {
    id: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    description: 'Default cepat + kualitas bagus',
  },
  {
    id: 'gemini-2.5-flash-lite',
    label: 'Gemini 2.5 Flash-Lite',
    description: 'Lebih hemat kuota dan biaya',
  },
  {
    id: 'gemini-2.5-pro',
    label: 'Gemini 2.5 Pro (Experimental)',
    description: 'Kualitas tinggi, kemungkinan kuota lebih ketat',
    experimental: true,
  },
  {
    id: 'gemini-2.0-flash',
    label: 'Gemini 2.0 Flash (Experimental)',
    description: 'Kompatibilitas bervariasi pada beberapa project',
    experimental: true,
  },
];

export const isValidGeminiModel = (model: string | null | undefined): boolean =>
  model != null && GEMINI_MODEL_OPTIONS.some((option) => option.id === model);

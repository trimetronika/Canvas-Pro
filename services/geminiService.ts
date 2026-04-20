import { GoogleGenAI, Tool } from "@google/genai";
import { GeoLocation, CanvasPlan, PlaceSource, CanvasStop, IndustryOption, LeadScore } from "../types";
import { calculateDistance } from "./routeOptimization";
import { DEFAULT_GEMINI_MODEL } from "../geminiModels";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/** Returns true if the error is a Gemini rate-limit / quota-exhausted error. */
export const isGeminiRateLimitError = (err: unknown): boolean => {
  if (err == null) return false;
  const maybeError = err as { code?: number; status?: string; message?: string };
  if (maybeError.code === 429 || maybeError.status === "RESOURCE_EXHAUSTED") return true;
  const msg: string = maybeError.message || "";
  return (
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("Quota exceeded") ||
    msg.includes("quota") ||
    msg.includes("rate limit") ||
    msg.includes("429")
  );
};

/** Parses the suggested retry delay (in seconds) from a Gemini error, or returns null. */
const getRetrySeconds = (err: any): number | null => {
  if (!err) return null;

  // Try structured details array: [{ "@type": "...RetryInfo", "retryDelay": "36s" }]
  const details: any[] = err?.details || err?.error?.details || [];
  for (const d of details) {
    if (d?.retryDelay) {
      const match = String(d.retryDelay).match(/(\d+(\.\d+)?)/);
      if (match) return Math.ceil(parseFloat(match[1]));
    }
  }

  // Fall back to parsing the message string: "Please retry in 36.449920189s"
  const msg: string = err?.message || "";
  const msgMatch = msg.match(/retry in (\d+(\.\d+)?)s/i);
  if (msgMatch) return Math.ceil(parseFloat(msgMatch[1]));

  return null;
};

/** Executes a Gemini generateContent call with the selected model (no auto-fallback). */
const callGemini = async (
  model: string,
  prompt: string,
  config: Record<string, any>
): Promise<any> => {
  try {
    const response = await ai.models.generateContent({ model, contents: prompt, config });
    console.log(`[Gemini] Request served by ${model}`);
    return response;
  } catch (err: any) {
    if (isGeminiRateLimitError(err)) {
      const waitSecs = getRetrySeconds(err);
      const baseMsg = `Model ${model} mencapai batas kuota/rate limit Gemini.`;
      const friendly = new Error(
        waitSecs
          ? `${baseMsg} Coba lagi dalam ${waitSecs} detik.`
          : `${baseMsg} Coba lagi beberapa saat lagi.`
      ) as any;
      friendly.retryAfterSeconds = waitSecs;
      friendly.isRateLimitError = true;
      friendly.model = model;
      friendly.code = err?.code;
      friendly.status = err?.status;
      throw friendly;
    }

    throw err;
  }
};

// Simple heuristic to score leads based on keywords and industry relevance
// In a real app, this would analyze review sentiment from grounding chunks deeper
const analyzeLeadPotential = (title: string, industryIds: string[]): LeadScore => {
  const titleLower = title.toLowerCase();
  
  // Keywords indicating high value/scale
  const hotKeywords = ['pt', 'tbk', 'corp', 'persero', 'pusat', 'hq', 'factory', 'pabrik', 'industri', 'tower', 'plaza', 'mall', 'hotel', 'hospital', 'rs ', 'universitas'];
  
  // Keywords indicating moderate value
  const warmKeywords = ['cv', 'toko', 'store', 'cabang', 'klinik', 'café', 'cafe', 'restoran', 'restaurant', 'sekolah', 'agency', 'mart'];
  
  if (hotKeywords.some(k => titleLower.includes(k))) return 'hot';
  if (warmKeywords.some(k => titleLower.includes(k))) return 'warm';
  
  // Default fallback based on industry type (B2B heavy industries default to warm/hot)
  if (industryIds.some(id => ['industrial', 'corporate', 'startup'].includes(id))) return 'warm';
  
  return 'cold'; // Likely small retail or unclear
};

export const generateCanvasRoute = async (
  location: GeoLocation | null,
  industries: IndustryOption[],
  customQueryText?: string,
  areaName?: string,
  radius?: number, // in km
  model: string = DEFAULT_GEMINI_MODEL
): Promise<CanvasPlan> => {
  
  const isAiRecommendation = industries.some(i => i.id === 'ai-recommendation');
  
  // Use custom query if provided, otherwise default to industry query
  let searchContext = customQueryText || industries.map(i => i.query).join(', ');
  let categoryLabel = customQueryText || industries.map(i => i.label).join(', ');

  if (isAiRecommendation && !customQueryText) {
     searchContext = "Bisnis B2B potensial, Perkantoran, Pabrik, Pusat Grosir, atau Kawasan Komersial";
     categoryLabel = "AI Recommended Leads";
  }

  // System Instruction in Indonesian for local context
    const systemInstruction = `
    Kamu adalah asisten intelijen penjualan (Sales Intelligence Assistant) senior untuk Absenku.com (Aplikasi HRIS & Absensi Online).
    Tugas: Cari prospek bisnis nyata menggunakan Google Maps ${areaName ? `di area: ${areaName}` : 'di sekitar lokasi user'}.
    ${radius ? `Fokus pencarian dalam radius sekitar ${radius} km.` : ''}
    
    CRITICAL INSTRUCTION:
    1. GUNAKAN TOOL 'googleMaps' untuk mencari lokasi. Jangan hanya memberikan saran teks.
    2. BATASAN LOKASI SANGAT KETAT: Anda HANYA BOLEH memberikan hasil yang berada di dalam kota/area yang diminta dan dalam radius ${radius || 5} km dari titik koordinat yang diberikan. JANGAN memberikan hasil dari kota lain atau pulau lain. Pastikan jaraknya masuk akal.
    3. ${isAiRecommendation 
         ? "ANALISIS area ini, tentukan sektor industri yang paling ramai (misal: jika kawasan industri cari pabrik, jika CBD cari kantor). Lalu cari 10-15 bisnis spesifik yang memiliki minimal 20 karyawan." 
         : `Cari 10-15 bisnis yang SANGAT RELEVAN dengan kata kunci: "${searchContext}". Prioritaskan perusahaan menengah ke atas.`
       }
    4. Filter: Prioritaskan bisnis yang memiliki kantor fisik, pabrik, atau operasional nyata. Hindari toko kelontong kecil kecuali jika user mencari retail spesifik.
    5. Berikan output teks dalam format Markdown yang berisi:
       - **Analisis Area**: Potensi area ini untuk Absenku.com.
       - **Daftar Prospek**: Alasan kenapa bisnis ini butuh aplikasi HR dan Opening Pitch yang spesifik.
    
    6. PENTING: Saat user mencari bisnis, berikan data dalam format JSON yang rapi di akhir respons.
       Format JSON HARUS SEPERTI INI:
       \`\`\`json
       [
         {
           "name": "Nama Bisnis",
           "address": "Alamat Lengkap",
           "phone": "Nomor Telepon (jika ada)",
           "website": "Website (jika ada)",
           "rating": 4.5,
           "latitude": -6.12345,
           "longitude": 106.12345,
           "category": "Jenis Industri",
           "absenkuAnalysis": "Tambahkan analisis singkat tentang potensi bisnis tersebut untuk menggunakan layanan Absenku (misal: 'Bisnis ini memiliki jam operasional shift, sangat butuh fitur absensi GPS')"
         }
       ]
       \`\`\`
  `;

  try {
    const tools: Tool[] = [{ googleMaps: {} }];

    const prompt = `
      ${areaName ? `Area target: ${areaName} (Koordinat: ${location?.lat}, ${location?.lng})` : `Lokasi saya (Koordinat): ${location?.lat}, ${location?.lng}`}.
      ${radius ? `BATASAN MUTLAK: Radius pencarian MAKSIMAL ${radius} km dari koordinat tersebut. JANGAN mencari atau memberikan hasil di luar radius ini.` : ''}
      Saya adalah sales yang sedang mencari klien baru.
      
      ${isAiRecommendation 
        ? "Tolong rekomendasikan target industri terbaik di area ini untuk produk HRIS, lalu carikan daftar prospeknya." 
        : `Tolong carikan daftar: ${categoryLabel}. Gunakan search query spesifik: "${searchContext}".`
      }
      
      Pilih tempat-tempat yang potensial untuk didatangi langsung (canvas).
      Usahakan cari tempat yang 'HOT' (Perusahaan besar, Kantor Pusat, Pabrik) jika memungkinkan.
      
      Untuk setiap tempat, berikan strategi pendekatan singkat.
      JANGAN LUPA blok JSON di akhir dengan detail lengkap (alamat, telp, rating, lat/lng, analisis).
    `;

    const response = await callGemini(model, prompt, {
      systemInstruction,
      tools,
      toolConfig: location ? {
        retrievalConfig: {
          latLng: {
            latitude: location.lat,
            longitude: location.lng,
          },
        },
      } : undefined,
    });

    const markdownText = response.text || "Tidak ada strategi khusus yang tersedia, namun lokasi telah ditemukan.";
    
    // Extract Details from JSON block
    let detailedPlaces: any[] = [];
    try {
      const jsonMatch = markdownText.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[1];
        detailedPlaces = JSON.parse(jsonStr);
      } else {
        // Try to find any array-like structure if markdown block is missing
        const arrayMatch = markdownText.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (arrayMatch) {
          detailedPlaces = JSON.parse(arrayMatch[0]);
        }
      }
    } catch (e) {
      console.warn("Failed to parse detailed JSON from AI response", e);
    }
    
    // Extract places from grounding chunks (Source of Truth for existence and location)
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const rawPlaces: { uri: string, title: string }[] = [];

    chunks.forEach((chunk: any) => {
      if (chunk.maps?.uri && chunk.maps?.title) {
        // Avoid duplicates
        if (!rawPlaces.some(p => p.uri === chunk.maps.uri)) {
          rawPlaces.push({
            uri: chunk.maps.uri,
            title: chunk.maps.title,
          });
        }
      }
    });

    // Generate a safe unique ID
    const generateId = () => {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      return `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    };

    const stops: CanvasStop[] = [];

    // Prioritize real places from Google Maps grounding
    if (rawPlaces.length > 0) {
      rawPlaces.forEach((place, index) => {
        // Find matching detail from JSON to enrich the real place data
        const detail = detailedPlaces.find(d => 
          d.name.toLowerCase().includes(place.title.toLowerCase()) || 
          place.title.toLowerCase().includes(d.name.toLowerCase())
        ) || {};

        let lat: number | undefined;
        let lng: number | undefined;

        // Extract real coordinates from Google Maps URI
        try {
          let match = place.uri.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
          if (!match) match = place.uri.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
          if (!match) match = place.uri.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
          if (match) {
            lat = parseFloat(match[1]);
            lng = parseFloat(match[2]);
          }
        } catch (e) {}

        // If we still don't have lat/lng, try JSON as last resort (though we removed it from prompt)
        if (!lat || !lng) {
          lat = detail.latitude;
          lng = detail.longitude;
        }

        let distance: number | undefined;
        if (location && lat && lng) {
          distance = calculateDistance(location, { lat, lng });
        }

        const score = analyzeLeadPotential(place.title, industries.map(i => i.id));

        stops.push({
          id: `stop-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`,
          title: place.title, // Use real title from Maps
          uri: place.uri,     // Use real URI from Maps
          status: 'pending',
          notes: '',
          selected: true,
          lat,
          lng,
          distance,
          score,
          category: detail.category || 'Business',
          address: detail.address || '',
          phone: detail.phone || '',
          website: detail.website || '',
          rating: detail.rating,
          absenkuAnalysis: detail.absenkuAnalysis || 'Potensial untuk ditawarkan solusi absensi digital.'
        });
      });
    } else {
      // Fallback if grounding chunks are empty (highly likely hallucinated, but we show it anyway)
      detailedPlaces.forEach((detail, index) => {
        let lat = detail.latitude;
        let lng = detail.longitude;
        let distance: number | undefined;
        if (location && lat && lng) {
          distance = calculateDistance(location, { lat, lng });
        }
        const score = analyzeLeadPotential(detail.name, industries.map(i => i.id));

        stops.push({
          id: `stop-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`,
          title: detail.name,
          uri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detail.name + " " + (detail.address || ''))}`,
          status: 'pending',
          notes: '',
          selected: true,
          lat,
          lng,
          distance,
          score,
          category: detail.category || 'Business',
          address: detail.address || '',
          phone: detail.phone || '',
          website: detail.website || '',
          rating: detail.rating,
          absenkuAnalysis: detail.absenkuAnalysis || 'Potensial untuk ditawarkan solusi absensi digital.'
        });
      });
    }

    // SORTING & FILTERING
    let finalStops = stops;
    
    if (location) {
      if (radius) {
        // Filter out stops that are way outside the radius (e.g., > radius * 1.5)
        // This prevents leads from other cities/islands if the AI hallucinates
        const maxAllowedDistance = radius * 1.5; // 50% buffer for edge cases
        finalStops = finalStops.filter(stop => {
          if (stop.distance !== undefined) {
            return stop.distance <= maxAllowedDistance;
          }
          return true; // Keep if distance couldn't be calculated
        });
      }

      finalStops.sort((a, b) => {
        if (a.distance !== undefined && b.distance !== undefined) {
          return a.distance - b.distance;
        }
        if (a.distance !== undefined) return -1;
        if (b.distance !== undefined) return 1;
        return 0;
      });
    }

    if (finalStops.length === 0 && !response.text) {
       throw new Error("AI tidak dapat menemukan lokasi spesifik di peta dalam radius tersebut. Coba perluas area atau ganti kata kunci.");
    }

    return {
      id: generateId(),
      timestamp: Date.now(),
      industries,
      customQuery: customQueryText,
      markdownText,
      stops: finalStops,
      isSaved: false
    };

  } catch (error: any) {
    console.error("Error generating canvas route:", error);
    const msg = error?.message || "Terjadi kesalahan saat menghubungi AI.";
    const err = new Error(msg) as any;
    if (error?.retryAfterSeconds != null) {
      err.retryAfterSeconds = error.retryAfterSeconds;
    }
    if (error?.isRateLimitError) {
      err.isRateLimitError = true;
    }
    if (error?.model) {
      err.model = error.model;
    }
    if (error?.code != null) {
      err.code = error.code;
    }
    if (error?.status != null) {
      err.status = error.status;
    }
    throw err;
  }
};

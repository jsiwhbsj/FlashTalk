export type GeminiChatModel = 'gemini-4-argon' | 'gemini-3.8-flash' | 'gemini-3.1-flash-lite';

export interface ChatTurn {
  role: 'user' | 'model';
  text: string;
}

export async function sendGeminiChatMessage(params: {
  messages: ChatTurn[];
  model: GeminiChatModel;
  systemInstruction: string;
}): Promise<{ text: string; model: string }> {
  const response = await fetch('/api/gemini/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to get AI response');
  }
  return data;
}

export async function analyzeImageWithGemini(params: {
  imageBase64: string;
  mimeType: string;
  prompt: string;
}): Promise<{ text: string; model: string }> {
  const response = await fetch('/api/gemini/analyze-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to analyze image');
  }
  return data;
}

export async function synthesizeSpeechWithGemini(params: {
  text: string;
  voiceName?: 'Kore' | 'Puck' | 'Zephyr' | 'Charon' | 'Fenrir';
  style?: string;
}): Promise<{ audioBase64: string; mimeType: string }> {
  const response = await fetch('/api/gemini/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to synthesize speech');
  }
  return data;
}

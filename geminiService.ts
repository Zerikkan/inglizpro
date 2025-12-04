import { GoogleGenAI, Type, Modality } from "@google/genai";
import { QuizQuestion, VocabCard } from './types';

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Chat Service ---
export const sendChatMessage = async (history: {role: string, parts: {text: string}[]}[], newMessage: string) => {
  try {
    const model = 'gemini-2.5-flash';
    const chat = ai.chats.create({
      model: model,
      history: history,
      config: {
        systemInstruction: "You are a friendly and professional English language tutor for an Uzbek speaker. Your goal is to help the user practice English conversation. Correct their grammar mistakes gently at the end of your response. Explain difficult concepts in Uzbek if asked. Keep responses concise and encouraging.",
      }
    });

    const result = await chat.sendMessage({ message: newMessage });
    return result.text;
  } catch (error) {
    console.error("Chat error:", error);
    throw error;
  }
};

// --- Lesson Generation ---
export const generateLessonContent = async (topic: string, level: string) => {
  try {
    const prompt = `Create a structured English lesson about "${topic}" for a ${level} level student. 
    The lesson should be in Markdown format.
    Include:
    1. Introduction (in Uzbek and English)
    2. Key Rules/Grammar
    3. Examples
    4. Common Mistakes
    5. Summary.
    Keep the tone educational.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Lesson generation error:", error);
    return "Darsni yuklashda xatolik yuz berdi. Iltimos qayta urinib ko'ring.";
  }
};

// --- Quiz Generation ---
export const generateQuiz = async (topic: string): Promise<QuizQuestion[]> => {
  try {
    const prompt = `Generate 5 multiple-choice questions about English grammar/vocabulary related to: "${topic}".
    Return ONLY valid JSON.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctAnswer: { type: Type.INTEGER, description: "Index of the correct answer (0-3)" },
              explanation: { type: Type.STRING, description: "Explanation in Uzbek" }
            },
            required: ["question", "options", "correctAnswer", "explanation"]
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as QuizQuestion[];
    }
    return [];
  } catch (error) {
    console.error("Quiz generation error:", error);
    return [];
  }
};

// --- Vocabulary & Image Generation ---
export const generateVocabCard = async (word: string): Promise<VocabCard> => {
  try {
    // 1. Get Definition and Context
    const textPrompt = `Define the English word "${word}". Provide: 1. Definition (Uzbek translation). 2. A simple English example sentence. Return JSON.`;
    
    const textResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: textPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            definition: { type: Type.STRING },
            example: { type: Type.STRING }
          }
        }
      }
    });
    
    const textData = JSON.parse(textResponse.text || "{}");

    // 2. Generate Image (Visual Mnemonic)
    let imageUrl = '';
    try {
      const imageResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image', // Using standard image model
        contents: {
          parts: [{ text: `A clear, cartoon-style educational illustration representing the word: "${word}"` }]
        },
        config: {
          // No responseMimeType for image model
        }
      });

      // Extract image
      for (const part of imageResponse.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
            imageUrl = `data:image/png;base64,${part.inlineData.data}`;
            break;
        }
      }
    } catch (e) {
      console.warn("Image gen failed, using placeholder", e);
      imageUrl = `https://picsum.photos/seed/${word}/400/300`;
    }

    return {
      word,
      definition: textData.definition || "Topilmadi",
      example: textData.example || "Misol mavjud emas",
      imageUrl: imageUrl || `https://picsum.photos/seed/${word}/400/300`
    };

  } catch (error) {
    console.error("Vocab error:", error);
    throw error;
  }
};

// --- Text to Speech (TTS) ---
export const generateSpeech = async (text: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Puck' }, // 'Puck' is usually clear for education
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio || null;
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
};

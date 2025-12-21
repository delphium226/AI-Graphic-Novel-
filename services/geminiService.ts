import { GoogleGenAI, Modality, Type } from "@google/genai";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const analyseImageAndWriteStory = async (base64Image: string, tone: string, hint?: string) => {
  const ai = getAI();
  const imageData = base64Image.split(',')[1];
  
  const hintSection = hint ? `\nThe user has provided a narrative direction/hint: "${hint}". Incorporate this direction into the story naturally.` : "";
  
  const prompt = `Analyse this image in detail. Then:
  1. Generate a compelling, atmospheric title for the story (max 5 words).
  2. Ghostwrite a compelling, evocative opening paragraph (approx 60-80 words) for a story set in this world.
  3. Provide a "visualPrompt": This MUST be a concise description of the scene exactly as it is depicted in the story paragraph you just wrote. Use the uploaded image as a structural reference for setting and characters, but if your story adds elements (like magic effects, specific objects, or weather), include them in this description.
  
  IMPORTANT: The story MUST be written in a ${tone.toUpperCase()} tone. ${hintSection}
  
  All text MUST be written in British English (UK spelling), for example using 'colour' instead of 'color', 'grey' instead of 'gray', and 'analysed' instead of 'analyzed'.
  
  Return the response in a clear JSON format with keys: "story", "title", and "visualPrompt". 
  The story should be immersive, literary, and perfectly reflect the requested ${tone} style.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: [{
      parts: [
        { inlineData: { data: imageData, mimeType: 'image/png' } },
        { text: prompt }
      ]
    }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          story: { type: Type.STRING },
          title: { type: Type.STRING },
          visualPrompt: { type: Type.STRING }
        },
        required: ["story", "title", "visualPrompt"]
      }
    }
  });

  return JSON.parse(response.text || '{}');
};

export const extendStory = async (base64Image: string, fullStory: string, tone: string) => {
  const ai = getAI();
  const imageData = base64Image.split(',')[1];

  const prompt = `Continue the following story based on the attached image. Maintain the ${tone.toUpperCase()} tone. 
  Write a single, evocative paragraph (approx 40-50 words) that advances the plot or deepens the atmosphere.
  
  All text MUST be written in British English (UK spelling).
  
  Also provide a "visualPrompt": a short description of a new scene based on this new paragraph.
  
  Current Story:
  "${fullStory}"
  
  Return the response in JSON format with "nextPart" and "visualPrompt" keys. Ensure the JSON is valid.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: [{
      parts: [
        { inlineData: { data: imageData, mimeType: 'image/png' } },
        { text: prompt }
      ]
    }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          nextPart: { type: Type.STRING },
          visualPrompt: { type: Type.STRING }
        },
        required: ["nextPart", "visualPrompt"]
      }
    }
  });

  return JSON.parse(response.text || '{}');
};

export const generateStoryImage = async (originalImageBase64: string, visualPrompt: string, styleInstruction: string) => {
  const ai = getAI();
  const imageData = originalImageBase64.split(',')[1];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{
        parts: [
          {
            inlineData: {
              data: imageData,
              mimeType: 'image/png',
            },
          },
          {
            text: `ARTISTIC STYLE MANDATE: ${styleInstruction}

SUBJECT MATTER: ${visualPrompt}

INSTRUCTIONS: Use the attached image ONLY for spatial composition and structural reference. 
COMPLETELY IGNORE the original artistic style, lighting, and colour palette of the attached image. 
STRICTLY APPLY the requested style "${styleInstruction}" to the entire scene. 
The final image MUST depict the "SUBJECT MATTER" exactly as described, maintaining the basic layout of the attached reference.`,
          },
        ],
      }]
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (err) {
    console.error("Gemini Image Generation Error:", err);
  }
  return null;
};

export const generateNarration = async (text: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Read this story as a soothing, elderly British English gentleman. Speak with a deep, resonant, and cinematic tone. Capture the profound emotion and atmospheric gravity of the prose: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Charon' },
        },
      },
    },
  });

  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
};
import { GoogleGenAI, Modality, Type } from "@google/genai";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const analyseImageAndWriteStory = async (base64Image: string, tones: string[], hint?: string) => {
  const ai = getAI();
  const imageData = base64Image.split(',')[1];
  
  const toneString = tones.join(', ');
  const hintSection = hint ? `\nUser narrative direction: "${hint}".` : "";
  
  const prompt = `Analyse this image in detail and write a story opening.
  1. Title: Compelling, atmospheric (max 5 words).
  2. Story: Opening paragraph (60-80 words).
  3. Visual Reference: A detailed DYNAMIC storyboard prompt for the next scene. 
     Include: 
     - A specific cinematic camera angle (e.g., Low Angle, Wide Shot, Dutch Angle).
     - Character's new dynamic pose or action.
     - Lighting and environmental shifts.
  
  MANDATORY TONE BLEND: Weave these atmospheric tones together seamlessly: ${toneString}.
  ${hintSection}
  
  Return JSON with "story", "title", and "visualPrompt". Use British English.`;

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

export const extendStory = async (base64Image: string, fullStory: string, tones: string[]) => {
  const ai = getAI();
  const imageData = base64Image.split(',')[1];
  const toneString = tones.join(', ');

  const prompt = `Continue this story. BLENDED TONE: ${toneString}.
  Write 60-80 words advancing the plot or introducing a new location.
  Provide a NEW cinematic visualPrompt that describes a sequence different from the previous one.
  
  REQUIREMENT: Specify a NEW camera angle and a NEW physical action for the characters to ensure the visual sequence is dynamic and progressive.
  
  Current Context: "${fullStory}"
  
  Return JSON with "nextPart" and "visualPrompt".`;

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

export const generateStoryImage = async (referenceImageBase64: string, visualPrompt: string, stylePrompts: string[]) => {
  const ai = getAI();
  const imageData = referenceImageBase64.split(',')[1];
  const combinedStyle = stylePrompts.join(" Blend this aesthetic with: ");

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: [{
        parts: [
          { inlineData: { data: imageData, mimeType: 'image/png' } },
          { text: `ART STYLE MANDATE: ${combinedStyle}
          
DYNAMIC SCENE DESCRIPTION: ${visualPrompt}

STRICT CONTINUITY & DYNAMIC SHIFT RULES:
1. CHARACTER IDENTITY: Replicate character facial features, hair, and clothing EXACTLY from the REFERENCE IMAGE.
2. POSE & PERSPECTIVE: DO NOT duplicate the pose or camera angle of the reference image. The character must be in a DIFFERENT pose and the camera must be at a DIFFERENT angle as specified in the DYNAMIC SCENE DESCRIPTION.
3. COMPOSITION: Change the layout of the scene to create a sense of movement and progression.
4. 16:9 aspect ratio.` }
        ]
      }],
      config: {
        imageConfig: {
          aspectRatio: "16:9",
          imageSize: "1K"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
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
    contents: [{ parts: [{ text: `Read with a cinematic, atmospheric deep tone: ${text}` }] }],
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

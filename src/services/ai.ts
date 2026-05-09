import { GoogleGenAI } from "@google/genai";
import { AppNode, CustomNodeData } from "../store/useStore";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateImage(prompt: string, contextNodes?: AppNode[], modelName: string = 'gemini-2.5-flash-image'): Promise<string> {
  let finalPrompt = prompt;
  
  if (contextNodes && contextNodes.length > 0) {
    const identityNodes = contextNodes.filter(n => n.data.type === 'identity');
    const otherNodes = contextNodes.filter(n => n.data.type !== 'identity');

    if (identityNodes.length > 0) {
      const identityContext = identityNodes.map(n => n.data.prompt).filter(Boolean).join(" | ");
      finalPrompt = `${prompt}. MANDATORY VISUAL IDENTITY & STYLE GUIDELINES: ${identityContext}`;
    }

    if (otherNodes.length > 0) {
      const contextData = otherNodes.map(n => n.data.prompt || n.data.content || n.data.title).join(", ");
      finalPrompt = `${finalPrompt}. Additional context to consider: ${contextData}`;
    }
  }

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          {
            text: finalPrompt,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
          imageSize: "1K"
        },
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const base64EncodeString: string = part.inlineData.data;
        return `data:image/png;base64,${base64EncodeString}`;
      }
    }
    throw new Error("No image generated");
  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
}

export async function processPromptWithContext(prompt: string, selectedNodes: AppNode[], edges: any[], modelName: string = "gemini-3.1-flash-lite"): Promise<string> {
  const contextStr = JSON.stringify({
    selectedNodes: selectedNodes.map(n => n.data),
    edges,
  }, null, 2);

  const fullContent = `
You are an AI assistant in a node-based visual editor (like an infinite whiteboard).
The user is selecting some nodes, and asking you a question or giving a command.
Here is the JSON context of the selected nodes and their edges:

${contextStr}

User Prompt: ${prompt}

Provide a helpful, concise response. If the user asks you to generate ideas, give them in plain text or markdown.
`;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: fullContent,
    });
    return response.text || "No response generated";
  } catch (error) {
    console.error("Error processing text:", error);
    throw error;
  }
}

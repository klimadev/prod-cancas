import { GoogleGenAI } from "@google/genai";
import { AppNode, CustomNodeData } from "../store/useStore";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateImage(prompt: string, contextNodes?: AppNode[], modelName: string = 'gemini-3.1-flash-image-preview'): Promise<string> {
  const parts: any[] = [];
  
  if (contextNodes && contextNodes.length > 0) {
    const identityNodes = contextNodes.filter(n => n.data.type === 'identity');
    const otherNodes = contextNodes.filter(n => n.data.type !== 'identity');

    let contextualPrompt = "";

    if (identityNodes.length > 0) {
      const identityContext = identityNodes.map(n => n.data.prompt || n.data.content).filter(Boolean).join(" | ");
      contextualPrompt += `BRAND IDENTITY & STYLE: ${identityContext}\n`;
    }

    if (otherNodes.length > 0) {
      contextualPrompt += "USER GRAPH CONTEXT:\n";
      for (const node of otherNodes) {
        if (node.data.type === 'aiImage' && node.data.imageUrl) {
          // Extract base64 from data URL
          const base64Data = node.data.imageUrl.split(',')[1];
          if (base64Data) {
            parts.push({
              inlineData: {
                data: base64Data,
                mimeType: "image/png"
              }
            });
            contextualPrompt += `- [IMAGE NODE: ${node.data.title}]\n`;
          }
        } else {
          const content = node.data.prompt || node.data.content || node.data.title;
          contextualPrompt += `- [NODE: ${node.data.title}]: ${content}\n`;
        }
      }
    }
    
    parts.push({ text: `${contextualPrompt}\n\nFINAL INSTRUCTION: ${prompt}` });
  } else {
    parts.push({ text: prompt });
  }

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ role: 'user', parts }]
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

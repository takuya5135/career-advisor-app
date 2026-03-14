import { GoogleGenerativeAI, SchemaType, Schema } from "@google/generative-ai";

const schema: Schema = {
  description: "Career information extracted from a conversation",
  type: SchemaType.OBJECT,
  properties: {
    skills: {
      type: SchemaType.ARRAY,
      description: "List of technical or professional skills",
      items: { type: SchemaType.STRING },
    },
    experience: {
      type: SchemaType.ARRAY,
      description: "List of work experiences or projects",
      items: { type: SchemaType.STRING },
    },
    education: {
      type: SchemaType.ARRAY,
      description: "Educational background",
      items: { type: SchemaType.STRING },
    },
    strengths: {
      type: SchemaType.ARRAY,
      description: "User's strengths or soft skills",
      items: { type: SchemaType.STRING },
    },
    goals: {
      type: SchemaType.ARRAY,
      description: "Career goals or aspirations",
      items: { type: SchemaType.STRING },
    },
  },
};

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "API key is not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    const { messages } = await req.json();
    
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const prompt = `以下のチャット履歴から、ユーザーのキャリアに関連する情報（スキル、経験、学歴、強み、目標）を抽出し、JSON形式で出力してください。
まだ情報が不十分な項目は空の配列にしてください。

履歴：
${messages.map((m: any) => `${m.role}: ${m.content}`).join("\n")}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return new Response(text, {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Extraction error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

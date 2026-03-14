import { GoogleGenerativeAI, SchemaType, Schema } from "@google/generative-ai";

export const runtime = "edge";

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
      model: "gemini-2.0-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const prompt = `以下のチャット履歴から、ユーザーのキャリアに関連する情報を抽出してください。

【抽出ルール】
- skills: ユーザーが持つスキル・使用技術・ツール・資格など（例: "Python", "プロジェクト管理", "Excel")
- experience: 職務経歴・勤務先・担当業務・プロジェクト（例: "株式会社〇〇 営業部門 5年勤務", "ECサイトのリニューアルプロジェクトを主導")
- education: 学歴・卒業校・専攻など（例: "〇〇大学 経済学部 卒業")
- strengths: 強み・得意なこと・自己PR（例: "数値分析が得意", "チームをまとめるリーダーシップ")
- goals: キャリア目標・転職理由・希望職種（例: "マーケティング職に転換したい", "年収500万以上を目指す")
- 情報がない項目は必ず空の配列 [] を返すこと
- ユーザーの発言から情報を抽出すること（AIの発言は参考程度）

チャット履歴：
${messages.map((m: any) => `[${m.role === 'user' ? 'ユーザー' : 'AI'}]: ${m.content}`).join("\n")}`;

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

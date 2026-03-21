import { GoogleGenerativeAI, SchemaType, Schema } from "@google/generative-ai";

export const runtime = "edge";

const schema: Schema = {
  description: "Career information extracted from a conversation",
  type: SchemaType.OBJECT,
  properties: {
    name: {
      type: SchemaType.STRING,
      description: "ユーザーの名前",
    },
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
    const { messages, existingData } = await req.json();

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.1,
      },
    });

    const prompt = `あなたは極めて優秀なキャリアコンサルタント兼データ抽出AIです。
以下のチャット履歴を精査し、ユーザーのキャリアに関する情報を「漏れなく、ダブリなく（MECE）」抽出してください。

【抽出の最重要ルール】
1. **網羅性の確保**: 履歴の「隅から隅まで」を精査してください。ユーザーがさらっと触れた小さな実績やスキル、特定のプロジェクトでの具体的な役割も見逃さないでください。
2. **情報の具体性**: 「営業をしていた」といった抽象的な表現ではなく、「〇〇業界向けに新規開拓営業を行い、半年で目標の120%を達成した」といった、具体的で厚みのある内容を可能な限り抽出してください。
3. **情報の厚み（ペラペラ化の防止）**: 情報を簡略化しすぎず、ユーザーが語ったエピソードや苦労した点、工夫した点なども含めてください。
4. **既存データとの統合**: 既に抽出済みのデータ（既存データ）がある場合、それらと今回の履歴を照らし合わせ、不足している具体情報を補完し、より詳細な方に更新してください。既存の具体的情報を消して抽象化することは絶対に避けてください。
5. **推測の禁止**: チャット内に事実として存在する情報のみを抽出してください。捏造は厳禁です。

【カテゴリー別の抽出ルール】
- skills: 資格、使用ツール、プログラミング言語、ソフトスキル、専門知識
- experience: 具体的かつ詳細な職務内容・実績・プロジェクト（一文を長く具体的に）
- education: 出身校、学部、専攻、留学経験
- strengths: 強み、価値観
- goals: キャリアゴール、希望条件

【既存のデータ】
${existingData ? JSON.stringify(existingData, null, 2) : "なし"}

【今回のチャット履歴】
${messages.map((m: any) => `[${m.role === 'user' ? 'ユーザー' : 'AI'}]: ${m.content}`).join("\n")}

上記の既存データと今回のチャット履歴から、最新かつ最も網羅的なキャリア情報をJSON形式で出力してください。`;

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

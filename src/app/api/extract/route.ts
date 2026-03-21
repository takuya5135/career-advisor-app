import { GoogleGenerativeAI, SchemaType, Schema } from "@google/generative-ai";

export const runtime = "edge";

const schema: Schema = {
  description: "Career information extracted from a conversation",
  type: SchemaType.OBJECT,
  properties: {
    name: {
      type: SchemaType.STRING,
      description: "ユーザーの名前（苗字、名前、フルネーム、ニックネームなど）",
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
    const { messages } = await req.json();

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.0, // RAG準拠: ハルシネーションを絶対に防ぐためのゼロ温度設定
      },
    });

    const prompt = `あなたは極めて優秀なキャリアコンサルタント兼データ抽出AIです。
以下の膨大なチャット履歴の「隅から隅まで」を徹底的に精査し、ユーザーのキャリアに関する情報を一滴も漏らさずに抽出してください。

【RAG（検索拡張生成）の絶対原則】
抽出する文言は、チャット内でユーザーが「実際に発言した事実」をそのまま抽出するか、事実から逸脱しない範囲でのみ要約してください。
推測、一般論、世間的な職務からの推認（例: 「経理だから日商簿記を持っているだろう」「営業だからコミュニケーション能力があるだろう」など）や架空の成果・資格の捏造は**絶対に行わない**でください。チャット内で言及のない資格やスキルは断固として含めないでください。

【抽出の最優先事項】
- 過去の会話のどこか一箇所でも触れられた情報は必ず拾い上げてください（学歴、資格、小さなスキル、将来の展望など）。
- 履歴が長い場合でも、最初から最後まで同様の精度で確認してください。
- ユーザーが無意識に語った過去の成功体験や、具体的な業務内容も含めてください。

【カテゴリー別の抽出ルール】
- name: ユーザーから伝えられた名前、苗字、ニックネーム（例: "山田です", "タロウと呼んでください"）
- skills: 資格、使用ツール、プログラミング言語、ソフトスキル、専門知識（例: "日商簿記2級", "React", "リーダーシップ", "法務知識")
- experience: 具体的かつ詳細な職務内容（例: "株式会社ABCでの3年間の営業活動", "新規事業の立ち上げリーダー", "顧客満足度を20%向上させた施策")
- education: 出身校、学部、専攻、留学経験など（例: "〇〇大学 日本文学科 卒業", "カリフォルニア大学への交換留学")
- strengths: 本人が自覚している、あるいは会話の中で見えてきた強み（例: "粘り強い交渉力", "複雑な問題を整理する能力")
- goals: 転職の動機、希望する職種・年収、実現したいライフスタイル（例: "ワークライフバランスの改善", "PM職へのキャリアチェンジ")

【出力形式】
- 全ての項目は文字列の配列 [] で返してください。
- 該当する情報が一切見つからない場合のみ空の配列 [] を返してください。

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

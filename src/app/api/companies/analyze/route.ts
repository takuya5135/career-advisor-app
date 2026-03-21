import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export const runtime = "edge";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro-exp-03-25" });

export async function POST(req: Request) {
  try {
    const { company, careerData } = await req.json();

    const prompt = `
あなたはプロのキャリアアドバイザーです。ユーザーのキャリアデータと、志望企業の情報を比較し、客観的かつ建設的な相性分析を行ってください。

【ユーザーのキャリアデータ】
スキル: ${careerData.skills?.join(", ") || "未登録"}
経験: ${careerData.experience?.join("\n") || "未登録"}
学歴: ${careerData.education?.join("\n") || "未登録"}
強み: ${careerData.strengths?.join(", ") || "未登録"}
目標: ${careerData.goals?.join(", ") || "未登録"}

【志望企業の情報】
企業名: ${company.name}
業界: ${company.industry || "未登録"}
求人内容: ${company.jobDescription || "未登録"}
企業理念・活動: ${company.corporatePhilosophy || "未登録"}

【分析ルール】
1. マッチングスコア (0-100): ユーザーのスキルや経験が、求人要件や企業文化にどれだけ合致しているかを数値化。
2. 合致ポイント (3-5つ): 具体的にどの経験やスキルが評価されるか、または理念にどう共感できるか。
3. 不足・懸念点 (2-4つ): 現状で足りないスキル、面接で突っ込まれそうなポイント、または入社後のミスマッチリスク。

回答は必ず以下のJSON形式で返してください（Markdownなし、純粋なJSONのみ）。
{
  "score": 数値,
  "reasons": ["理由1", "理由2", ...],
  "gaps": ["懸念点1", "懸念点2", ...]
}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // JSONの抽出（念のため）
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : text;
    const analysis = JSON.parse(jsonStr);

    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Company analysis error:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}

import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export const runtime = "edge";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro-exp-03-25" });

export async function POST(req: Request) {
  try {
    const { company, careerData } = await req.json();

    const prompt = `
あなたは転職のプロフェッショナルです。ユーザーと特定の志望企業の情報をもとに、選考を突破するための「個別対策ドキュメント」を作成してください。

【ユーザーの経歴】
スキル: ${careerData.skills?.join(", ")}
経験: ${careerData.experience?.join("\n")}
強み: ${careerData.strengths?.join(", ")}

【志望企業】
企業名: ${company.name}
求人内容: ${company.jobDescription}
理念・活動: ${company.corporatePhilosophy}

【作成依頼】
1. 自己PR案: ユーザーの経歴の中で、この企業の募集要項に最も刺さる要素を強調した、具体的で説得力のある自己PRを作成してください。
2. 想定QA: この企業の文化や求人内容から、面接で聞かれそうな質問を3つ挙げ、それに対するユーザーの経歴を活かした最良の回答案を提示してください。
3. 逆質問: 募集職種や企業理念を踏まえ、意欲が高いことをアピールしつつ、入社後のミスマッチを防ぐための質の高い「こちらからの質問」を3つ提案してください。

回答は必ず以下のJSON形式で返してください（Markdownなし、純粋なJSONのみ）。
{
  "selfPR": "...",
  "interviewQA": "問1: ...\\n答: ...\\n\\n問2: ...\\n答: ...",
  "reverseQuestions": "1. ...\\n2. ...\\n3. ..."
}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // JSONの抽出
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : text;
    const strategy = JSON.parse(jsonStr);

    return NextResponse.json(strategy);
  } catch (error) {
    console.error("Strategy generation error:", error);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}

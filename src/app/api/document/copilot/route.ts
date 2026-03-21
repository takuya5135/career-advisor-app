import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ 
  model: "gemini-2.0-flash", // 高精度かつ高速なflashモデルを使用
  generationConfig: {
    temperature: 0.2, // 創作性を抑えつつ、ある程度の自然な言い回しを許可
    topP: 0.95,
  }
});

export async function POST(req: NextRequest) {
  try {
    const { documentType, content, careerData, instruction } = await req.json();

    if (!content && !careerData) {
      return NextResponse.json({ error: "No context provided" }, { status: 400 });
    }

    const systemInstruction = `
あなたはプロのキャリアコンサルタントおよび履歴書執筆の専門家です。
ユーザーの「キャリアデータ（事実）」に基づき、指定された種類の書類（職務経歴書、自己PR等）の作成・添削を支援してください。

【重要なルール】
1. 事実に基づかない経歴（ハルシネーション）を創作しないでください。キャリアデータにない情報は書かないでください。
2. 日本のビジネス習慣に適した、プロフェッショナルで謙虚ながらも自信の伝わる表現を用いてください。
3. 文末は「です・ます」調で統一してください。
4. Markdown形式で出力してください。

【現在のコンテキスト】
- 書類の種類: ${documentType}
- 指示内容: ${instruction || "続きを執筆するか、よりプロフェッショナルな表現に整えてください。"}

【ユーザーのキャリアデータ】
${JSON.stringify(careerData, null, 2)}

【現在のエディタ上の内容】
${content}
    `;

    const prompt = `
上記のコンテキストとキャリアデータを踏まえ、エディタ上の内容を改善または続きを執筆してください。
返答は、書き換えた後の「修正後の本文（Markdown）」のみを返してください。解説や「承知いたしました」といった挨拶は一切不要です。
    `;

    const result = await model.generateContent([systemInstruction, prompt]);
    const response = await result.response;
    let text = response.text();

    // 不要なMarkdownフェンスが含まれている場合は除去
    text = text.replace(/^```markdown\n/, "").replace(/^```\n/, "").replace(/\n```$/, "");

    return NextResponse.json({ suggestion: text });
  } catch (error) {
    console.error("Copilot API Error:", error);
    return NextResponse.json({ error: "Failed to generate suggestion" }, { status: 500 });
  }
}

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

    const documentTypeMap: { [key: string]: string } = {
      resume: "職務経歴書",
      cv: "履歴書",
      self_pr: "自己PR",
      cover_letter: "志望動機",
      other: "書類",
    };

    const prompt = `あなたはプロのキャリアコンサルタントおよび履歴書執筆の専門家（就職活動アドバイザー）です。
ユーザーが作成中の「${documentTypeMap[documentType] || '書類'}」の執筆をサポートしてください。

### ユーザーのキャリアデータ (My Note):
${JSON.stringify(careerData, null, 2)}

### 現在の執筆内容:
${content}

### 追加の指示:
${instruction || "続きを執筆するか、よりプロフェッショナルな表現に整えてください。"}

### 重要なルール:
1. 事実に基づかない経歴（ハルシネーション）を創作しないでください。キャリアデータにない情報は書かないでください。
2. あなたの回答はドキュメントにそのまま貼り付けられる「本文の続き」または「修正案」として、Markdown形式で出力してください。
3. 履歴書 (cv) や職務経歴書 (resume) を作成している場合、一般的なフォーマットとして以下の項目が不足していないか確認してください。
   - 氏名、ふりがな、生年月日、住所、電話番号、メールアドレス
4. もし **My Note にこれらの基本情報が不足している場合** は、本文の提案の最後に「(補足：履歴書を完成させるには住所や生年月日などの情報が足りません。マイノートを更新するか、こちらに記載いただければ反映します)」といったメッセージを添えてください。
5. プロフェッショナルで誠実なトーンを保ってください。
6. 余計な前置き（「承知しました」「こちらが提案です」など）は一切不要です。直接内容を書き始めてください。
`;

    const result = await model.generateContent([prompt]);
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

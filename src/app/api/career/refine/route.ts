import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { data } = await req.json();

    if (!data) {
      return NextResponse.json({ error: "No data provided" }, { status: 400 });
    }

    // AIに投げる前に、明らかに重複している文字列（完全一致）をJS側で事前に削除して負荷を減らす
    const preProcess = (arr: any) => {
      if (!Array.isArray(arr)) return [];
      return Array.from(new Set(arr))
        .map(s => String(s || "").trim())
        .filter(s => s !== "");
    };

    const optimizedData = {
      skills: preProcess(data.skills),
      experience: preProcess(data.experience),
      education: preProcess(data.education),
      strengths: preProcess(data.strengths),
      goals: preProcess(data.goals),
    };

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    
    // 出力構造の定義
    const schema: any = {
      type: SchemaType.OBJECT,
      properties: {
        skills: { 
          type: SchemaType.ARRAY, 
          items: { type: SchemaType.STRING }, 
          description: "重複を排除し、カテゴリごとに整理されたスキルのリスト（例: 'ECサイト運営（Amazon, 楽天）'）" 
        },
        experience: { 
          type: SchemaType.ARRAY, 
          items: { type: SchemaType.STRING }, 
          description: "断片的なメモを統合し、職務内容や実績としてまとめられたプロフェッショナルな文章のリスト。" 
        },
        education: { 
          type: SchemaType.ARRAY, 
          items: { type: SchemaType.STRING }, 
          description: "学歴情報を整理したリスト。" 
        },
        strengths: { 
          type: SchemaType.ARRAY, 
          items: { type: SchemaType.STRING }, 
          description: "自己PRとして使える、整理された強みのリスト。" 
        },
        goals: { 
          type: SchemaType.ARRAY, 
          items: { type: SchemaType.STRING }, 
          description: "キャリア目標や展望を整理したリスト。" 
        }
      },
      required: ["skills", "experience", "education", "strengths", "goals"]
    };

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash", 
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.0,
      },
      systemInstruction: `あなたは極めて優秀なプロフェッショナル・キャリアアドバイザー、およびデータクレンジングの専門家です。

【最重要任務】
提供されたキャリアデータから「重複」や「冗長な項目」を一掃し、洗練されたプロフェッショナルな情報へと統合・整理してください。

【整理の絶対ルール（厳守）】
1. **重複の完全な排除**: 
   - 「わずかな表記揺れ」や「実質的に同じ内容」の項目は、最も正確で詳細な1つに必ず統合してください。
2. **断片情報の統合**: 
   - 同じ勤務先、同じプロジェクト、同じ学校に関する複数の断片的なメモは、事実関係を整理して1つの詳細な説明にまとめてください。
3. **不要なラベルの削除**: 
   - 「（最終学歴）」のような不要なラベルは削除するか、適切な項目内に統合してください。
4. **プロフェッショナルな文体**: 
   - 簡潔かつ格調高い日本語を使用してください。
5. **情報の密度**: 
   - あまりに項目数が多すぎる場合は、重要な実績を優先し、類似した小さなタスクは1つの項目に要約してください。`,
    });

    const prompt = `以下の生のキャリアデータを、重複を極限まで削ぎ落とし、読みやすく洗練されたプロフェッショナルな形式に整理・要約して返却してください。\n\n【生データ】\n${JSON.stringify(optimizedData, null, 2)}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    try {
      const refinedData = JSON.parse(text);
      // メタデータ（名前など）を維持
      refinedData.name = data.name || "";
      refinedData.lastUpdated = Date.now();

      return NextResponse.json(refinedData);
    } catch (parseError) {
      console.error("JSON parsing error:", parseError, "Raw text:", text);
      return NextResponse.json({ error: "Invalid JSON response from AI" }, { status: 500 });
    }

  } catch (error: any) {
    console.error("Career refinement error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

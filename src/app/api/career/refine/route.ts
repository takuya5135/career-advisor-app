import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const { data } = await req.json();

    if (!data) {
      return NextResponse.json({ error: "No data provided" }, { status: 400 });
    }

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
      model: "gemini-2.0-flash", // 既存コードの 2.5 はタイポの可能性があるため、標準的なモデルを使用
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.1,
      },
      systemInstruction: `あなたは極めて優秀なキャリアアドバイザー、およびデータ整理のスペシャリストです。

【目的】
ユーザーの「マイノート」に蓄積された、雑多で重複の多いキャリアデータを、読みやすくプロフェッショナルな形式に「整理・要約・統合」してください。

【整理のルール】
1. **重複の徹底排除**: 内容が重複している、または非常に似ている項目（例：「ECサイト運営」と「ECサイト運用の経験」）は1つに統合してください。
2. **情報の統合**: 同じプロジェクトや職務に関する断片的なメモ（例：「SNS立ち上げ」「インスタ運用」「クックパッドも」）は、1つの意味の通る文章（「Instagramやクックパッド等のSNS立ち上げ・運用」）にまとめてください。
3. **プロフェッショナルな表現**: 箇条書きや体言止めを適切に使い、職務経歴書にそのまま引用できるような格調高い（それでいて事実に基づいた）表現に整えてください。
4. **事実の保持**: 事実（社名、数値、資格名、期間）は勝手に変えたりでっち上げたりせず、提供されたデータの範囲内で扱ってください。
5. **情報の密度**: 短すぎる項目は他の関連項目と統合し、情報の密度を高めてください。`,
    });

    const prompt = `以下のキャリアデータを整理・要約・統合してください。特に「experience」の項目が多すぎるため、重要な実績や職務内容が伝わるように適切にまとめてください。\n\n【整理前データ】\n${JSON.stringify(data, null, 2)}`;

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

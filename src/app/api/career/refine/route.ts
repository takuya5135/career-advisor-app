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
      model: "gemini-2.5-flash", 
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.0, // 決定論的な出力を優先
      },
      systemInstruction: `あなたは極めて優秀なプロフェッショナル・キャリアアドバイザー、およびデータクレンジングの専門家です。

【最重要任務】
提供されたキャリアデータから「重複」や「冗長な項目」を一掃し、洗練されたプロフェッショナルな情報へと統合・整理してください。

【整理の絶対ルール（厳守）】
1. **重複の完全な排除**: 
   - 全く同じ項目はもちろん、「わずかな表記揺れ」や「実質的に同じ内容」の項目は、最も正確で詳細な1つに必ず統合してください。
   - 例: 「1994年 関西学院高等部 卒業」と「1994年に関西学院高等部を卒業」は1つにまとめます。
2. **断片情報の統合**: 
   - 同じ勤務先、同じプロジェクト、同じ学校に関する複数の断片的なメモは、事実関係を整理して1つの論理的な項目（または1つの詳細な説明）にまとめてください。バラバラのまま残さないでください。
3. **不要なラベルの削除**: 
   - 「（最終学歴）」のようなメタ情報的なラベル自体が独立した項目として残らないよう、適切な項目（実際の学歴）の中に組み込むか、削除してください。
4. **プロフェッショナルな文体**: 
   - 職務経歴書や自己PRとしてそのまま使える、簡潔かつ格調高い日本語（体言止め、または適切な敬体）を使用してください。
5. **事実の厳守**: 
   - 存在しない年月や資格、社名を捏造（ハルシネーション）することは厳禁です。提供されたデータの範囲内で最高の結果を出してください。`,
    });

    const prompt = `以下の生のキャリアデータを、重複を極限まで削ぎ落とし、読みやすく洗練されたプロフェッショナルな形式に整理・要約して返却してください。\n\n【生データ】\n${JSON.stringify(data, null, 2)}`;

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

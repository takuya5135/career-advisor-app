import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { data } = await req.json();

    if (!data) {
      return NextResponse.json({ error: "No data provided" }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    
    // ResumeDocumentやMarkdownPreviewで直接表示できるよう、CareerDataと同等のJSON構造で出力させる
    const schema: any = {
      type: SchemaType.OBJECT,
      properties: {
        skills: { 
          type: SchemaType.ARRAY, 
          items: { type: SchemaType.STRING }, 
          description: "箇条書きで提供されたスキルやツール群を、より専門的で実績を伴う具体的な表現（『〇〇を用いた開発経験（〇年）』など）に清書したリスト。" 
        },
        experience: { 
          type: SchemaType.ARRAY, 
          items: { type: SchemaType.STRING }, 
          description: "短い単語や箇条書きで書かれた職歴・プロジェクト実績を、STAR法（状況・課題・行動・結果）などを用いて、プロの職務経歴書に載せるにふさわしい「具体的で説得力のある文章（1つの実績につき数行のしっかりした段落）」へと肉付け・拡張したリスト。" 
        },
        education: { 
          type: SchemaType.ARRAY, 
          items: { type: SchemaType.STRING }, 
          description: "学歴情報をフォーマルな表現に整えたリスト。" 
        },
        strengths: { 
          type: SchemaType.ARRAY, 
          items: { type: SchemaType.STRING }, 
          description: "ユーザーの強みや特徴を、自己PR文としてそのまま使えるレベルに論理的かつ魅力的に書き起こした文章のリスト。" 
        },
        goals: { 
          type: SchemaType.ARRAY, 
          items: { type: SchemaType.STRING }, 
          description: "今後のキャリアプランや目標を、採用担当者に響く「面接の回答（QA）や志望動機のベース」として使えるレベルに洗練させた文章のリスト。" 
        }
      },
      required: ["skills", "experience", "education", "strengths", "goals"]
    };

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
      systemInstruction: "あなたは極めて優秀なプロのキャリアコンサルタント・職務経歴書ライターです。与えられた「断片的な生の事実データ（単語レベルや短いメモ）」をもとに、ユーザーの経歴やスキルが最大限魅力的に伝わるよう、プロフェッショナルなビジネス文章（Markdownの段落として使えるレベルのしっかりしたテキスト）へと拡張・清書（Polishing）してください。事実をでっち上げることはせず、提供された情報を論理的に繋ぎ合わせ、採用担当者に響く文章に昇華させてください。"
    });

    // 生データを文字列化してプロンプトに渡す
    const prompt = `以下の生のキャリアデータ（ユーザーから抽出されたキーワードや短いメモ）を、完璧な職務経歴書・自己PR用の文章に清書してください。\n\n【生データ】\n${JSON.stringify(data, null, 2)}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    try {
      const polishedData = JSON.parse(text);
      // 元の名前などのメタデータは維持しておく
      polishedData.name = data.name;
      polishedData.lastUpdated = data.lastUpdated;

      return NextResponse.json(polishedData);
    } catch (parseError) {
      console.error("JSON parsing error:", parseError, "Raw text:", text);
      return NextResponse.json({ error: "Invalid JSON response from AI" }, { status: 500 });
    }

  } catch (error: any) {
    console.error("Document generation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

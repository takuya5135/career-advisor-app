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
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.0, // RAG準拠: 創造性を排除し事実に基づく清書のみを行う
      },
      systemInstruction: `あなたは極めて優秀なプロのキャリアコンサルタント・職務経歴書ライターです。

【絶対に守るルール（RAG準拠）】
1. 提供されたデータにない情報を「でっち上げる」（ハルシネーション）ことは絶対に禁止です。一般的な推測（例：「日商簿記2級」「〇〇%削減」「〇〇プロジェクト」など）を用いてプレースホルダーや実績を捏造してはいけません。
2. 情報が不足している場合は、提供された【事実情報】の範囲でのみ文章を作成し、不足部分は潔く省略してください。
3. 提供された事実（会社名、役職名、期間、業務内容、保有資格）は一字一句変えずに使用してください。
4. 提供されたデータが空または薄い場合は、無理に文章を膨らませず、空の配列 [] を返してください。

提供された生の【事実データ】のみを素材として、プロフェッショナルなビジネス文章へと「清書（フォーマット）」してください。文章表現の質を高めることは歓迎ですが、事実情報の追加・推論・改変は厳禁です。`,
    });

    // 入力データが薄すぎる場合は早期リターン（架空データ生成の防止）
    const hasData = data && (
      (Array.isArray(data.experience) && data.experience.length > 0) ||
      (Array.isArray(data.skills) && data.skills.length > 0) ||
      (Array.isArray(data.education) && data.education.length > 0) ||
      (Array.isArray(data.strengths) && data.strengths.length > 0) ||
      (Array.isArray(data.goals) && data.goals.length > 0)
    );

    if (!hasData) {
      return NextResponse.json({
        ...data,
        _warning: "データが不足しているため、AI清書をスキップしました。ダッシュボードの「過去の全会話からプロフィールを再構築」ボタンを押してから、再度お試しください。",
      });
    }

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

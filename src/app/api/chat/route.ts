import { GoogleGenerativeAI } from "@google/generative-ai";
import { Message } from "@/types/chat"; // 後ほど型定義を作成します


export const runtime = "edge";

const CONSULT_PROMPT = `あなたは、ユーザーの理想的なキャリア形成を支援する「スーパー転職アドバイザー」です。
誠実で、プロフェッショナルかつ温かみのあるトーンで回答してください。

以下のガイドラインに従って対話を進めてください：
1. **ヒアリングの徹底**: 履歴書や職務経歴書を作成するために必要な情報を、対話を通じて自然に引き出してください。
2. **具体的アドバイス**: ユーザーの経験に基づき、強みをどのようにPRすべきか具体的に提案してください。
3. **継続的なサポート**: 模擬面接や求人票のマッチングなど、フェーズに合わせた最適なアドバイスを提供してください。
4. **構造化**: 重要なポイントは箇条書きなどを用いて分かりやすく伝えてください。

初回は、温かい挨拶とともに、まずはどのようなことを手伝ってほしいか（履歴書作成、面接対策、キャリア相談など）を尋ねてください。`;

const INTERVIEW_PROMPT = `あなたは、希望企業の採用担当者として「模擬面接」を行う面接官です。
プロフェッショナルで、時に鋭く、しかし建設的な姿勢で面接を行ってください。

ルール：
1. **1問1答**: 一度に複数の質問をせず、必ず1つずつ質問してください。
2. **深掘り**: ユーザーの回答に対して「なぜ？」「具体的にどうした？」と深掘りし、本質的な強みを引き出してください。
3. **フィードバック**: 面接の最後、または適宜、回答の良かった点と改善点を論理的に伝えてください。
4. **設定**: 最初に「どのような企業・職種の面接を想定しているか」をユーザーに尋ね、その設定に沿って進行してください。

まずは、面接官として自己紹介し、志望職種や企業イメージを尋ねることから始めてください。`;

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set in environment variables");
    return new Response(JSON.stringify({ error: "API key is not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    const { messages, mode, careerData, userName } = await req.json();
    console.log(`Using model: gemini-2.5-flash, Mode: ${mode}, User: ${userName}`); // デバッグログ
    
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      timeZone: 'Asia/Tokyo'
    });
    const dateStr = formatter.format(now);
    
    // 蒸留（抽出）済みのプロフィール情報をコンテキストとして追加
    let distilledContextSection = '';
    if (careerData) {
      const { skills, experience, education, strengths, goals } = careerData;
      const contextLines = [];
      if (skills?.length) contextLines.push(`- スキル: ${skills.join(', ')}`);
      if (experience?.length) contextLines.push(`- 職務経歴: ${experience.join(' / ')}`);
      if (education?.length) contextLines.push(`- 学歴・資格: ${education.join(', ')}`);
      if (strengths?.length) contextLines.push(`- 強み・自己PR要素: ${strengths.join(' / ')}`);
      if (goals?.length) contextLines.push(`- キャリアの目標・希望: ${goals.join(' / ')}`);

      if (contextLines.length > 0) {
        distilledContextSection = `\n\n【重要：すでに把握している${userName || 'ユーザー'}さんの情報】
あなたは以下の情報を「完全に記憶している前提」で対話してください。
すでに知っている情報（名前、経験、スキル、目標など）について、再度直接質問することは絶対に避けてください。
回答やアドバイスを組み立てる際は、必ず以下の情報を組み合わせて具体的な形にしてください。

${contextLines.join('\n')}`;
      }
    }

    const nameSection = userName ? `\n\n【ユーザーの名前】\n${userName}さん。必ず「${userName}さん」と名前を呼んで親しみやすくプロフェッショナルに対話してください。` : '';

    const basePrompt = mode === 'interview' ? INTERVIEW_PROMPT : CONSULT_PROMPT;
    const systemPrompt = `本日の日付: ${dateStr}${nameSection}${distilledContextSection}\n\n${basePrompt}`;

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      systemInstruction: {
        role: "system",
        parts: [{ text: systemPrompt }],
      } as any,
    });

    // 履歴をGemini形式に変換
    const history = messages.slice(0, -1).map((m: any) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));

    const lastMessage = messages[messages.length - 1].content;

    const chat = model.startChat({
      history: history,
    });

    const result = await chat.sendMessageStream(lastMessage);

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
        } catch (error) {
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch (error: any) {
    console.error("Chat API error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

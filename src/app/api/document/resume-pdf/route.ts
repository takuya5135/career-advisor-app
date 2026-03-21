import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fs from "fs";
import path from "path";

/**
 * 元のPDFテンプレートにテキストを書き込んで返すAPIルート
 * POST /api/document/resume-pdf
 */
export async function POST(req: NextRequest) {
  try {
    const { careerData, content } = await req.json();

    // テンプレートPDFを読み込む（publicフォルダから）
    const templatePath = path.join(process.cwd(), "public", "rirekisho_03_A4.pdf");
    const templateBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(templateBytes);

    // フォントを登録
    pdfDoc.registerFontkit(fontkit);
    const fontPath = path.join(process.cwd(), "public", "fonts", "NotoSansJP-Regular.ttf");
    const fontBytes = fs.readFileSync(fontPath);
    const notoFont = await pdfDoc.embedFont(fontBytes);

    const pages = pdfDoc.getPages();
    const page = pages[0];
    const { height } = page.getSize();

    // === 座標ヘルパー (PDFのY座標は下から測る) ===
    const drawText = (text: string, x: number, yFromTop: number, size = 9) => {
      if (!text) return;
      page.drawText(text, {
        x,
        y: height - yFromTop,
        size,
        font: notoFont,
        color: rgb(0, 0, 0),
      });
    };

    // === 基本情報の書き込み ===
    // フリガナ
    drawText(careerData?.furigana || "", 68, 73, 8);
    // 氏名
    drawText(careerData?.name || "", 90, 96, 14);
    // 生年月日
    drawText(careerData?.birthday || "", 68, 128, 8.5);
    // 性別
    drawText(careerData?.gender || "", 380, 128, 8.5);
    // 住所
    drawText(careerData?.address || "", 430, 220, 8);
    // 電話番号
    drawText(careerData?.phone || "", 430, 247, 8);
    // メールアドレス
    drawText(careerData?.email || "", 505, 247, 7);

    // === Markdownコンテンツのパース ===
    const sections: Record<string, string[]> = {
      history: [],
      qualifications: [],
      motivation: [],
      pr: [],
      wish: [],
    };

    let currentSection = "";
    (content || "").split("\n").forEach((line: string) => {
      const l = line.trim();
      if (l.startsWith("## 学歴") || l.startsWith("## 職歴")) currentSection = "history";
      else if (l.startsWith("## 資格") || l.startsWith("## 免許")) currentSection = "qualifications";
      else if (l.startsWith("## 志望動機")) currentSection = "motivation";
      else if (l.startsWith("## 自己PR")) currentSection = "pr";
      else if (l.startsWith("## 本人希望")) currentSection = "wish";
      else if (l && !l.startsWith("#") && currentSection) {
        sections[currentSection].push(l.replace(/^[-*]\s+/, ""));
      }
    });

    // === 学歴・職歴テーブルの書き込み ===
    // 左カラム（Y座標: 265〜725 近辺に行が並ぶ, 行間約 24pt）
    const historyStartY = 275;
    const historyRowHeight = 24;
    sections.history.slice(0, 17).forEach((item, i) => {
      const y = historyStartY + i * historyRowHeight;
      // 年月のパース
      const dateMatch = item.match(/^(\d+)年\s*(\d+)月\s*(.*)/);
      if (dateMatch) {
        drawText(dateMatch[1], 32, y, 8);
        drawText(dateMatch[2], 62, y, 8);
        drawText(dateMatch[3], 100, y, 8.5);
      } else {
        drawText(item, 100, y, 8.5);
      }
    });

    // === 資格・免許テーブルの書き込み ===
    // 右カラム（Y座標: 285〜450 近辺、行間 22pt）
    const qualStartY = 291;
    const qualRowHeight = 22;
    sections.qualifications.slice(0, 8).forEach((item, i) => {
      const y = qualStartY + i * qualRowHeight;
      const dateMatch = item.match(/^(\d+)年\s*(\d+)月\s*(.*)/);
      if (dateMatch) {
        drawText(dateMatch[1], 428, y, 8);
        drawText(dateMatch[2], 456, y, 8);
        drawText(dateMatch[3], 490, y, 8);
      } else {
        drawText(item, 490, y, 8);
      }
    });

    // === 志望動機・自己PR ===
    const motivationY = 503;
    const prLines = [...sections.motivation, ...sections.pr];
    prLines.slice(0, 6).forEach((line, i) => {
      drawText(line, 432, motivationY + i * 14, 8);
    });

    // === 本人希望 ===
    const wishY = 623;
    sections.wish.slice(0, 4).forEach((line, i) => {
      drawText(line, 432, wishY + i * 14, 8);
    });

    // === PDFを出力 ===
    const pdfBytes = await pdfDoc.save();
    // Uint8Array → Buffer に変換して NextResponse に渡す
    const buffer = Buffer.from(pdfBytes);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="rirekisho.pdf"`,
      },
    });

  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}

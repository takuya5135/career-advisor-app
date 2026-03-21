import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fs from "fs";
import path from "path";
import { ResumeProfile, CareerHistoryEntry, QualificationEntry } from "@/lib/firebase/firestore";

/**
 * 元のPDFテンプレート(A3横向き 1191x842pt)にテキストを書き込むAPIルート
 * POST /api/document/resume-pdf
 *
 * PDF座標系: 左下が原点(0,0), 右上が(1191,842)
 * 左ページ(個人情報): x=0〜595
 * 右ページ(学歴・資格等): x=596〜1191
 */
export async function POST(req: NextRequest) {
  try {
    const { careerData, content, resumeProfile } = await req.json();

    // テンプレートPDFを読み込む
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
    // A3横: width=1191, height=842

    // テキスト描画ヘルパー (y座標は上からの距離で指定、内部でPDF座標に変換)
    const draw = (text: string, x: number, yFromTop: number, size = 9) => {
      if (!text || !text.trim()) return;
      page.drawText(text.trim(), {
        x,
        y: height - yFromTop,
        size,
        font: notoFont,
        color: rgb(0, 0, 0),
      });
    };

    // ============ 左ページ: 個人情報 ============
    // 優先順位: resumeProfile > careerData
    const p = {
      name: resumeProfile?.name || careerData?.name || "",
      furigana: resumeProfile?.furigana || careerData?.furigana || "",
      birthday: resumeProfile?.birthday || careerData?.birthday || "",
      gender: resumeProfile?.gender || careerData?.gender || "",
      postalCode: resumeProfile?.postalCode || "",
      address: resumeProfile?.address || careerData?.address || "",
      phone: resumeProfile?.phone || careerData?.phone || "",
      email: resumeProfile?.email || careerData?.email || "",
    };

    // 氏名
    draw(p.name, 90, 77, 14);
    // フリガナ
    draw(p.furigana, 90, 58, 8);
    // 生年月日
    draw(p.birthday, 85, 130, 8);
    // 性別
    draw(p.gender, 285, 130, 8);
    // フリガナ（住所上）
    draw(p.furigana, 65, 176, 7);
    // 現住所
    draw(p.address, 65, 193, 8);
    // 電話
    draw(p.phone, 65, 215, 8);
    // メール
    draw(p.email, 180, 215, 8);

    // 今日の日付（右上）
    const today = new Date();
    draw(`${today.getFullYear()}年${today.getMonth()+1}月${today.getDate()}日`, 870, 27, 8);

    // ============ 右ページ上段: 学歴・職歴テーブル ============
    const rightPageX = 596;
    const tableContentX = rightPageX + 90;
    const tableYearX = rightPageX + 10;
    const tableMonthX = rightPageX + 50;

    const historyRowStartY = 55;
    const historyRowPitch = 34;

    let historyItems: { year: string; month: string; content: string }[] = [];

    if (resumeProfile?.careerHistory && resumeProfile.careerHistory.length > 0) {
      historyItems = resumeProfile.careerHistory;
    } else {
      // フォールバック: CareerData の education[], experience[] を結合
      (careerData?.education || []).forEach((edu: string) => {
        const m = edu.match(/^(\d{4})年?\s*(\d{1,2})月?\s*(.*)/);
        if (m) historyItems.push({ year: m[1], month: m[2], content: m[3] });
        else historyItems.push({ year: "", month: "", content: edu });
      });
      (careerData?.experience || []).forEach((exp: string) => {
        const m = exp.match(/^(\d{4})年?\s*(\d{1,2})月?\s*(.*)/);
        if (m) historyItems.push({ year: m[1], month: m[2], content: m[3] });
        else historyItems.push({ year: "", month: "", content: exp });
      });
    }

    historyItems.slice(0, 16).forEach((item, i) => {
      const y = historyRowStartY + i * historyRowPitch;
      draw(item.year, tableYearX, y, 8);
      draw(item.month, tableMonthX, y, 8);
      draw(item.content, tableContentX, y, 8.5);
    });

    // ============ 右ページ下段: 資格・免許テーブル ============
    const qualTableStartY = 400;
    const qualRowPitch = 32;
    const qualContentX = rightPageX + 90;

    let qualItems: { year: string; month: string; content: string }[] = [];
    if (resumeProfile?.qualifications && resumeProfile.qualifications.length > 0) {
      qualItems = resumeProfile.qualifications.map((q: QualificationEntry) => ({ year: q.year, month: q.month, content: q.name }));
    } else {
      // フォールバック: careerData.skills
      (careerData?.skills || []).forEach((skill: string) => {
        const m = skill.match(/^(\d{4})年?\s*(\d{1,2})月?\s*(.*)/);
        if (m) qualItems.push({ year: m[1], month: m[2], content: m[3] });
        else qualItems.push({ year: "", month: "", content: skill });
      });
    }

    qualItems.slice(0, 6).forEach((item, i) => {
      const y = qualTableStartY + i * qualRowPitch;
      draw(item.year, rightPageX + 10, y, 8);
      draw(item.month, rightPageX + 50, y, 8);
      draw(item.content, qualContentX, y, 8);
    });

    // ============ 志望動機・自己PR・本人希望 (Markdown / resumeProfile) ============
    const motLines: string[] = [];
    let curSection = "";
    (content || "").split("\n").forEach((line: string) => {
      const l = line.trim();
      if (l.startsWith("## 志望動機")) curSection = "mot";
      else if (l.startsWith("## 自己PR")) curSection = "pr";
      else if (l.startsWith("## 本人希望")) curSection = "wish";
      else if (l && !l.startsWith("#") && (curSection === "mot" || curSection === "pr")) {
        motLines.push(l.replace(/^[-*]\s+/, ""));
      }
    });

    // 志望動機欄
    motLines.slice(0, 8).forEach((line, i) => {
      draw(line, 60, 500 + i * 16, 8);
    });

    // 本人希望欄 (resumeProfile.wishes を優先)
    const wishes = resumeProfile?.wishes || "";
    if (wishes) {
      const wishLines = wishes.split("\n");
      wishLines.slice(0, 5).forEach((line: string, i: number) => {
        draw(line, 595 + 60, 620 + i * 16, 8); // 右ページ下部あたりに配置 (仮)
      });
    }

    // ============ PDFを出力 ============
    const pdfBytes = await pdfDoc.save();
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
    return NextResponse.json({ error: "PDF generation failed", detail: String(error) }, { status: 500 });
  }
}

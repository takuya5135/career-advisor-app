import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// フォントの登録
// ユーザーの指摘に基づき、確実に .ttf 形式のパスを指定します。
// Next.jsのpublicフォルダにあるファイルを指定
Font.register({
  family: 'Noto Sans JP',
  // ユーザー様が手動配置されたファイルを確実に参照（キャッシュ破棄のため v=10）
  src: '/fonts/NotoSansJP-Regular.ttf?v=10'
});

import { CareerData, ResumeProfile } from '@/lib/firebase/firestore';

/**
 * JIS規格履歴書テンプレート (A4 1枚形式)
 * rirekisho_03_A4.pdf をモデルに再現
 */

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Noto Sans JP',
    fontSize: 9,
    lineHeight: 1.4,
    color: '#000',
  },
  // --- 履歴書（cv）用スタイル ---
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 5,
  },
  titleText: {
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 5,
  },
  dateText: {
    fontSize: 8,
  },
  headerContainer: {
    flexDirection: 'row',
    height: 140,
    marginBottom: 10,
  },
  personalBox: {
    flex: 1,
    border: '1.5 solid #000',
  },
  photoBox: {
    width: 100,
    height: 120,
    border: '1 solid #ccc',
    marginLeft: 10,
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 7,
    color: '#999',
  },
  cell: {
    padding: 4,
    borderBottom: '0.5 solid #000',
  },
  fieldLabel: {
    fontSize: 7,
    marginBottom: 2,
  },
  mainGrid: {
    flexDirection: 'row',
    flex: 1,
  },
  leftCol: {
    flex: 6,
    marginRight: 10,
  },
  rightCol: {
    flex: 4,
  },
  table: {
    border: '1 solid #000',
    borderBottom: 'none',
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottom: '1 solid #000',
    backgroundColor: '#f9f9f9',
    height: 20,
    alignItems: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '0.5 solid #000',
    minHeight: 22,
    alignItems: 'center',
  },
  colYear: { width: 35, borderRight: '0.5 solid #ccc', textAlign: 'center', fontSize: 8 },
  colMonth: { width: 25, borderRight: '0.5 solid #ccc', textAlign: 'center', fontSize: 8 },
  colContent: { flex: 1, paddingLeft: 5 },
  boxContainer: {
    border: '1 solid #000',
    marginBottom: 10,
    minHeight: 80,
  },
  boxLabel: {
    fontSize: 8,
    backgroundColor: '#f9f9f9',
    padding: 3,
    borderBottom: '0.5 solid #000',
  },
  boxContent: {
    padding: 5,
    fontSize: 8.5,
  },

  // --- 職務経歴書（resume）用スタイル ---
  resumePage: {
    padding: 40,
    fontFamily: 'Noto Sans JP',
    fontSize: 10,
    lineHeight: 1.6,
  },
  resumeHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 20,
    fontSize: 9,
  },
  resumeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 25,
    textDecoration: 'underline',
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    backgroundColor: '#f2f2f2',
    padding: '4 8',
    marginTop: 15,
    marginBottom: 10,
    borderLeft: '4 solid #333',
  },
  experienceItem: {
    marginBottom: 12,
  },
  companyName: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 4,
    borderBottom: '1 solid #eee',
    paddingBottom: 2,
  },
  jobPeriod: {
    fontSize: 9,
    color: '#666',
    marginBottom: 4,
  },
  bulletPoint: {
    flexDirection: 'row',
    marginBottom: 3,
    paddingLeft: 10,
  },
  bullet: {
    width: 12,
  },
  bulletText: {
    flex: 1,
  }
});

interface EditorPDFDocumentProps {
  title: string;
  content: string;
  type: "resume" | "cv" | "pr" | "cover_letter" | "other";
  personalData?: CareerData | null;
  resumeProfile?: ResumeProfile | null;
}

/**
 * 職務経歴書 (Professional Resume) コンポーネント
 */
const WorkHistoryDocument = ({ title, content, data, resumeProfile }: { title: string, content: string, data: CareerData, resumeProfile?: ResumeProfile | null }) => {
  const sections: Record<string, string[]> = {
    summary: [],   // 職務要約
    history: [],   // 職務経歴
    skills: [],    // 活かせる経験・知識・スキル
    qualifications: [], // 免許・資格
    pr: [],        // 自己PR
  };

  // 表示用氏名の決定 (resumeProfileを優先)
  const displayName = resumeProfile?.name || data.name || "";

  let currentSection = "";
  content.split('\n').forEach(line => {
    const l = line.trim();
    if (l.match(/^## .*要約/)) currentSection = "summary";
    else if (l.match(/^## .*経歴/)) currentSection = "history";
    else if (l.match(/^## .*スキル|## .*知識/)) currentSection = "skills";
    else if (l.match(/^## .*資格|## .*免許/)) currentSection = "qualifications";
    else if (l.match(/^## .*PR|## .*強み/)) currentSection = "pr";
    else if (l && !l.startsWith('#')) {
      if (currentSection) sections[currentSection].push(l);
    }
  });

  const renderBulletList = (items: string[]) => (
    items.map((item, i) => (
      <View key={i} style={styles.bulletPoint}>
        <Text style={styles.bullet}>・</Text>
        <Text style={styles.bulletText}>{item.replace(/^[-*]\s+/, "")}</Text>
      </View>
    ))
  );

  return (
    <Page size="A4" style={styles.resumePage}>
      {/* ヘッダー */}
      <View style={styles.resumeHeader}>
        <View>
          <Text>{new Date().toLocaleDateString('ja-JP')} 現在</Text>
          <Text style={{ marginTop: 4, fontSize: 11, textAlign: 'right' }}>氏名： {displayName}</Text>
        </View>
      </View>

      <Text style={styles.resumeTitle}>職 務 経 歴 書</Text>

      {/* 職務要約 */}
      <View>
        <Text style={styles.sectionHeader}>■職務要約</Text>
        {sections.summary.map((text, i) => <Text key={i} style={{ marginBottom: 5 }}>{text}</Text>)}
      </View>

      {/* 職務経歴 */}
      <View>
        <Text style={styles.sectionHeader}>■職務経歴</Text>
        {sections.history.length > 0 ? (
          sections.history.map((line, i) => {
            if (line.startsWith('### ')) {
              return <Text key={i} style={styles.companyName}>{line.replace('### ', '')}</Text>;
            }
            if (line.startsWith('- ') || line.startsWith('* ')) {
              return (
                <View key={i} style={styles.bulletPoint}>
                  <Text style={styles.bullet}>・</Text>
                  <Text style={styles.bulletText}>{line.substring(2)}</Text>
                </View>
              );
            }
            return <Text key={i} style={{ marginBottom: 4 }}>{line}</Text>;
          })
        ) : (
          <Text style={{ color: '#999' }}>※職務経歴の詳細を入力してください</Text>
        )}
      </View>

      {/* 活かせる経験・知識・スキル */}
      <View>
        <Text style={styles.sectionHeader}>■活かせる経験・知識・スキル</Text>
        {renderBulletList(sections.skills)}
      </View>

      {/* 免許・資格 */}
      <View>
        <Text style={styles.sectionHeader}>■免許・資格</Text>
        {renderBulletList(sections.qualifications)}
      </View>

      {/* 自己PR */}
      <View>
        <Text style={styles.sectionHeader}>■自己PR</Text>
        {sections.pr.map((text, i) => <Text key={i} style={{ marginBottom: 5 }}>{text}</Text>)}
      </View>
    </Page>
  );
};

/**
 * 履歴書 (JIS) コンポーネント
 */
const JISResumeDocument = ({ data, resumeProfile, content }: { data: CareerData, resumeProfile?: ResumeProfile | null, content: string }) => {
  // 表示用データの統合 (resumeProfileを優先)
  const p = {
    name: resumeProfile?.name || data.name || "",
    furigana: resumeProfile?.furigana || data.furigana || "",
    birthday: resumeProfile?.birthday || data.birthday || "",
    gender: resumeProfile?.gender || data.gender || "",
    address: resumeProfile?.address || data.address || "",
    phone: resumeProfile?.phone || data.phone || "",
    email: resumeProfile?.email || data.email || "",
  };

  // コンテンツのパース
  const sections: Record<string, string[]> = {
    history: [], // 学歴・職歴
    qualifications: [], // 資格
    motivation: [], // 志望動機
    pr: [], // 自己PR
    wish: [], // 本人希望
  };

  let currentSection = "";
  content.split('\n').forEach(line => {
    const l = line.trim();
    if (l.startsWith('## 学歴') || l.startsWith('## 職歴')) currentSection = "history";
    else if (l.startsWith('## 資格') || l.startsWith('## 免許')) currentSection = "qualifications";
    else if (l.startsWith('## 志望動機')) currentSection = "motivation";
    else if (l.startsWith('## 自己PR')) currentSection = "pr";
    else if (l.startsWith('## 本人希望')) currentSection = "wish";
    else if (l && currentSection) {
      sections[currentSection].push(l.replace(/^[-*]\s+/, ""));
    }
  });

  const renderTableRows = (items: string[], maxRows: number) => {
    const rows = [];
    for (let i = 0; i < maxRows; i++) {
      const item = items[i] || "";
      // 簡易的な日付パース (例: "2020年4月 内容")
      const dateMatch = item.match(/^(\d+年)?\s*(\d+月)?\s*(.*)/);
      rows.push(
        <View key={i} style={styles.tableRow}>
          <Text style={styles.colYear}>{dateMatch?.[1] || ""}</Text>
          <Text style={styles.colMonth}>{dateMatch?.[2] || ""}</Text>
          <Text style={styles.colContent}>{dateMatch?.[3] || item}</Text>
        </View>
      );
    }
    return rows;
  };

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.titleRow}>
        <Text style={styles.titleText}>履 歴 書</Text>
        <Text style={styles.dateText}>{new Date().toLocaleDateString('ja-JP')} 現在</Text>
      </View>

      <View style={styles.headerContainer}>
        <View style={styles.personalBox}>
          <View style={[styles.cell, { height: 20 }]}>
            <Text style={styles.fieldLabel}>フリガナ</Text>
            <Text style={{ fontSize: 7 }}>{p.furigana}</Text>
          </View>
          <View style={[styles.cell, { height: 45, borderBottomWidth: 1.5 }]}>
            <Text style={styles.fieldLabel}>氏名</Text>
            <Text style={{ fontSize: 16, textAlign: 'center', marginTop: 3 }}>{p.name}</Text>
          </View>
          <View style={{ flexDirection: 'row', flex: 1 }}>
            <View style={[styles.cell, { flex: 3, borderRight: '0.5 solid #000', borderBottom: 'none' }]}>
              <Text style={styles.fieldLabel}>生年月日</Text>
              <Text style={{ textAlign: 'center' }}>{p.birthday || "　年　月　日生"} </Text>
            </View>
            <View style={[styles.cell, { flex: 1, borderBottom: 'none' }]}>
              <Text style={styles.fieldLabel}>性別</Text>
              <Text style={{ textAlign: 'center' }}>{p.gender}</Text>
            </View>
          </View>
        </View>
        <View style={styles.photoBox}>
          <Text>写真を貼る位置</Text>
          <Text style={{ marginTop: 10 }}>縦 36-40mm</Text>
          <Text>横 24-30mm</Text>
        </View>
      </View>

      <View style={styles.mainGrid}>
        {/* 左カラム: 学歴・職歴 */}
        <View style={styles.leftCol}>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.colYear}>年</Text>
              <Text style={styles.colMonth}>月</Text>
              <Text style={[styles.colContent, { textAlign: 'center', fontSize: 8 }]}>学歴 ・ 職歴</Text>
            </View>
            {renderTableRows(sections.history, 18)}
          </View>
          <Text style={{ fontSize: 6, marginTop: 2 }}>※「性別」欄：記載は任意です。未記載とすることも可能です。</Text>
        </View>

        {/* 右カラム: 住所・資格・志望動機 */}
        <View style={styles.rightCol}>
          <View style={[styles.table, { marginBottom: 10, borderBottom: '1 solid #000' }]}>
            <View style={styles.cell}>
              <Text style={styles.fieldLabel}>住所</Text>
              <Text style={{ fontSize: 8 }}>{p.address || "〒"}</Text>
            </View>
            <View style={[styles.cell, { borderBottom: 'none', flexDirection: 'row' }]}>
              <View style={{ flex: 1, borderRight: '0.5 solid #ccc', paddingRight: 5 }}>
                <Text style={styles.fieldLabel}>電話</Text>
                <Text style={{ fontSize: 8 }}>{p.phone}</Text>
              </View>
              <View style={{ flex: 1, paddingLeft: 5 }}>
                <Text style={styles.fieldLabel}>メール</Text>
                <Text style={{ fontSize: 8 }}>{p.email}</Text>
              </View>
            </View>
          </View>

          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.colYear}>年</Text>
              <Text style={styles.colMonth}>月</Text>
              <Text style={[styles.colContent, { textAlign: 'center', fontSize: 8 }]}>免許 ・ 資格</Text>
            </View>
            {renderTableRows(sections.qualifications, 8)}
          </View>

          <View style={[styles.boxContainer, { marginTop: 10 }]}>
            <Text style={styles.boxLabel}>志望動機・自己PR</Text>
            <View style={styles.boxContent}>
              {sections.motivation.map((m, i) => <Text key={i} style={{ marginBottom: 3 }}>{m}</Text>)}
              {sections.pr.map((p, i) => <Text key={i}>{p}</Text>)}
            </View>
          </View>

          <View style={styles.boxContainer}>
            <Text style={styles.boxLabel}>本人希望記入欄</Text>
            <View style={styles.boxContent}>
              {sections.wish.map((w, i) => <Text key={i}>{w}</Text>)}
            </View>
          </View>
        </View>
      </View>
    </Page>
  );
};

export const EditorPDFDocument = ({ title, content = "", type, personalData, resumeProfile }: EditorPDFDocumentProps) => {
  if (type === 'cv' && personalData) {
    return (
      <Document title={title}>
        <JISResumeDocument data={personalData} resumeProfile={resumeProfile} content={content} />
      </Document>
    );
  }

  if (type === 'resume' && personalData) {
    return (
      <Document title={title}>
        <WorkHistoryDocument title={title} content={content} data={personalData} resumeProfile={resumeProfile} />
      </Document>
    );
  }

  // デフォルト（職務経歴書/その他）: 簡易パーサー
  const lines = content.split('\n');
  const elements: React.ReactElement[] = [];
  const standardStyles = StyleSheet.create({
    page: { padding: 40, fontFamily: 'Noto Sans JP', fontSize: 10 },
    h1: { fontSize: 18, borderBottom: '1 solid #000', marginBottom: 20, paddingBottom: 5, fontWeight: 'bold' },
    h2: { fontSize: 14, marginTop: 15, marginBottom: 8, backgroundColor: '#f4f4f4', padding: 4, borderLeft: '4 solid #000', fontWeight: 'bold' },
    h3: { fontSize: 12, marginTop: 10, marginBottom: 5, fontWeight: 'bold' },
    p: { marginBottom: 8, fontSize: 10, lineHeight: 1.6 },
    li: { flexDirection: 'row', marginBottom: 3, paddingLeft: 10, fontSize: 10 },
  });

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    if (trimmedLine === '') return;

    if (trimmedLine.startsWith('## ')) elements.push(<Text key={index} style={standardStyles.h2}>{trimmedLine.replace('## ', '')}</Text>);
    else if (trimmedLine.startsWith('### ')) elements.push(<Text key={index} style={standardStyles.h3}>{trimmedLine.replace('### ', '')}</Text>);
    else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
      elements.push(
        <View key={index} style={standardStyles.li}>
          <Text style={{ width: 10 }}>•</Text>
          <Text style={{ flex: 1 }}>{trimmedLine.substring(2)}</Text>
        </View>
      );
    } else {
      elements.push(<Text key={index} style={standardStyles.p}>{trimmedLine}</Text>);
    }
  });

  return (
    <Document title={title}>
      <Page size="A4" style={standardStyles.page}>
        <Text style={standardStyles.h1}>{title}</Text>
        {elements}
      </Page>
    </Document>
  );
};


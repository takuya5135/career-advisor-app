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

import { CareerData } from '@/lib/firebase/firestore';

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
  // ヘッダー: 履歴書タイトル
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
  // 基本情報ブロック
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
  // セル共通
  cell: {
    padding: 4,
    borderBottom: '0.5 solid #000',
  },
  fieldLabel: {
    fontSize: 7,
    marginBottom: 2,
  },
  // 主欄
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
  // テーブル形式
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
  
  // 自由入力ボックス
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
  }
});

interface EditorPDFDocumentProps {
  title: string;
  content: string;
  type: "resume" | "cv" | "pr" | "cover_letter" | "other";
  personalData?: CareerData | null;
}

/**
 * 履歴書 (JIS) コンポーネント
 */
const JISResumeDocument = ({ data, content }: { data: CareerData, content: string }) => {
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
            <Text style={{ fontSize: 7 }}>{data.furigana || ""}</Text>
          </View>
          <View style={[styles.cell, { height: 45, borderBottomWidth: 1.5 }]}>
            <Text style={styles.fieldLabel}>氏名</Text>
            <Text style={{ fontSize: 16, textAlign: 'center', marginTop: 3 }}>{data.name || ""}</Text>
          </View>
          <View style={{ flexDirection: 'row', flex: 1 }}>
            <View style={[styles.cell, { flex: 3, borderRight: '0.5 solid #000', borderBottom: 'none' }]}>
              <Text style={styles.fieldLabel}>生年月日</Text>
              <Text style={{ textAlign: 'center' }}>{data.birthday || "　年　月　日生"} </Text>
            </View>
            <View style={[styles.cell, { flex: 1, borderBottom: 'none' }]}>
              <Text style={styles.fieldLabel}>性別</Text>
              <Text style={{ textAlign: 'center' }}>{data.gender || ""}</Text>
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
              <Text style={{ fontSize: 8 }}>{data.address || "〒"}</Text>
            </View>
            <View style={[styles.cell, { borderBottom: 'none', flexDirection: 'row' }]}>
              <View style={{ flex: 1, borderRight: '0.5 solid #ccc', paddingRight: 5 }}>
                <Text style={styles.fieldLabel}>電話</Text>
                <Text style={{ fontSize: 8 }}>{data.phone || ""}</Text>
              </View>
              <View style={{ flex: 1, paddingLeft: 5 }}>
                <Text style={styles.fieldLabel}>メール</Text>
                <Text style={{ fontSize: 8 }}>{data.email || ""}</Text>
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

/**
 * 標準ドキュメント（職務経歴書など）
 */
const StandardDocument = ({ title, elements }: { title: string, elements: React.ReactNode }) => (
  <Page size="A4" style={{ padding: 40, fontFamily: 'Noto Sans JP', fontSize: 10 }}>
    <Text style={{ fontSize: 20, borderBottom: '1 solid #000', marginBottom: 20, paddingBottom: 5, fontWeight: 'bold' }}>{title}</Text>
    {elements}
  </Page>
);

export const EditorPDFDocument = ({ title, content = "", type, personalData }: EditorPDFDocumentProps) => {
  if (type === 'cv' && personalData) {
    return (
      <Document title={title}>
        <JISResumeDocument data={personalData} content={content} />
      </Document>
    );
  }

  // 従来の汎用パーサー
  const lines = content.split('\n');
  const elements: React.ReactElement[] = [];
  const standardStyles = StyleSheet.create({
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
      <StandardDocument title={title} elements={elements} />
    </Document>
  );
};


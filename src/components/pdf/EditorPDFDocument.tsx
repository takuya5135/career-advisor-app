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

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Noto Sans JP',
    fontSize: 9,
    lineHeight: 1.5,
    color: '#333',
  },
  // 履歴書（JIS）用ヘッダー
  resumeHeader: {
    flexDirection: 'row',
    marginBottom: 20,
    border: '1 solid #000',
  },
  resumeHeaderMain: {
    flex: 1,
    padding: 10,
    borderRight: '1 solid #000',
  },
  resumePhotoBox: {
    width: 100,
    height: 120,
    border: '1 solid #ccc',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 8,
    color: '#999',
    margin: 10,
  },
  furigana: {
    fontSize: 7,
    marginBottom: 2,
  },
  name: {
    fontSize: 18,
    marginBottom: 5,
    fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row',
    borderTop: '0.5 solid #ccc',
    paddingTop: 5,
    marginTop: 5,
  },
  header1: {
    fontSize: 18,
    marginBottom: 10,
    borderBottom: '1 solid #000',
    paddingBottom: 5,
    fontWeight: 'bold',
  },
  header2: {
    fontSize: 12,
    marginTop: 12,
    marginBottom: 6,
    backgroundColor: '#f4f4f4',
    padding: 3,
    borderLeft: '4 solid #000',
    fontWeight: 'bold',
  },
  header3: {
    fontSize: 10,
    marginTop: 8,
    marginBottom: 4,
    fontWeight: 'bold',
  },
  paragraph: {
    marginBottom: 6,
    textAlign: 'justify',
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 2,
    paddingLeft: 10,
  },
  bullet: {
    width: 10,
  },
  listContent: {
    flex: 1,
  },
});

interface EditorPDFDocumentProps {
  title: string;
  content: string;
  type: "resume" | "cv" | "pr" | "cover_letter" | "other";
  personalData?: CareerData | null;
}

/**
 * Resume (JIS) Header
 */
const ResumeHeader = ({ data }: { data: CareerData }) => (
  <View style={styles.resumeHeader}>
    <View style={styles.resumeHeaderMain}>
      <Text style={styles.furigana}>ふりがな: {data.furigana || '　'}</Text>
      <Text style={styles.name}>氏名: {data.name || '　'}</Text>
      <View style={styles.infoRow}>
        <Text style={{ flex: 1 }}>生年月日: {data.birthday || '　'}</Text>
        <Text style={{ flex: 1 }}>性別: {data.gender || '　'}</Text>
      </View>
      <View style={{ borderTop: '0.5 solid #ccc', marginTop: 5, paddingTop: 5 }}>
        <Text>住所: {data.address || '　'}</Text>
        <Text>電話: {data.phone || '　'}</Text>
        <Text>Email: {data.email || '　'}</Text>
      </View>
    </View>
    <View style={styles.resumePhotoBox}>
      <Text>写真貼付</Text>
    </View>
  </View>
);

/**
 * Markdownの簡易パーサー: 
 * 文字列を解析して react-pdf のコンポーネントツリーに変換する
 */
export const EditorPDFDocument = ({ title, content = "", type, personalData }: EditorPDFDocumentProps) => {
  const safeContent = content || "";
  const lines = safeContent.split('\n');
  const elements: React.ReactElement[] = [];

  let isList = false;

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    // 空行の処理
    if (trimmedLine === '') {
      elements.push(<View key={`empty-${index}`} style={{ height: 5 }} />);
      isList = false;
      return;
    }

    // 見出し1 (# Title)
    if (trimmedLine.startsWith('# ')) {
      elements.push(<Text key={index} style={styles.header1}>{trimmedLine.replace('# ', '')}</Text>);
      isList = false;
    } 
    // 見出し2 (## Section)
    else if (trimmedLine.startsWith('## ')) {
      elements.push(<Text key={index} style={styles.header2}>{trimmedLine.replace('## ', '')}</Text>);
      isList = false;
    }
    // 見出し3 (### Sub)
    else if (trimmedLine.startsWith('### ')) {
      elements.push(<Text key={index} style={styles.header3}>{trimmedLine.replace('### ', '')}</Text>);
      isList = false;
    }
    // リスト項目 (- item or * item)
    else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
      elements.push(
        <View key={index} style={styles.listItem}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.listContent}>{trimmedLine.substring(2)}</Text>
        </View>
      );
      isList = true;
    }
    // 通常の段落
    else {
      elements.push(<Text key={index} style={styles.paragraph}>{trimmedLine}</Text>);
      isList = false;
    }
  });

  return (
    <Document title={title}>
      <Page size="A4" style={styles.page}>
        {type === 'cv' && personalData && <ResumeHeader data={personalData} />}
        {type !== 'cv' && <Text style={styles.header1}>{title}</Text>}
        {elements}
      </Page>
    </Document>
  );
};

import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// フォントの登録
// ユーザーの指摘に基づき、確実に .ttf 形式のパスを指定します。
// Next.jsのpublicフォルダにあるファイルを指定
Font.register({
  family: 'Noto Sans JP',
  src: 'https://cdn.jsdelivr.net/gh/shun-shun/noto-sans-jp-subset-for-pdf@master/NotoSansJP-Regular.ttf'
});

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Noto Sans JP',
    fontSize: 10,
    lineHeight: 1.6,
    color: '#333',
  },
  header1: {
    fontSize: 20,
    marginBottom: 10,
    borderBottom: '1 solid #000',
    paddingBottom: 5,
    fontWeight: 'bold',
  },
  header2: {
    fontSize: 14,
    marginTop: 15,
    marginBottom: 8,
    backgroundColor: '#f4f4f4',
    padding: 4,
    borderLeft: '4 solid #000',
    fontWeight: 'bold',
  },
  header3: {
    fontSize: 11,
    marginTop: 10,
    marginBottom: 5,
    fontWeight: 'bold',
  },
  paragraph: {
    marginBottom: 8,
    textAlign: 'justify',
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 3,
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
}

/**
 * Markdownの簡易パーサー: 
 * 文字列を解析して react-pdf のコンポーネントツリーに変換する
 */
export const EditorPDFDocument = ({ title, content }: EditorPDFDocumentProps) => {
  const lines = content.split('\n');
  const elements: JSX.Element[] = [];

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
        {elements}
      </Page>
    </Document>
  );
};

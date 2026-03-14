import { CareerData } from '@/lib/firebase/firestore';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 12,
  },
  section: {
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  }
});

interface ResumeDocumentProps {
  data: CareerData;
  userEmail: string;
}

export const ResumeDocument = ({ data, userEmail }: ResumeDocumentProps) => {
  // データの安全な取得
  const safeData = data || {};
  
  return (
    <Document title="職務経歴書">
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.title}>職務経歴書 (Draft Preview)</Text>
          <Text>Email: {userEmail || "No Email"}</Text>
        </View>

        <View style={styles.section}>
          <Text>-- Current Data Summary --</Text>
          <Text>Skills: {(safeData.skills || []).join(", ") || "None"}</Text>
          <Text>Experiences: {(safeData.experience || []).length} items</Text>
          <Text>Strengths: {(safeData.strengths || []).length} items</Text>
          <Text>Goals: {(safeData.goals || []).length} items</Text>
        </View>

        <View style={{ marginTop: 20 }}>
          <Text style={{ fontSize: 10, color: '#666' }}>
            Note: This is a simplified preview for debugging.
            Generated at: {new Date().toISOString()}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

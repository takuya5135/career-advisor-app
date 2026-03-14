"use client";

import { PDFViewer, Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import { CareerData } from "@/lib/firebase/firestore";
import { ResumeDocument } from "./ResumeDocument";

interface PDFPreviewContentProps {
  data: CareerData;
  userEmail: string;
}

export default function PDFPreviewContent({ data, userEmail }: PDFPreviewContentProps) {
  return (
    <PDFViewer className="w-full h-full rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-inner">
      <ResumeDocument 
        data={data} 
        userEmail={userEmail} 
        PDF={{ Document, Page, Text, View, StyleSheet, Font }} 
      />
    </PDFViewer>
  );
}

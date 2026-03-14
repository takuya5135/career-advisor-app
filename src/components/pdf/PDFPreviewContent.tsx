"use client";

import { BlobProvider, Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import { CareerData } from "@/lib/firebase/firestore";
import { ResumeDocument } from "./ResumeDocument";

interface PDFPreviewContentProps {
  data: CareerData;
  userEmail: string;
}

export default function PDFPreviewContent({ data, userEmail }: PDFPreviewContentProps) {
  return (
    <div className="w-full h-full bg-white dark:bg-zinc-900 rounded-xl overflow-hidden shadow-inner">
      <BlobProvider 
        document={
          <ResumeDocument 
            data={data} 
            userEmail={userEmail} 
            PDF={{ Document, Page, Text, View, StyleSheet, Font }} 
          />
        }
      >
        {({ url, loading, error }) => {
          if (loading) {
            return (
              <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
                <div className="w-10 h-10 border-4 border-black dark:border-white border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-zinc-500">ドキュメントを構成中...</p>
              </div>
            );
          }
          if (error) {
            return <div className="p-8 text-red-500">プレビューの生成中にエラーが発生しました。</div>;
          }
          return (
            <iframe 
              src={url || ""} 
              className="w-full h-full border-none"
              title="Career Document Preview"
            />
          );
        }}
      </BlobProvider>
    </div>
  );
}

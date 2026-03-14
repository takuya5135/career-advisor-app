"use client";

import { useState, useEffect } from "react";
import { CareerData } from "@/lib/firebase/firestore";
import { ResumeDocument } from "./ResumeDocument";

interface PDFPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: CareerData;
  userEmail: string;
}

export default function PDFPreviewModal({ isOpen, onClose, data, userEmail }: PDFPreviewModalProps) {
  const [PDFComponents, setPDFComponents] = useState<{
    PDFViewer: any;
    Document: any;
    Page: any;
    Text: any;
    View: any;
    StyleSheet: any;
    Font: any;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const loadPDF = async () => {
        try {
          const { PDFViewer, Document, Page, Text, View, StyleSheet, Font } = await import("@react-pdf/renderer");
          setPDFComponents({ PDFViewer, Document, Page, Text, View, StyleSheet, Font });
        } catch (err) {
          console.error("PDF component load error:", err);
        }
      };
      loadPDF();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-5xl h-[90vh] rounded-3xl flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <header className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-900 sticky top-0 z-10">
          <div>
            <h3 className="text-xl font-bold">書類プレビュー</h3>
            <p className="text-sm text-zinc-500">現在のデータに基づいたプレビューです</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <span className="text-2xl">&times;</span>
          </button>
        </header>

        <div className="flex-1 bg-zinc-100 dark:bg-zinc-950 p-4 overflow-hidden">
          {!PDFComponents ? (
            <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
              <div className="w-12 h-12 border-4 border-black dark:border-white border-t-transparent rounded-full animate-spin" />
              <p className="text-zinc-500 font-medium animate-pulse">プレビューを生成中...</p>
            </div>
          ) : (
            <PDFComponents.PDFViewer className="w-full h-full rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-inner">
              <ResumeDocument 
                data={data} 
                userEmail={userEmail} 
                PDF={{
                  Document: PDFComponents.Document,
                  Page: PDFComponents.Page,
                  Text: PDFComponents.Text,
                  View: PDFComponents.View,
                  StyleSheet: PDFComponents.StyleSheet,
                  Font: PDFComponents.Font
                }} 
              />
            </PDFComponents.PDFViewer>
          )}
        </div>

        <footer className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          >
            閉じる
          </button>
          <Link
            href="/notes"
            className="px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold hover:opacity-80 transition-opacity"
          >
            PDFをダウンロード
          </Link>
        </footer>
      </div>
    </div>
  );
}

import Link from "next/link";

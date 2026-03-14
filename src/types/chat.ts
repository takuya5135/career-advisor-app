export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface ChatSession {
  id: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

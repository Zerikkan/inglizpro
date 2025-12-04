export enum AppTab {
  HOME = 'home',
  LESSONS = 'lessons',
  CHAT = 'chat',
  VOCABULARY = 'vocabulary',
  QUIZ = 'quiz'
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface Lesson {
  id: string;
  title: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  description: string;
  content?: string; // Markdown content
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number; // Index
  explanation: string;
}

export interface VocabCard {
  word: string;
  definition: string;
  example: string;
  imageUrl?: string;
  audioBase64?: string;
}
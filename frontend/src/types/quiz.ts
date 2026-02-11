export interface Chapter {
  id: number;
  title: string;
  order_index: number | null;
  course: string;
}

export interface Quiz {
  id: number;
  chapter: Chapter;
  title: string;
  num_questions: number;
  is_published: boolean;
  created_at: string;
}

export interface QuizAttempt {
  id: number;
  quiz: number;
  student: number;
  status: "IN_PROGRESS" | "COMPLETED";
  started_at: string;
  ended_at: string | null;
  score_percent: number | null;
  num_answered: number;
  num_correct: number;
}

export interface Question {
  id: number;
  prompt: string;
  choices: string[];
  difficulty: "EASY" | "MEDIUM" | "HARD";
}

export interface AttemptAnswer {
  attempt: number;
  question: number;
  selected_index: number;
}

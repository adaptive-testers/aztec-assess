export type AttemptStatus = "IN_PROGRESS" | "COMPLETED";
export type Difficulty = "EASY" | "MEDIUM" | "HARD";

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
  attempt_status: AttemptStatus | null;
  attempt_id: number | null;
}

export interface Question {
  id: number;
  prompt: string;
  choices: string[];
  difficulty: Difficulty;
}

export interface QuizAttempt {
  id: number;
  quiz: number;
  student: number;
  status: AttemptStatus;
  started_at: string;
  ended_at: string | null;
  score_percent: number | null;
  num_answered: number;
  num_correct: number;
  current_difficulty: Difficulty;
  current_question: Question | null;
}

export interface AttemptAnswer {
  attempt: number;
  question: number;
  selected_index: number;
}

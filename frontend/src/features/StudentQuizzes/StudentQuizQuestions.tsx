import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

interface Question {
  id: number;
  prompt: string;
  choices: string[];
  difficulty: "EASY" | "MEDIUM" | "HARD";
}

const MOCK_QUESTIONS: Question[] = [
  {
    id: 1,
    prompt: "What is the correct order of visiting nodes in a preorder traversal of a binary tree?",
    choices: [
      "Left subtree, Root, Right subtree",
      "Root, Left subtree, Right subtree",
      "Left subtree, Right subtree, Root",
      "Right subtree, Root, Left subtree",
    ],
    difficulty: "MEDIUM",
  },
  {
    id: 2,
    prompt: "Which data structure uses LIFO (Last In First Out) principle?",
    choices: ["Queue", "Stack", "Array", "Linked List"],
    difficulty: "EASY",
  },
  {
    id: 3,
    prompt: "What is the time complexity of binary search in a sorted array?",
    choices: ["O(n)", "O(log n)", "O(n²)", "O(1)"],
    difficulty: "MEDIUM",
  },
  {
    id: 4,
    prompt: "Which traversal method visits nodes level by level?",
    choices: ["Inorder", "Preorder", "Postorder", "Level-order"],
    difficulty: "EASY",
  },
  {
    id: 5,
    prompt: "What is the maximum number of children a binary tree node can have?",
    choices: ["1", "2", "3", "Unlimited"],
    difficulty: "EASY",
  },
];

export default function StudentQuizQuestions() {
  const navigate = useNavigate();
  const { attemptId } = useParams<{ attemptId: string }>();
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Map<number, number>>(new Map());

  const currentQuestion = MOCK_QUESTIONS[currentQuestionIndex];
  const totalQuestions = MOCK_QUESTIONS.length;
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

  const choiceLabels = ["A", "B", "C", "D"];

  const handleChoiceSelect = (index: number) => {
    setSelectedChoice(index);
  };

  const handleNext = () => {
    if (selectedChoice !== null) {
      // Save the answer
      const newAnswers = new Map(answers);
      newAnswers.set(currentQuestion.id, selectedChoice);
      setAnswers(newAnswers);

      if (isLastQuestion) {
        // Navigate to results page
        navigate(`/quiz-results/${attemptId || "mock"}`);
      } else {
        // Move to next question
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        // Check if we already answered the next question
        const nextQuestion = MOCK_QUESTIONS[currentQuestionIndex + 1];
        const previousAnswer = answers.get(nextQuestion.id);
        setSelectedChoice(previousAnswer !== undefined ? previousAnswer : null);
      }
    }
  };

  return (
    <section className="flex w-full justify-center bg-[#0A0A0A] text-[#F1F5F9] min-h-screen">
      <div className="flex w-full max-w-[680px] flex-col py-8 px-4">
        {/* Question counter */}
        <div className="mb-12">
          <p className="text-[14px] text-[#A1A1AA]">
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </p>
        </div>

        {/* Question prompt */}
        <div className="mb-12">
          <h2 className="text-[24px] font-normal leading-relaxed text-[#F1F5F9]">
            {currentQuestion.prompt}
          </h2>
        </div>

        {/* Answer choices */}
        <div className="flex flex-col gap-4 mb-12">
          {currentQuestion.choices.map((choice, index) => (
            <button
              key={index}
              onClick={() => handleChoiceSelect(index)}
              className={`
                w-full rounded-[10px] border-2 bg-[#1A1A1A] px-6 py-4 text-left 
                transition-all duration-200
                ${
                  selectedChoice === index
                    ? "border-[#FF7A7A]"
                    : "border-[#404040] hover:border-[#A1A1AA] hover:bg-[#252525]"
                }
              `}
            >
              <div className="flex items-center gap-4">
                <span
                  className={`
                    flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md
                    text-[14px] font-medium
                    ${
                      selectedChoice === index
                        ? "bg-[#FF7A7A] text-white"
                        : "bg-[#2A2A2A] text-[#A1A1AA]"
                    }
                  `}
                >
                  {choiceLabels[index]}
                </span>
                <span className="text-[15px] text-[#F1F5F9]">{choice}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Next/Finish button */}
        <div className="mt-auto pt-8">
          <button
            onClick={handleNext}
            disabled={selectedChoice === null}
            className={`
              w-full rounded-[7px] px-8 py-3 text-[15px] font-medium text-white
              transition-all duration-200
              ${
                selectedChoice === null
                  ? "bg-[#404040] cursor-not-allowed opacity-50"
                  : "bg-[#FF7A7A] hover:bg-[#FF8F8F] hover:shadow-lg"
              }
            `}
          >
            {isLastQuestion ? "Finish" : "Next"}
          </button>
        </div>
      </div>
    </section>
  );
}

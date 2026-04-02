import { screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

import { privateApi } from '../api/axios';
import { QUIZZES } from '../api/endpoints';
import InstructorDashboardPage from '../features/Dashboard/InstructorDashboardPage';

import { render } from './utils';

vi.mock('../api/axios', () => ({
  privateApi: {
    get: vi.fn(),
    post: vi.fn(),
  },
  publicApi: { post: vi.fn(() => Promise.reject(new Error('No refresh token'))) },
}));

vi.mock('@azure/msal-react', () => ({
  useMsal: () => ({ instance: {}, accounts: [], inProgress: 0 }),
}));

vi.mock('@mantine/core', () => ({
  Progress: (props: { value?: number }) => (
    <div data-testid="mantine-progress" data-value={props.value} />
  ),
}));

const api = privateApi as unknown as {
  get: Mock;
};

const makeQuiz = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  title: 'Quiz Alpha',
  chapter: {
    id: 10,
    title: 'Chapter 1: Intro',
    order_index: 1,
    course: 'course-slug',
    course_title: 'Physics 101',
  },
  num_questions: 5,
  is_published: true,
  created_at: '2024-06-01T00:00:00Z',
  attempt_status: null as string | null,
  attempt_id: null as number | null,
  ...overrides,
});

const makeAttempt = (overrides: Record<string, unknown> = {}) => ({
  id: 100,
  quiz: 1,
  student: 1,
  status: 'COMPLETED',
  started_at: '2024-06-01T10:00:00Z',
  ended_at: '2024-06-01T11:00:00Z',
  score_percent: 85,
  num_answered: 5,
  num_correct: 4,
  current_difficulty: 'MEDIUM',
  current_question: null,
  ...overrides,
});

function setupApiResponses(overrides: Record<string, unknown> = {}) {
  const defaults: Record<string, unknown> = {
    [QUIZZES.LIST]: { data: [] },
    ...overrides,
  };

  api.get.mockImplementation((url: string) => {
    if (url in defaults) {
      const value = defaults[url];
      if (value instanceof Error) return Promise.reject(value);
      return Promise.resolve(value);
    }
    for (const [key, val] of Object.entries(defaults)) {
      if (key.startsWith('/attempts/') && url === key) {
        return Promise.resolve(val);
      }
    }
    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });
}

describe('InstructorDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the dashboard skeleton while loading', () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    api.get.mockReturnValue(new Promise(() => {}));

    render(<InstructorDashboardPage userName="Dr. Ada" />);

    expect(screen.getByText(/Welcome back, Dr. Ada/i)).toBeInTheDocument();
  });

  it('shows an error message when the quiz list request fails', async () => {
    setupApiResponses({
      [QUIZZES.LIST]: new Error('Network error'),
    });

    render(<InstructorDashboardPage userName="Instructor" />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load dashboard data')).toBeInTheDocument();
    });
  });

  it('renders class overview metrics with completed attempt data', async () => {
    const quiz1 = makeQuiz({ id: 1, title: 'Quiz Alpha', attempt_id: 100 });
    const quiz2 = makeQuiz({ id: 2, title: 'Quiz Beta', attempt_id: 101 });
    const quiz3 = makeQuiz({ id: 3, title: 'Quiz Gamma' });

    const attempt1 = makeAttempt({ id: 100, quiz: 1, score_percent: 80 });
    const attempt2 = makeAttempt({ id: 101, quiz: 2, score_percent: 60 });

    setupApiResponses({
      [QUIZZES.LIST]: { data: [quiz1, quiz2, quiz3] },
      [QUIZZES.ATTEMPT_DETAIL(100)]: { data: attempt1 },
      [QUIZZES.ATTEMPT_DETAIL(101)]: { data: attempt2 },
    });

    render(<InstructorDashboardPage userName="Instructor" />);

    await waitFor(() => {
      expect(screen.getByText('Class overview')).toBeInTheDocument();
    });

    expect(screen.getByText('70%')).toBeInTheDocument();
    expect(screen.getByText('2/3')).toBeInTheDocument();
    expect(screen.getByText('67%')).toBeInTheDocument();
  });

  it('renders active quizzes and excludes completed quizzes', async () => {
    const completedQuiz = makeQuiz({ id: 1, title: 'Completed Quiz', attempt_id: 100 });
    const activeQuiz = makeQuiz({ id: 2, title: 'Active Quiz', chapter: { id: 11, title: 'Chapter 2', order_index: 2, course: 'slug', course_title: 'Chemistry 102' } });

    setupApiResponses({
      [QUIZZES.LIST]: { data: [completedQuiz, activeQuiz] },
      [QUIZZES.ATTEMPT_DETAIL(100)]: { data: makeAttempt({ id: 100, quiz: 1 }) },
    });

    render(<InstructorDashboardPage userName="Instructor" />);

    await waitFor(() => {
      expect(screen.getByText('Active quizzes')).toBeInTheDocument();
    });

    expect(screen.getByText('1 available')).toBeInTheDocument();
    expect(screen.getByText('Active Quiz')).toBeInTheDocument();
    expect(screen.getByText(/5 questions/i)).toBeInTheDocument();
  });

  it('shows active quizzes and no recent activity when nothing is completed', async () => {
    setupApiResponses({
      [QUIZZES.LIST]: { data: [makeQuiz()] },
    });

    render(<InstructorDashboardPage userName="Instructor" />);

    await waitFor(() => {
      expect(screen.getByText('No completed quizzes yet')).toBeInTheDocument();
    });

    expect(screen.getByText('1 available')).toBeInTheDocument();
    expect(screen.getByText('Quiz Alpha')).toBeInTheDocument();
    expect(screen.getByText('N/A')).toBeInTheDocument();
    expect(screen.getByText('0/1')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('renders recent student activity with score label and date', async () => {
    const quiz = makeQuiz({ id: 1, title: 'Quiz Alpha', attempt_id: 100 });
    const attempt = makeAttempt({
      id: 100,
      quiz: 1,
      score_percent: 92,
      num_answered: 5,
      num_correct: 5,
      ended_at: '2024-06-15T12:00:00Z',
    });

    setupApiResponses({
      [QUIZZES.LIST]: { data: [quiz] },
      [QUIZZES.ATTEMPT_DETAIL(100)]: { data: attempt },
    });

    render(<InstructorDashboardPage userName="Instructor" />);

    await waitFor(() => {
      expect(screen.getByText('Recent student activity')).toBeInTheDocument();
    });

    expect(screen.getAllByText('92%').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Excellent')).toBeInTheDocument();
    expect(screen.getByText(/Jun 15, 2024/i)).toBeInTheDocument();
    expect(screen.getByText(/5\/5 correct/i)).toBeInTheDocument();
  });

  it('handles paginated quiz list responses', async () => {
    setupApiResponses({
      [QUIZZES.LIST]: { data: { results: [makeQuiz()] } },
    });

    render(<InstructorDashboardPage userName="Instructor" />);

    await waitFor(() => {
      expect(screen.getByText('Quiz Alpha')).toBeInTheDocument();
    });
  });

  it('shows an error for invalid quiz list response format', async () => {
    setupApiResponses({
      [QUIZZES.LIST]: { data: 'not-an-array' },
    });

    render(<InstructorDashboardPage userName="Instructor" />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load dashboard data')).toBeInTheDocument();
    });
  });
});

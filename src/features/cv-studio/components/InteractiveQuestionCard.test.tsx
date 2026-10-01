import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InteractiveQuestionCard } from './InteractiveQuestionCard';
import { InteractiveQuestion, InteractiveQuestionGroup } from '@/services/ai/schemas';

describe('InteractiveQuestionCard', () => {
  const radioQuestion: InteractiveQuestion = {
    id: 'q1',
    type: 'radio',
    question: 'Choose your preferred tone',
    description: 'Tone description',
    options: [
      { id: 'opt_1', label: 'Action-oriented' },
      { id: 'opt_2', label: 'Technical' },
    ],
    allowCustomInput: true,
    submitLabel: 'Apply Tone',
  };

  const checkboxQuestion: InteractiveQuestion = {
    id: 'q2',
    type: 'checkbox',
    question: 'Select relevant skills',
    options: [
      { id: 's1', label: 'React' },
      { id: 's2', label: 'TypeScript' },
      { id: 's3', label: 'Node.js' },
    ],
    minSelect: 1,
    maxSelect: 2,
  };

  const inputQuestion: InteractiveQuestion = {
    id: 'q3',
    type: 'input',
    question: 'What was your revenue impact?',
    inputPlaceholder: 'e.g. +$200K ARR',
  };

  const questionGroup: InteractiveQuestionGroup = {
    id: 'group_project',
    title: 'Project Details',
    description: 'Provide information for the latest project',
    questions: [
      {
        id: 'q_scale',
        type: 'radio',
        question: 'System scale?',
        options: [
          { id: 'opt_small', label: '< 10k users' },
          { id: 'opt_large', label: '100k+ users' },
        ],
      },
      {
        id: 'q_skills',
        type: 'checkbox',
        question: 'Skills used?',
        options: [
          { id: 'ts', label: 'TypeScript' },
          { id: 'py', label: 'Python' },
        ],
        minSelect: 1,
      },
      {
        id: 'q_notes',
        type: 'input',
        question: 'Additional notes',
        inputPlaceholder: 'Enter notes...',
      },
    ],
    submitLabel: 'Submit all information',
  };

  it('renders radio question and handles single option selection', () => {
    const onSubmit = vi.fn();
    const onSkip = vi.fn();

    render(
      <InteractiveQuestionCard question={radioQuestion} onSubmit={onSubmit} onSkip={onSkip} />
    );

    expect(screen.getByText('Choose your preferred tone')).toBeInTheDocument();
    expect(screen.getByText('Tone description')).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /Apply Tone/i });
    expect(submitBtn).toBeDisabled();

    // Select first option
    fireEvent.click(screen.getByText('Action-oriented'));
    expect(submitBtn).toBeEnabled();

    // Click submit
    fireEvent.click(submitBtn);
    expect(onSubmit).toHaveBeenCalledWith({
      q1: {
        selectedOptions: ['opt_1'],
        customText: undefined,
      },
    });
  });

  it('handles custom input for combo / radio with allowCustomInput', () => {
    const onSubmit = vi.fn();

    render(<InteractiveQuestionCard question={radioQuestion} onSubmit={onSubmit} />);

    const input = screen.getByPlaceholderText('Other (Custom input)...');
    fireEvent.change(input, { target: { value: 'Friendly & Casual' } });

    const submitBtn = screen.getByRole('button', { name: /Apply Tone/i });
    expect(submitBtn).toBeEnabled();

    fireEvent.click(submitBtn);
    expect(onSubmit).toHaveBeenCalledWith({
      q1: {
        selectedOptions: [],
        customText: 'Friendly & Casual',
      },
    });
  });

  it('enforces minSelect and maxSelect on checkbox questions', () => {
    const onSubmit = vi.fn();

    render(<InteractiveQuestionCard question={checkboxQuestion} onSubmit={onSubmit} />);

    const submitBtn = screen.getByRole('button', { name: /Confirm & Continue/i });
    expect(submitBtn).toBeDisabled();

    // Select React
    fireEvent.click(screen.getByText('React'));
    expect(submitBtn).toBeEnabled();

    // Select TypeScript
    fireEvent.click(screen.getByText('TypeScript'));
    expect(submitBtn).toBeEnabled();

    // Try selecting Node.js - should not exceed maxSelect (2)
    fireEvent.click(screen.getByText('Node.js'));

    fireEvent.click(submitBtn);
    expect(onSubmit).toHaveBeenCalledWith({
      q2: {
        selectedOptions: ['s1', 's2'],
        customText: undefined,
      },
    });
  });

  it('renders input-only question and handles submission', () => {
    const onSubmit = vi.fn();

    render(<InteractiveQuestionCard question={inputQuestion} onSubmit={onSubmit} />);

    const input = screen.getByPlaceholderText('e.g. +$200K ARR');
    const submitBtn = screen.getByRole('button', { name: /Confirm & Continue/i });
    expect(submitBtn).toBeDisabled();

    fireEvent.change(input, { target: { value: 'Saved $50k monthly' } });
    expect(submitBtn).toBeEnabled();

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledWith({
      q3: {
        selectedOptions: [],
        customText: 'Saved $50k monthly',
      },
    });
  });

  it('calls onSkip when skip button is clicked', () => {
    const onSkip = vi.fn();

    render(<InteractiveQuestionCard question={radioQuestion} onSubmit={vi.fn()} onSkip={onSkip} />);

    const skipBtn = screen.getByRole('button', { name: 'Skip' });
    fireEvent.click(skipBtn);
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('renders single question answered state correctly', () => {
    render(
      <InteractiveQuestionCard
        question={radioQuestion}
        onSubmit={vi.fn()}
        isAnswered={true}
        answeredValue={{ selectedOptions: ['opt_1'], customText: 'Special note' }}
      />
    );

    expect(screen.getByText('Selected:')).toBeInTheDocument();
    expect(screen.getByText('Action-oriented')).toBeInTheDocument();
    expect(screen.getByText('“Special note”')).toBeInTheDocument();
  });

  describe('Multi-Questions Group', () => {
    it('renders group title, description, badge, and stacked numbered questions', () => {
      render(
        <InteractiveQuestionCard
          questionGroup={questionGroup}
          onSubmit={vi.fn()}
          onSkip={vi.fn()}
        />
      );

      expect(screen.getByText('Project Details')).toBeInTheDocument();
      expect(screen.getByText('Provide information for the latest project')).toBeInTheDocument();
      expect(screen.getByText('3 Questions')).toBeInTheDocument();
      expect(screen.getByText('System scale?')).toBeInTheDocument();
      expect(screen.getByText('Skills used?')).toBeInTheDocument();
      expect(screen.getByText('Additional notes')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Skip all/i })).toBeInTheDocument();
    });

    it('manages independent state per question and submits collective answers', () => {
      const onSubmit = vi.fn();

      render(<InteractiveQuestionCard questionGroup={questionGroup} onSubmit={onSubmit} />);

      const submitBtn = screen.getByRole('button', { name: /Submit all information/i });
      expect(submitBtn).toBeDisabled();

      // Answer question 1 (radio)
      fireEvent.click(screen.getByText('< 10k users'));
      expect(submitBtn).toBeEnabled();

      // Answer question 2 (checkbox)
      fireEvent.click(screen.getByText('TypeScript'));

      // Answer question 3 (input)
      const input = screen.getByPlaceholderText('Enter notes...');
      fireEvent.change(input, { target: { value: 'High throughput API' } });

      fireEvent.click(submitBtn);

      expect(onSubmit).toHaveBeenCalledWith({
        q_scale: {
          selectedOptions: ['opt_small'],
          customText: undefined,
        },
        q_skills: {
          selectedOptions: ['ts'],
          customText: undefined,
        },
        q_notes: {
          selectedOptions: [],
          customText: 'High throughput API',
        },
      });
    });

    it('renders multi-question answered summary correctly', () => {
      render(
        <InteractiveQuestionCard
          questionGroup={questionGroup}
          onSubmit={vi.fn()}
          isAnswered={true}
          answeredValue={{
            q_scale: { selectedOptions: ['opt_large'] },
            q_skills: { selectedOptions: ['ts', 'py'] },
            q_notes: { selectedOptions: [], customText: 'All completed' },
          }}
        />
      );

      expect(screen.getByText('Project Details')).toBeInTheDocument();
      expect(screen.getByText('100k+ users')).toBeInTheDocument();
      expect(screen.getByText('TypeScript')).toBeInTheDocument();
      expect(screen.getByText('Python')).toBeInTheDocument();
      expect(screen.getByText('“All completed”')).toBeInTheDocument();
    });
  });
});

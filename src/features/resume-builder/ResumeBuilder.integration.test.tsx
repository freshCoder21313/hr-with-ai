import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { db } from '@/lib/db';
import * as aiConfigService from '@/services/ai/aiConfigService';
import * as resumeAIService from '@/services/resume/resumeAIService';
import ResumeBuilder from './ResumeBuilder';
import { Resume, ResumeData, InterviewStatus } from '@/types';

// Mock services
vi.mock('@/lib/db');
vi.mock('@/services/ai/aiConfigService');
vi.mock('@/services/resume/resumeAIService');
vi.mock('@/components/SEO', () => ({
  default: () => <></>,
}));

const mockResume: Resume = {
  id: 1,
  fileName: 'Test Resume',
  createdAt: Date.now(),
  rawText: 'This is a test resume.',
  parsedData: {
    basics: {
      name: 'John Doe',
      email: 'john.doe@email.com',
      summary: 'A test summary.',
    },
    work: [],
    education: [],
    skills: [],
    projects: [],
  } as ResumeData,
  formatted: true,
};

describe('ResumeBuilder Integration Test', () => {
  beforeEach(() => {
    vi.mocked(db.resumes.get).mockResolvedValue(mockResume);
    vi.mocked(aiConfigService.getStoredAIConfig).mockReturnValue({
      apiKey: 'test-key',
      provider: 'google',
    });
  });

  it('should load a resume and allow editing', async () => {
    render(
      <MemoryRouter initialEntries={['/resumes/1/edit']}>
        <Routes>
          <Route path="/resumes/:id/edit" element={<ResumeBuilder />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for the resume to load
    await waitFor(() => {
      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    });

    // Change the name
    const nameInput = screen.getByDisplayValue('John Doe');
    fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });

    // The name in the form should be updated
    expect(screen.getByDisplayValue('Jane Doe')).toBeInTheDocument();

    // Note: asserting the preview update is more complex as it's debounced
    // and requires the entire preview component to be rendered.
    // This basic test verifies the form interaction and state update.
  });
});

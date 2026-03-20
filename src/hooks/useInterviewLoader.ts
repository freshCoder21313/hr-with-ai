import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '@/lib/db';
import { useInterviewStore } from '@/features/interview/interviewStore';
import { Interview } from '@/types';

interface UseInterviewLoaderReturn {
  interview: Interview | null;
  isLoading: boolean;
  error: string | null;
}

export const useInterviewLoader = (): UseInterviewLoaderReturn => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentInterview, setInterview } = useInterviewStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInterview = useCallback(async () => {
    if (!id) {
      setError('No interview ID provided');
      setIsLoading(false);
      return;
    }

    if (currentInterview && currentInterview.id === parseInt(id)) {
      setIsLoading(false);
      return;
    }

    try {
      const data = await db.interviews.get(parseInt(id));
      if (data) {
        setInterview(data);
        setError(null);
      } else {
        setError('Interview not found');
        navigate('/');
      }
    } catch (err) {
      setError('Failed to load interview');
      console.error('Error loading interview:', err);
      navigate('/');
    } finally {
      setIsLoading(false);
    }
  }, [id, currentInterview, setInterview, navigate]);

  useEffect(() => {
    loadInterview();
  }, [loadInterview]);

  return {
    interview: currentInterview,
    isLoading,
    error,
  };
};

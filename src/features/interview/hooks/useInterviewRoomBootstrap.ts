import { useEffect, useState } from 'react';
import { db } from '@/lib/db';
import { loadUserSettings } from '@/services/core/settingsService';
import {
  Interview,
  Resume,
  UserSettings,
  resolveInterviewContentType,
  resolveInterviewInteractionMode,
} from '@/types';

/**
 * Loads settings/resumes and derives initial tool + view mode from interview config.
 */
export function useInterviewRoomBootstrap(
  currentInterview: Interview | null,
  showSettings: boolean
) {
  const [userSettings, setUserSettings] = useState<UserSettings>({ hintsEnabled: false });
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);
  const [availableResumes, setAvailableResumes] = useState<Resume[]>([]);
  const [viewMode, setViewMode] = useState<'text' | 'voice'>('text');

  const contentType = currentInterview ? resolveInterviewContentType(currentInterview) : 'standard';
  const interaction = currentInterview ? resolveInterviewInteractionMode(currentInterview) : 'text';

  const autoOpenCode = contentType === 'coding';
  const autoOpenWhiteboard = contentType === 'system_design';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await loadUserSettings();
        if (!cancelled) setUserSettings(stored);
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        if (!cancelled) setIsSettingsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (showSettings || !isSettingsLoaded) return;
    let cancelled = false;
    (async () => {
      try {
        const stored = await loadUserSettings();
        if (!cancelled) setUserSettings(stored);
      } catch (error) {
        console.error('Failed to reload settings:', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showSettings, isSettingsLoaded]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resumes = await db.resumes.toArray();
        if (!cancelled) setAvailableResumes(resumes);
      } catch (error) {
        console.error('Failed to load resumes:', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Sync view mode when interaction channel is strictly text or voice
  useEffect(() => {
    if (!currentInterview) return;
    if (interaction === 'voice') {
      queueMicrotask(() => setViewMode('voice'));
    } else if (interaction === 'text') {
      queueMicrotask(() => setViewMode('text'));
    }
  }, [interaction, currentInterview]);

  return {
    userSettings,
    setUserSettings,
    availableResumes,
    viewMode,
    setViewMode,
    autoOpenCode,
    autoOpenWhiteboard,
  };
}

import { describe, it, expect } from 'vitest';
import { getTourIdForRoute, TOUR_DEFINITIONS } from './tourSteps';

describe('tourSteps', () => {
  describe('getTourIdForRoute', () => {
    it('maps root path to tour_landing', () => {
      expect(getTourIdForRoute('/')).toBe('tour_landing');
      expect(getTourIdForRoute('')).toBe('tour_landing');
    });

    it('maps /setup to tour_setup', () => {
      expect(getTourIdForRoute('/setup')).toBe('tour_setup');
    });

    it('maps /studio to tour_studio', () => {
      expect(getTourIdForRoute('/studio')).toBe('tour_studio');
    });

    it('maps resume editor path to tour_builder', () => {
      expect(getTourIdForRoute('/resumes/123/edit')).toBe('tour_builder');
    });

    it('maps /skill-assessment to tour_skill', () => {
      expect(getTourIdForRoute('/skill-assessment')).toBe('tour_skill');
    });

    it('maps /interview/:id to tour_interview', () => {
      expect(getTourIdForRoute('/interview/123')).toBe('tour_interview');
      expect(getTourIdForRoute('/interview/abc_123')).toBe('tour_interview');
    });

    it('maps /feedback/:id to tour_feedback', () => {
      expect(getTourIdForRoute('/feedback/123')).toBe('tour_feedback');
      expect(getTourIdForRoute('/feedback/def_456')).toBe('tour_feedback');
    });

    it('maps /history to tour_history', () => {
      expect(getTourIdForRoute('/history')).toBe('tour_history');
    });

    it('returns null for unconfigured routes', () => {
      expect(getTourIdForRoute('/unknown-page')).toBeNull();
    });
  });

  describe('TOUR_DEFINITIONS', () => {
    it('defines tour_landing with expected step elements', () => {
      const landing = TOUR_DEFINITIONS['tour_landing'];
      expect(landing).toBeDefined();
      expect(landing.length).toBeGreaterThanOrEqual(4);
      const elements = landing.map((s) => s.element);
      expect(elements).toContain('.tour-landing-welcome');
      expect(elements).toContain('.tour-landing-stats');
      expect(elements).toContain('.tour-landing-practice');
      expect(elements).toContain('.tour-landing-studio');
    });

    it('defines tour_setup with expected step elements', () => {
      const setup = TOUR_DEFINITIONS['tour_setup'];
      expect(setup).toBeDefined();
      expect(setup.length).toBeGreaterThanOrEqual(4);
      const elements = setup.map((s) => s.element);
      expect(elements).toContain('.tour-setup-role');
      expect(elements).toContain('.tour-setup-resume');
      expect(elements).toContain('.tour-setup-config');
      expect(elements).toContain('.tour-setup-start');
    });

    it('defines tour_studio with 8 comprehensive steps', () => {
      const studio = TOUR_DEFINITIONS['tour_studio'];
      expect(studio).toBeDefined();
      expect(studio).toHaveLength(8);
      const elements = studio.map((s) => s.element);
      expect(elements).toContain('.tour-studio-intro');
      expect(elements).toContain('.tour-studio-job-add');
      expect(elements).toContain('.tour-studio-tailoring');
      expect(elements).toContain('.tour-studio-chat-context');
      expect(elements).toContain('.tour-studio-chat-input');
      expect(elements).toContain('.tour-studio-career-knowledge');
      expect(elements).toContain('.tour-studio-preview-mode');
      expect(elements).toContain('.tour-studio-export-pdf');
    });

    it('defines tour_interview with expected step elements', () => {
      const interview = TOUR_DEFINITIONS['tour_interview'];
      expect(interview).toBeDefined();
      expect(interview).toHaveLength(5);
      const elements = interview.map((s) => s.element);
      expect(elements).toContain('.tour-interview-chat');
      expect(elements).toContain('.tour-interview-hints');
      expect(elements).toContain('.tour-interview-tools');
      expect(elements).toContain('.tour-interview-input');
      expect(elements).toContain('.tour-interview-end');
    });

    it('defines tour_feedback with expected step elements', () => {
      const feedback = TOUR_DEFINITIONS['tour_feedback'];
      expect(feedback).toBeDefined();
      expect(feedback).toHaveLength(4);
      const elements = feedback.map((s) => s.element);
      expect(elements).toContain('.tour-feedback-summary');
      expect(elements).toContain('.tour-feedback-tabs');
      expect(elements).toContain('.tour-feedback-coaching');
      expect(elements).toContain('.tour-feedback-print');
    });

    it('defines tour_history with expected step elements', () => {
      const history = TOUR_DEFINITIONS['tour_history'];
      expect(history).toBeDefined();
      expect(history).toHaveLength(4);
      const elements = history.map((s) => s.element);
      expect(elements).toContain('.tour-history-tabs');
      expect(elements).toContain('.tour-history-charts-toggle');
      expect(elements).toContain('.tour-history-search');
      expect(elements).toContain('.tour-history-list');
    });

    it('defines tour_skill with expected step elements', () => {
      const skill = TOUR_DEFINITIONS['tour_skill'];
      expect(skill).toBeDefined();
      expect(skill).toHaveLength(3);
      const elements = skill.map((s) => s.element);
      expect(elements).toContain('.tour-skill-upload');
      expect(elements).toContain('.tour-skill-select');
      expect(elements).toContain('.tour-skill-start');
    });

    it('defines tour_modal_smart_jd with expected step elements', () => {
      const smartJd = TOUR_DEFINITIONS['tour_modal_smart_jd'];
      expect(smartJd).toBeDefined();
      expect(smartJd).toHaveLength(4);
      const elements = smartJd.map((s) => s.element);
      expect(elements).toContain('.tour-smart-jd-input');
      expect(elements).toContain('.tour-smart-jd-parse-btn');
      expect(elements).toContain('.tour-smart-jd-fields');
      expect(elements).toContain('.tour-smart-jd-save');
    });

    it('defines tour_drawer_career_knowledge with expected step elements', () => {
      const career = TOUR_DEFINITIONS['tour_drawer_career_knowledge'];
      expect(career).toBeDefined();
      expect(career).toHaveLength(4);
      const elements = career.map((s) => s.element);
      expect(elements).toContain('.tour-career-facts-list');
      expect(elements).toContain('.tour-career-add-fact');
      expect(elements).toContain('.tour-career-evidence');
      expect(elements).toContain('.tour-career-category-filter');
    });

    it('defines tour_modal_settings with expected step elements', () => {
      const settings = TOUR_DEFINITIONS['tour_modal_settings'];
      expect(settings).toBeDefined();
      expect(settings).toHaveLength(4);
      const elements = settings.map((s) => s.element);
      expect(elements).toContain('.tour-settings-tabs');
      expect(elements).toContain('.tour-settings-reset-tours');
      expect(elements).toContain('.tour-settings-provider-select');
      expect(elements).toContain('.tour-settings-api-key');
    });
  });
});

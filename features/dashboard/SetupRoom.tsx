import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../lib/db';
import { InterviewStatus, SetupFormData } from '../../types';

const SetupRoom: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<SetupFormData>({
    company: 'Tech Corp',
    jobTitle: 'Senior Frontend Engineer',
    interviewerPersona: 'Alex, a strict Engineering Manager who focuses on system design and edge cases.',
    jobDescription: '',
    resumeText: '',
    language: 'en-US'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const id = await db.interviews.add({
        createdAt: Date.now(),
        company: formData.company,
        jobTitle: formData.jobTitle,
        interviewerPersona: formData.interviewerPersona,
        jobDescription: formData.jobDescription,
        resumeText: formData.resumeText,
        language: formData.language,
        status: InterviewStatus.CREATED,
        messages: []
      });

      navigate(`/interview/${id}`);
    } catch (error) {
      console.error("Failed to create interview", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Setup Interview Room</h2>
        <p className="text-slate-500">Configure the AI persona and context for your practice session.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Target Company</label>
            <input
              required
              name="company"
              value={formData.company}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Google, Shopee, Startup..."
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Job Title</label>
            <input
              required
              name="jobTitle"
              value={formData.jobTitle}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Product Manager"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Interviewer Persona</label>
                <textarea
                    required
                    name="interviewerPersona"
                    value={formData.interviewerPersona}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe the interviewer's style..."
                />
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Language</label>
                <select
                    name="language"
                    value={formData.language}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-[58px]"
                >
                    <option value="en-US">English (US)</option>
                    <option value="vi-VN">Tiếng Việt</option>
                </select>
            </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Job Description</label>
          <textarea
            name="jobDescription"
            value={formData.jobDescription}
            onChange={handleChange}
            rows={4}
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Paste the JD here..."
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Resume / CV Content</label>
          <textarea
            name="resumeText"
            value={formData.resumeText}
            onChange={handleChange}
            rows={4}
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Paste your resume text here..."
          />
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Setting up Room...' : 'Enter Interview Room'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SetupRoom;
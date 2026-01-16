import React, { useState } from 'react';
import { SetupFormData } from '@/types';
import { Upload, Loader2, Play } from 'lucide-react';
import { parseResume } from '@/services/resumeParser';
import { useInterview } from '@/hooks/useInterview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const SetupRoom: React.FC = () => {
  const { startNewInterview, isLoading: isStarting } = useInterview();
  const [isParsing, setIsParsing] = useState(false);
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
    await startNewInterview(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    try {
        const text = await parseResume(file);
        setFormData(prev => ({ ...prev, resumeText: text }));
    } catch (error) {
        alert("Failed to parse resume: " + (error as any).message);
    } finally {
        setIsParsing(false);
        e.target.value = ''; 
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-8">
      <Card className="border-none shadow-xl bg-white/90 backdrop-blur-sm">
        <CardHeader className="text-center pb-8">
          <CardTitle className="text-3xl font-bold text-slate-900">Setup Interview Room</CardTitle>
          <CardDescription className="text-lg text-slate-500 mt-2">
            Configure the AI persona and context for your realistic practice session.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label htmlFor="company">Target Company</Label>
                <Input
                  id="company"
                  required
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  placeholder="e.g. Google, Shopee, Startup..."
                  className="h-11"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="jobTitle">Job Title</Label>
                <Input
                  id="jobTitle"
                  required
                  name="jobTitle"
                  value={formData.jobTitle}
                  onChange={handleChange}
                  placeholder="e.g. Product Manager"
                  className="h-11"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label htmlFor="interviewerPersona">Interviewer Persona</Label>
                <Textarea
                  id="interviewerPersona"
                  required
                  name="interviewerPersona"
                  value={formData.interviewerPersona}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Describe the interviewer's style..."
                  className="resize-none"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="language">Language</Label>
                <div className="relative">
                  <select
                    id="language"
                    name="language"
                    value={formData.language}
                    onChange={handleChange}
                    className="flex h-[88px] w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="en-US">English (US)</option>
                    <option value="vi-VN">Tiếng Việt</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="jobDescription">Job Description</Label>
              <Textarea
                id="jobDescription"
                name="jobDescription"
                value={formData.jobDescription}
                onChange={handleChange}
                rows={5}
                placeholder="Paste the JD here..."
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label htmlFor="resumeText">Resume / CV Content</Label>
                <label className={`cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-white border border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-900 h-9 px-4 py-2 ${isParsing ? 'opacity-70 cursor-wait' : ''}`}>
                    {isParsing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    <span>{isParsing ? 'Reading PDF...' : 'Upload PDF/TXT'}</span>
                    <input 
                        type="file" 
                        accept=".pdf,.txt" 
                        className="hidden" 
                        onChange={handleFileUpload}
                        disabled={isParsing}
                    />
                </label>
              </div>
              <Textarea
                id="resumeText"
                name="resumeText"
                value={formData.resumeText}
                onChange={handleChange}
                rows={5}
                placeholder="Paste your resume text here..."
                className="font-mono text-sm"
              />
            </div>

            <div className="pt-6">
              <Button
                type="submit"
                disabled={isStarting}
                className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all hover:scale-[1.01]"
              >
                {isStarting ? (
                    <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Setting up Room...
                    </>
                ) : (
                    <>
                        Enter Interview Room
                        <Play className="ml-2 h-5 w-5 fill-current" />
                    </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SetupRoom;

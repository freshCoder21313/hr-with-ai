import { forwardRef } from 'react';
import { Interview } from '@/types';
import { Trophy, Briefcase, Building, Calendar, Star, CheckCircle } from 'lucide-react';

interface ShareableResultCardProps {
  interview: Interview;
}

const ShareableResultCard = forwardRef<HTMLDivElement, ShareableResultCardProps>(
  ({ interview }, ref) => {
    const score = interview.feedback?.score || 0;
    const strengths = interview.feedback?.strengths || [];
    const badges = interview.feedback?.badges || [];
    const date = new Date(interview.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Determine color scheme based on score
    const getScoreColor = (s: number) => {
      if (s >= 9) return 'from-yellow-400 to-amber-600';
      if (s >= 8) return 'from-emerald-400 to-green-600';
      if (s >= 6) return 'from-blue-400 to-indigo-600';
      return 'from-gray-400 to-slate-600';
    };

    const gradient = getScoreColor(score);

    return (
      <div
        ref={ref}
        className="w-[600px] bg-slate-950 text-white p-6 rounded-xl shadow-2xl relative overflow-hidden font-sans"
        style={{ aspectRatio: '1.91/1' }} // LinkedIn/OG standard ratio (approx 600x314px)
      >
        {/* Background Elements */}
        <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${gradient} opacity-20 blur-3xl rounded-full -mr-16 -mt-16`} />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-600/20 blur-3xl rounded-full -ml-12 -mb-12" />

        <div className="relative z-10 flex flex-col h-full justify-between">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-white/80 uppercase tracking-wider text-xs font-semibold">
                <Briefcase size={14} />
                <span>Interview Result</span>
              </div>
              <h1 className="text-2xl font-bold leading-tight max-w-sm truncate">
                {interview.jobTitle}
              </h1>
              <div className="flex items-center gap-2 text-white/60 text-sm">
                <Building size={14} />
                <span>{interview.company}</span>
              </div>
            </div>
            
            <div className="flex flex-col items-center">
              <div className={`relative flex items-center justify-center w-20 h-20 rounded-full bg-slate-900 border-4 border-transparent bg-clip-padding`}>
                 <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${gradient} -z-10 m-[-4px]`} />
                 <div className="text-center">
                    <span className="text-3xl font-bold block leading-none">{score}</span>
                    <span className="text-[10px] text-white/60 uppercase">Score</span>
                 </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="space-y-3">
              <h3 className="text-xs uppercase tracking-wider text-white/50 font-semibold mb-1">Top Strengths</h3>
              <div className="flex flex-wrap gap-2">
                 {strengths.slice(0, 3).map((strength, i) => (
                   <div key={i} className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg text-sm border border-white/5">
                      <CheckCircle size={14} className="text-emerald-400" />
                      <span className="truncate max-w-[180px]">{strength}</span>
                   </div>
                 ))}
                 {strengths.length === 0 && <span className="text-white/40 italic text-sm">No specific strengths recorded</span>}
              </div>
            </div>

            <div className="space-y-3">
               {badges.length > 0 && (
                 <>
                  <h3 className="text-xs uppercase tracking-wider text-white/50 font-semibold mb-1">Badges Earned</h3>
                  <div className="flex flex-wrap gap-2">
                    {badges.slice(0, 2).map((badge, i) => (
                      <div key={i} className="flex flex-col items-center gap-1">
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
                           <Trophy size={18} className="text-white" />
                        </div>
                        <span className="text-[10px] text-white/80 text-center max-w-[80px] leading-tight">{badge}</span>
                      </div>
                    ))}
                  </div>
                 </>
               )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-end border-t border-white/10 pt-3 mt-auto">
            <div className="flex items-center gap-2 text-white/40 text-xs">
              <Calendar size={12} />
              <span>{date}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Star size={14} className="text-white fill-white" />
              </div>
              <span className="font-bold text-sm tracking-wide">HR With AI</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ShareableResultCard.displayName = 'ShareableResultCard';

export default ShareableResultCard;

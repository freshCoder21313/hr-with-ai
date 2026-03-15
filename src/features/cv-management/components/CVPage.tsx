import React, { useEffect, useState } from 'react';
import { CVWidgetGrid } from './CVWidgetGrid';
import { useCVManagement } from '../hooks/useCVManagement';
import { cn } from '@/lib/utils';

// ICONS (Inline to avoid dependencies)
const ChevronDownIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);
const SyncIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

// --- CV Header Component ---
const CVHeader = () => {
  const { cvList, selectedCvId, listStatus, selectCv, fetchCVList } = useCVManagement();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchCVList();
  }, [fetchCVList]);

  const selectedCv = cvList.find((cv) => cv.id === selectedCvId);

  return (
    <header className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
        CV Management Dashboard
      </h1>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <SyncIcon className={cn('h-4 w-4', listStatus === 'loading' && 'animate-spin')} />
          <span>Synced Just Now</span>
        </div>
        {/* Custom Select Dropdown */}
        <div className="relative w-full md:w-72">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center justify-between w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-left"
          >
            <span className="truncate pr-2">
              {selectedCv ? selectedCv.fileName : 'Select a CV...'}
            </span>
            <ChevronDownIcon
              className={cn('h-5 w-5 transition-transform', isOpen && 'rotate-180')}
            />
          </button>
          {isOpen && (
            <div className="absolute z-10 top-full mt-1 w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md shadow-lg">
              <ul className="py-1 max-h-60 overflow-y-auto">
                {listStatus === 'loading' && (
                  <li className="px-3 py-2 text-sm text-slate-500">Loading...</li>
                )}
                {listStatus !== 'loading' && cvList.length === 0 && (
                  <li className="px-3 py-2 text-sm text-slate-500">No CVs found.</li>
                )}
                {cvList.map((cv) => (
                  <li
                    key={cv.id}
                    onClick={() => {
                      selectCv(cv.id);
                      setIsOpen(false);
                    }}
                    className="px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    <p className="font-medium truncate">{cv.fileName}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(cv.createdAt).toLocaleDateString()}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

// --- Main Page Component ---
export const CVPage: React.FC = () => {
  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <CVHeader />
      <main>
        <CVWidgetGrid />
      </main>
    </div>
  );
};

export default CVPage;

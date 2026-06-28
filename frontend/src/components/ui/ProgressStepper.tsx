import * as React from 'react';
import { DamageReportStatus } from '../../types/damage-reports';

interface ProgressStepperProps {
  currentStatus: DamageReportStatus;
}

const STEPS = [
  { id: 'SUBMITTED', label: 'Gửi yêu cầu' },
  { id: 'REVIEWING', label: 'Đang tiếp nhận' },
  { id: 'IN_PROGRESS', label: 'Đang xử lý' },
  { id: 'COMPLETED', label: 'Hoàn tất' }
];

export function ProgressStepper({ currentStatus }: ProgressStepperProps) {
  if (currentStatus === 'REJECTED') return null;

  const currentIndex = STEPS.findIndex(s => s.id === currentStatus);
  const activeIndex = currentIndex === -1 ? 0 : currentIndex;

  return (
    <div className="mb-6 rounded-2xl bg-background p-6 shadow-sm border border-border/50">
      <div className="relative flex justify-between">
        {/* Connecting Line */}
        <div className="absolute left-0 top-1/2 -z-10 h-1 w-full -translate-y-1/2 bg-muted/50">
          <div 
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${(activeIndex / (STEPS.length - 1)) * 100}%` }}
          />
        </div>

        {STEPS.map((step, index) => {
          const isCompleted = index < activeIndex;
          const isActive = index === activeIndex;
          
          return (
            <div key={step.id} className="flex flex-col items-center">
              <div 
                className={`flex h-10 w-10 items-center justify-center rounded-full border-4 border-white font-bold transition-colors ${
                  isCompleted ? 'bg-emerald-500 text-white' :
                  isActive ? 'bg-emerald-100 text-emerald-600 ring-4 ring-emerald-50' :
                  'bg-muted/50 text-muted-foreground'
                }`}
              >
                {isCompleted ? (
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <span 
                className={`mt-3 text-sm font-semibold ${
                  isActive ? 'text-emerald-700' :
                  isCompleted ? 'text-foreground' :
                  'text-muted-foreground'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

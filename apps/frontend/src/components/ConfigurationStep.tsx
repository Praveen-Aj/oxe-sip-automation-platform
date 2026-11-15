import React from 'react'
import { Check } from 'lucide-react'

export interface ConfigurationStepProps {
  steps: Array<{ id: number; title: string; subtitle: string }>
  currentStep: number
  onStepClick?: (stepId: number) => void
}

export const ConfigurationStep: React.FC<ConfigurationStepProps> = ({
  steps,
  currentStep,
  onStepClick,
}) => {
  return (
    <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
      {steps.map((step, idx) => {
        const isCompleted = step.id < currentStep
        const isCurrent = step.id === currentStep

        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            <button
              type="button"
              disabled={step.id > currentStep}
              onClick={() => onStepClick && onStepClick(step.id)}
              className={`flex items-center gap-2.5 text-left group focus:outline-none ${
                step.id > currentStep ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-bold transition-all ${
                  isCompleted
                    ? 'bg-emerald-600 text-white'
                    : isCurrent
                    ? 'bg-sky-600 text-white ring-4 ring-sky-950'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {isCompleted ? <Check className="w-3.5 h-3.5" /> : step.id}
              </div>
              <div className="hidden sm:block">
                <div
                  className={`text-xs font-semibold ${
                    isCurrent ? 'text-sky-400' : isCompleted ? 'text-slate-200' : 'text-slate-500'
                  }`}
                >
                  {step.title}
                </div>
                <div className="text-[10px] text-slate-500">{step.subtitle}</div>
              </div>
            </button>
            {idx < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-3 ${
                  isCompleted ? 'bg-emerald-600/70' : 'bg-slate-800'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

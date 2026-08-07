"use client";

const STEPS = [
  { n: 1, label: "Contact" },
  { n: 2, label: "Event Basics" },
  { n: 3, label: "Date & Details" },
  { n: 4, label: "Images" },
  { n: 5, label: "Review" },
];

interface WizardStepperProps {
  currentStep: number;
  onNavigate: (step: number) => void;
}

export function WizardStepper({ currentStep, onNavigate }: WizardStepperProps) {
  return (
    <div className="wizard-stepper">
      {STEPS.map((s) => {
        const state = s.n < currentStep ? "done" : s.n === currentStep ? "active" : "pending";
        return (
          <div
            key={s.n}
            className="wizard-step-tab"
            data-state={state}
            onClick={() => {
              if (state === "done") onNavigate(s.n);
            }}
          >
            <span className="wizard-dot">
              <span className="wizard-dot-num">{s.n}</span>
            </span>
            <span className="wizard-step-label">{s.label}</span>
          </div>
        );
      })}
    </div>
  );
}

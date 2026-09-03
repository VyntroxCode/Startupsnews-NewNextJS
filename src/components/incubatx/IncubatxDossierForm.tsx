"use client";

import { AnimatePresence, motion } from "motion/react";
import { RailNav } from "./RailNav";
import { SuccessSequence } from "./SuccessSequence";
import { IdentityStep } from "./steps/IdentityStep";
import { PositioningStep } from "./steps/PositioningStep";
import { MarketModelStep } from "./steps/MarketModelStep";
import { FinancialsTeamStep } from "./steps/FinancialsTeamStep";
import { DocumentsStep } from "./steps/DocumentsStep";
import { ReviewStep } from "./steps/ReviewStep";
import { useIncubatxDossierForm } from "./useIncubatxDossierForm";
import { useReducedMotion } from "./useReducedMotion";
import { stepVariants } from "./motionVariants";

const reducedStepVariants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.1 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

export function IncubatxDossierForm() {
  const ctrl = useIncubatxDossierForm();
  const { currentStep, direction, submitted } = ctrl;
  const reducedMotion = useReducedMotion();

  return (
    <>
      {submitted ? (
        <SuccessSequence reference={submitted.reference} onReset={ctrl.reset} />
      ) : (
        <div className="ix-layout">
          <RailNav currentStep={currentStep} onNavigate={ctrl.goToStep} />
          <form onSubmit={(e) => e.preventDefault()}>
            {/* mode="popLayout" (not "wait") is what makes the outgoing step actually slide out
                one side while the incoming step slides in from the other AT THE SAME TIME —
                "wait" mode fully removes the old step before mounting the new one, so it never
                shows both directions crossing. popLayout pulls the exiting element out of layout
                flow immediately so the heights of two different steps don't fight each other. */}
            {/* Clips the long horizontal travel so a step sliding in from 55% off-frame never
                widens the document and flashes a page-level scrollbar. `clip` rather than
                `hidden` on purpose, and only on the x axis: unlike `hidden`, `clip` does not
                force the other axis to `auto`, so the y axis stays `visible` and the country /
                stage dropdowns can still open past the bottom edge of the step card. */}
            <div className="ix-step-viewport">
            <AnimatePresence mode="popLayout" initial={false} custom={direction}>
              <motion.div
                key={currentStep}
                custom={direction}
                variants={reducedMotion ? reducedStepVariants : stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
                {currentStep === 1 && <IdentityStep ctrl={ctrl} />}
                {currentStep === 2 && <PositioningStep ctrl={ctrl} />}
                {currentStep === 3 && <MarketModelStep ctrl={ctrl} />}
                {currentStep === 4 && <FinancialsTeamStep ctrl={ctrl} />}
                {currentStep === 5 && <DocumentsStep ctrl={ctrl} />}
                {currentStep === 6 && <ReviewStep ctrl={ctrl} />}
              </motion.div>
            </AnimatePresence>
            </div>
          </form>
        </div>
      )}

      <style jsx global>{`
        .incubatx-page {
          --accent: #e91e63;
          --accent-dark: #c2185b;
          --accent-tint: #fce4ec;
          --ink: #14151a;
          --muted: #6b7280;
          --line: #e5e7eb;
          --panel: #ffffff;
          --paper: #ffffff;
          /* --paper is the page ground and is now white, so anything that needs a subtle
             fill INSIDE the white card (the upload dropzone) takes this instead — sharing
             --paper would have left it invisible against the card behind it. */
          --tint: #f7f8fa;
          --amber: #f59e0b;
          --amber-soft: #fef3c7;
          --green: #16a34a;
          --green-soft: #dcfce7;
          --radius: 10px;
          font-family: -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif;
          color: var(--ink);
          background: var(--paper);
          padding: 24px 16px 60px;
        }
        .incubatx-page * { box-sizing: border-box; }
        .incubatx-page .ix-hero { max-width: 1080px; margin: 0 auto 32px; }
        .incubatx-page .ix-hero-kicker {
          display: inline-flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 700; letter-spacing: 1px;
          text-transform: uppercase; color: var(--accent); margin-bottom: 10px;
        }
        .incubatx-page .ix-hero-kicker::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: var(--accent); }
        .incubatx-page .ix-hero h1 { font-size: 30px; font-weight: 700; margin: 0; letter-spacing: -0.3px; }

        .incubatx-page .ix-layout { max-width: 1080px; margin: 0 auto; }
        .incubatx-page .ix-step-viewport { overflow-x: clip; overflow-y: visible; }

        /* Rail — a single continuous progress track behind evenly-spaced nodes (CSS grid, not
           flex+fixed-width connectors, so labels of different lengths never crowd each other). */
        .incubatx-page .ix-rail {
          position: relative; display: grid; grid-template-columns: repeat(6, 1fr);
          margin-bottom: 40px; padding: 4px 6px 0;
        }
        .incubatx-page .ix-rail-track {
          position: absolute; top: 23px; left: 8.3333%; right: 8.3333%; height: 3px;
          background: var(--line); border-radius: 2px; z-index: 0; overflow: hidden;
        }
        .incubatx-page .ix-rail-track-fill { height: 100%; width: 0%; background: var(--green); border-radius: 2px; }
        .incubatx-page .ix-rail-item { display: flex; flex-direction: column; align-items: center; gap: 10px; position: relative; z-index: 1; }
        .incubatx-page .ix-rail-node {
          width: 40px; height: 40px; border-radius: 50%; border: 1.5px solid var(--line); background: var(--panel);
          color: var(--muted); font-size: 14px; font-weight: 700; display: flex; align-items: center; justify-content: center;
          cursor: default; transition: border-color .15s, background-color .15s, color .15s, box-shadow .15s;
        }
        .incubatx-page .ix-rail-node[data-state="active"] {
          border-color: var(--accent); color: var(--accent); background: var(--accent-tint);
          animation: ix-node-pulse 2.4s ease-in-out infinite;
        }
        @keyframes ix-node-pulse {
          0%, 100% { box-shadow: 0 0 0 4px var(--accent-tint); }
          50% { box-shadow: 0 0 0 8px color-mix(in srgb, var(--accent) 22%, transparent); }
        }
        @media (prefers-reduced-motion: reduce) {
          .incubatx-page .ix-rail-node[data-state="active"] { animation: none; box-shadow: 0 0 0 4px var(--accent-tint); }
        }
        .incubatx-page .ix-rail-node[data-state="done"] { border-color: var(--green); color: #fff; background: var(--green); cursor: pointer; }
        .incubatx-page .ix-rail-node:disabled { cursor: not-allowed; }
        .incubatx-page .ix-rail-flag { border-radius: 12px; }
        .incubatx-page .ix-rail-label {
          font-size: 12px; font-weight: 500; color: var(--muted); text-align: center; line-height: 1.3;
          max-width: 100px; padding: 0 4px;
        }

        /* Steps */
        .incubatx-page .ix-step { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); padding: 28px; }
        .incubatx-page .ix-step-head { margin-bottom: 20px; }
        .incubatx-page .ix-step-head h2 { font-size: 20px; font-weight: 700; margin: 0 0 4px; }
        .incubatx-page .ix-step-head p { color: var(--muted); font-size: 13.5px; margin: 0; }
        .incubatx-page .ix-subhead { font-size: 11px; text-transform: uppercase; letter-spacing: .5px; color: var(--muted); font-weight: 600; margin: 20px 0 10px; }

        /* Generic field primitives (FormField / CustomSelect / PhoneField / RepeatableList all
           emit these class names — this page styles them itself, matching the repo's convention
           of no global form CSS, see /submit-event's .snf-page block). */
        .incubatx-page .field { margin-bottom: 18px; }
        .incubatx-page .field label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; }
        .incubatx-page .field input, .incubatx-page .field textarea, .incubatx-page .field select {
          width: 100%; padding: 10px 12px; border: 1.5px solid var(--line); border-radius: 8px;
          font-size: 14px; font-family: inherit; color: var(--ink); background: var(--panel); transition: border-color .15s;
        }
        .incubatx-page .field input:focus, .incubatx-page .field textarea:focus { outline: none; border-color: var(--accent); }
        .incubatx-page .field.has-error input, .incubatx-page .field.has-error textarea { border-color: #dc2626; }
        .incubatx-page .field .opt { font-weight: 400; color: var(--muted); }
        .incubatx-page .field-error { display: none; color: #dc2626; font-size: 12px; margin-top: 5px; }
        .incubatx-page .field-error.visible { display: block; }
        .incubatx-page .error-text { color: #dc2626; font-size: 13px; margin-bottom: 14px; }
        .incubatx-page .ix-field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .incubatx-page .ix-field-row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
        @media (max-width: 640px) { .incubatx-page .ix-field-row, .incubatx-page .ix-field-row-3 { grid-template-columns: 1fr; } }

        /* CustomSelect */
        .incubatx-page .custom-select-wrap { position: relative; }
        .incubatx-page .custom-select-btn, .incubatx-page .custom-select-btn.is-combobox {
          width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 8px;
          padding: 10px 12px; border: 1.5px solid var(--line); border-radius: 8px; background: var(--panel);
          font-size: 14px; cursor: pointer; text-align: left;
        }
        .incubatx-page .custom-select-btn.open { border-color: var(--accent); }
        .incubatx-page .custom-select-btn .cs-input { flex: 1; border: none; outline: none; font: inherit; padding: 0; background: transparent; min-width: 0; }
        .incubatx-page .cs-placeholder { color: #9ca3af; }
        .incubatx-page .caret { font-size: 10px; color: var(--muted); flex-shrink: 0; }
        .incubatx-page .custom-select-list {
          display: none; position: absolute; z-index: 20; top: calc(100% + 6px); left: 0; right: 0; max-height: 240px;
          overflow-y: auto; margin: 0; padding: 5px; list-style: none; background: var(--panel);
          border: 1.5px solid var(--line); border-radius: 10px; box-shadow: 0 12px 32px rgba(15,23,42,0.12);
        }
        .incubatx-page .custom-select-list.open { display: block; }
        .incubatx-page .custom-select-list li { padding: 8px 10px; font-size: 13.5px; border-radius: 6px; cursor: pointer; }
        .incubatx-page .custom-select-list li.active, .incubatx-page .custom-select-list li:hover { background: var(--accent-tint); }
        .incubatx-page .custom-select-list li.cs-empty { color: var(--muted); font-style: italic; cursor: default; }
        .incubatx-page .custom-select-list li.cs-empty:hover { background: transparent; }

        /* Phone field */
        .incubatx-page .phone-row { display: flex; gap: 8px; }
        .incubatx-page .phone-row .custom-select-wrap { flex-shrink: 0; width: 112px; }
        .incubatx-page .phone-row input { flex: 1; min-width: 0; }

        /* Repeatable lists (founders / linkedin use the generic default classes; speakers on
           /submit-event overrides these to speakers-box/speaker-row, unaffected by this block). */
        .incubatx-page .ix-list-label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 8px; }
        .incubatx-page .repeatable-box { display: flex; flex-direction: column; gap: 8px; margin-bottom: 18px; }
        .incubatx-page .repeatable-row { display: flex; gap: 8px; align-items: center; }
        .incubatx-page .ix-row-input { flex: 1; padding: 10px 12px; border: 1.5px solid var(--line); border-radius: 8px; font-size: 14px; font-family: inherit; }
        .incubatx-page .ix-row-input:focus { outline: none; border-color: var(--accent); }
        .incubatx-page .sp-remove-btn {
          background: none; border: 1.5px solid var(--line); color: var(--muted); border-radius: 8px;
          height: 40px; width: 40px; cursor: pointer; font-size: 13px; flex-shrink: 0;
        }
        .incubatx-page .sp-remove-btn:hover { border-color: #dc2626; color: #dc2626; }
        .incubatx-page .add-link { align-self: flex-start; background: none; border: none; color: var(--accent); font-size: 13px; font-weight: 600; cursor: pointer; padding: 4px 0; }
        .incubatx-page .add-link:hover { text-decoration: underline; }

        /* Description guided prompts */
        .incubatx-page .ix-prompt-checklist { display: flex; flex-wrap: wrap; gap: 8px 16px; list-style: none; margin: 0 0 10px; padding: 0; }
        .incubatx-page .ix-prompt-checklist li { font-size: 12.5px; color: var(--muted); display: flex; align-items: center; gap: 5px; }
        .incubatx-page .ix-prompt-checklist li[data-done="true"] { color: var(--green); font-weight: 600; }
        .incubatx-page .ix-prompt-glyph { font-size: 12px; }
        .incubatx-page .ix-field-meta { display: flex; justify-content: space-between; font-size: 11.5px; color: var(--muted); margin-top: 6px; }

        /* Segmented control (Q14 yes/no) */
        .incubatx-page .ix-segmented { display: inline-flex; border: 1.5px solid var(--line); border-radius: 8px; overflow: hidden; }
        .incubatx-page .ix-segmented button { padding: 9px 22px; border: none; background: var(--panel); font-size: 14px; font-weight: 600; color: var(--muted); cursor: pointer; }
        .incubatx-page .ix-segmented button.active { background: var(--accent); color: #fff; }

        /* Soft warnings — amber, never blocking */
        .incubatx-page .ix-soft-warning { background: var(--amber-soft); color: #92400e; border-radius: 8px; padding: 9px 12px; font-size: 12.5px; margin-top: -6px; margin-bottom: 18px; }

        /* Documents checklist */
        .incubatx-page .ix-doc-checklist { display: flex; flex-direction: column; gap: 12px; }
        .incubatx-page .ix-doc-row { border: 1.5px solid var(--line); border-radius: 10px; padding: 14px 16px; }
        .incubatx-page .ix-doc-row.has-error { border-color: #dc2626; }
        .incubatx-page .ix-doc-row-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; gap: 10px; }
        .incubatx-page .ix-doc-name { font-size: 14px; font-weight: 600; }
        .incubatx-page .ix-doc-tag { font-size: 11px; color: var(--muted); }
        .incubatx-page .ix-doc-tag.required { color: var(--accent); font-weight: 600; }
        .incubatx-page .ix-dropzone {
          display: flex; align-items: center; justify-content: center; text-align: center; gap: 8px;
          border: 1.5px dashed var(--line); border-radius: 8px; padding: 18px; font-size: 12.5px; color: var(--muted);
          cursor: pointer; background: var(--tint);
        }
        .incubatx-page .ix-dropzone:hover { border-color: var(--accent); color: var(--accent); }
        .incubatx-page .ix-dropzone input { display: none; }
        .incubatx-page .ix-upload-progress { border: 1.5px solid var(--line); border-radius: 8px; padding: 12px 14px; }
        .incubatx-page .ix-upload-progress-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: 12.5px; }
        .incubatx-page .ix-upload-progress-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .incubatx-page .ix-upload-progress-row button { background: none; border: none; color: var(--muted); cursor: pointer; font-size: 12px; flex-shrink: 0; }
        .incubatx-page .ix-upload-progress-row button:hover { color: #dc2626; }
        .incubatx-page .ix-upload-progress-bar { height: 6px; border-radius: 3px; background: var(--line); overflow: hidden; }
        .incubatx-page .ix-upload-progress-bar div { height: 100%; background: var(--accent); transition: width .15s ease; }
        .incubatx-page .ix-doc-chip { display: flex; align-items: center; gap: 10px; background: var(--green-soft); border-radius: 8px; padding: 8px 12px; font-size: 13px; }
        .incubatx-page .ix-doc-chip-name { font-weight: 600; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .incubatx-page .ix-doc-chip-size { color: var(--muted); font-size: 12px; }
        .incubatx-page .ix-doc-chip button { background: none; border: none; color: var(--muted); cursor: pointer; font-size: 13px; }
        .incubatx-page .ix-doc-chip button:hover { color: #dc2626; }

        /* Review */
        .incubatx-page .ix-review-section { margin-bottom: 22px; padding-bottom: 18px; border-bottom: 1px solid var(--line); }
        .incubatx-page .ix-review-section:last-of-type { border-bottom: none; }
        .incubatx-page .ix-review-section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
        .incubatx-page .ix-review-section-head h3 { font-size: 14px; font-weight: 700; margin: 0; }
        .incubatx-page .ix-edit-link { background: none; border: none; color: var(--accent); font-size: 12.5px; font-weight: 600; cursor: pointer; }
        .incubatx-page .ix-edit-link:hover { text-decoration: underline; }
        .incubatx-page .ix-review-row { display: flex; gap: 12px; padding: 6px 0; font-size: 13.5px; }
        .incubatx-page .ix-review-row .k { width: 200px; flex-shrink: 0; color: var(--muted); }
        .incubatx-page .ix-review-row .v { flex: 1; word-break: break-word; }
        .incubatx-page .ix-honeypot { position: absolute; left: -9999px; width: 1px; height: 1px; opacity: 0; }

        /* Nav + buttons (Button.tsx emits these class names) */
        .incubatx-page .wizard-nav { display: flex; justify-content: space-between; margin-top: 24px; }
        .incubatx-page .wizard-nav.no-back { justify-content: flex-end; }
        .incubatx-page .btn-primary {
          background: var(--accent); color: #fff; border: none; border-radius: 8px; padding: 11px 24px;
          font-size: 14px; font-weight: 600; cursor: pointer; transition: background-color .15s;
        }
        .incubatx-page .btn-primary:hover { background: var(--accent-dark); }
        .incubatx-page .btn-primary:disabled { background: var(--line); color: var(--muted); cursor: not-allowed; }
        .incubatx-page .btn-ghost {
          background: none; color: var(--ink); border: 1.5px solid var(--line); border-radius: 8px; padding: 11px 24px;
          font-size: 14px; font-weight: 600; cursor: pointer;
        }
        .incubatx-page .btn-ghost:hover { border-color: var(--accent); color: var(--accent); }
        .incubatx-page .btn-ghost:disabled { color: var(--muted); cursor: not-allowed; }

        .incubatx-page .ix-success-stub { max-width: 480px; margin: 60px auto; text-align: center; }
        .incubatx-page .ix-success-stub .mark { width: 56px; height: 56px; border-radius: 50%; background: var(--green-soft); color: var(--green); font-size: 26px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
        .incubatx-page .ix-success-stub h2 { font-size: 22px; margin: 0 0 14px; }
        .incubatx-page .ix-success-meta p { color: var(--muted); margin: 0 0 8px; font-size: 14px; }
        .incubatx-page .ix-ref { color: var(--ink); font-size: 16px; letter-spacing: 0.5px; }
        .incubatx-page .ix-ref-char { display: inline-block; }
        .incubatx-page .ix-success-next { margin-bottom: 22px !important; }
        .incubatx-page .ix-success-actions { display: flex; justify-content: center; }
      `}</style>
    </>
  );
}

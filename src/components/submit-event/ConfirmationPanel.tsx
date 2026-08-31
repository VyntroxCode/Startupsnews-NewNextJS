"use client";

import { WhatHappensNext } from "./WhatHappensNext";
import { Button } from "@/components/ui/Button";

interface ConfirmationPanelProps {
  organizerFirstName: string;
  title: string;
  organizerEmail: string;
  whenText: string;
  whereText: string;
  referenceId: string;
  onSubmitAnother: () => void;
}

export function ConfirmationPanel({
  organizerFirstName,
  title,
  organizerEmail,
  whenText,
  whereText,
  referenceId,
  onSubmitAnother,
}: ConfirmationPanelProps) {
  return (
    <div className="confirm-panel">
      <div className="mark">✓</div>
      <h2>You&apos;re all set — event submitted!</h2>
      <p>
        Thanks, {organizerFirstName || "there"}. <b>{title}</b> details have been received and are now with our
        editorial team for review. Once it&apos;s approved and live on www.StartupNews.fyi, we&apos;ll email you at{" "}
        <b>{organizerEmail}</b> with the published link — we&apos;ll also reach out to you if we need anything else
        required.
      </p>
      <div className="confirm-summary">
        <div className="row">
          <span className="k">Event</span>
          <span className="v">{title}</span>
        </div>
        <div className="row">
          <span className="k">When</span>
          <span className="v">{whenText}</span>
        </div>
        <div className="row">
          <span className="k">Where</span>
          <span className="v">{whereText}</span>
        </div>
      </div>
      <WhatHappensNext activeIndex={1} />
      <div className="confirm-id">Reference: {referenceId}</div>
      <div>
        <Button variant="ghost" onClick={onSubmitAnother}>
          Submit another event
        </Button>
      </div>
    </div>
  );
}

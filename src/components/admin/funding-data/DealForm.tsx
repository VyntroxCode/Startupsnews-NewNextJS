'use client';

import { useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import type { FundingDealInput } from '@/modules/funding-deals/domain/types';
import { parseAmountToUsdMn } from '@/modules/funding-deals/utils/parse-amount';
import { formatUsdMn } from '@/modules/funding-deals/utils/format';
import { btnPrimary, btnSecondary, inputCls, labelCls } from './ui';

export const EMPTY_DEAL: Required<FundingDealInput> = {
  date: '',
  startupName: '',
  sector: '',
  businessModel: '',
  roundStage: '',
  amountRaw: '',
  city: '',
  country: 'India',
  leadInvestor: '',
  investors: '',
  sourceUrl: '',
};

const STAGE_SUGGESTIONS = ['Pre-Seed', 'Seed', 'Pre-Series A', 'Series A', 'Series B', 'Series C', 'Series D', 'Series E+', 'Growth', 'Debt', 'Bridge', 'Undisclosed'];
const MODEL_SUGGESTIONS = ['B2B', 'B2C', 'B2B2C', 'D2C', 'Marketplace'];

interface DealFormProps {
  initial?: Required<FundingDealInput>;
  submitLabel: string;
  onSubmit: (values: Required<FundingDealInput>) => Promise<string | null>;
  onCancel?: () => void;
  /** Clear the form after a successful save (manual entry) instead of keeping it (edit). */
  resetOnSuccess?: boolean;
}

/** The deal fields — shared by Manual Entry and the Manage Records edit dialog. */
export default function DealForm({ initial = EMPTY_DEAL, submitLabel, onSubmit, onCancel, resetOnSuccess }: DealFormProps) {
  const [values, setValues] = useState<Required<FundingDealInput>>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof FundingDealInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  const parsed = values.amountRaw ? parseAmountToUsdMn(values.amountRaw) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.date || !values.startupName.trim()) {
      setError('Date and startup name are required.');
      return;
    }
    setSaving(true);
    setError(null);
    const err = await onSubmit(values);
    setSaving(false);
    if (err) setError(err);
    else if (resetOnSuccess) setValues({ ...EMPTY_DEAL, country: values.country });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor="fd-date">Date *</label>
          <input id="fd-date" type="date" required className={inputCls} value={values.date} onChange={set('date')} />
        </div>
        <div>
          <label className={labelCls} htmlFor="fd-name">Startup name *</label>
          <input id="fd-name" type="text" required maxLength={255} placeholder="e.g. Yulu" className={inputCls} value={values.startupName} onChange={set('startupName')} />
        </div>
        <div>
          <label className={labelCls} htmlFor="fd-sector">Sector</label>
          <input id="fd-sector" type="text" maxLength={150} placeholder="e.g. Clean Tech" className={inputCls} value={values.sector} onChange={set('sector')} />
        </div>
        <div>
          <label className={labelCls} htmlFor="fd-model">Business model</label>
          <input id="fd-model" type="text" list="fd-model-list" maxLength={50} placeholder="e.g. B2C" className={inputCls} value={values.businessModel} onChange={set('businessModel')} />
          <datalist id="fd-model-list">{MODEL_SUGGESTIONS.map((m) => <option key={m} value={m} />)}</datalist>
        </div>
        <div>
          <label className={labelCls} htmlFor="fd-stage">Round stage</label>
          <input id="fd-stage" type="text" list="fd-stage-list" maxLength={100} placeholder="e.g. Series C" className={inputCls} value={values.roundStage} onChange={set('roundStage')} />
          <datalist id="fd-stage-list">{STAGE_SUGGESTIONS.map((s) => <option key={s} value={s} />)}</datalist>
        </div>
        <div>
          <label className={labelCls} htmlFor="fd-amount">Round size</label>
          <input id="fd-amount" type="text" maxLength={100} placeholder="e.g. $93 Mn, ₹50 Cr, Undisclosed" className={inputCls} value={values.amountRaw} onChange={set('amountRaw')} />
          <p className="m-0 mt-1 text-[11px] text-slate-500">
            {values.amountRaw ? (parsed === null ? 'Saved as undisclosed' : `Saved as ${formatUsdMn(parsed)}`) : 'Leave blank if undisclosed'}
          </p>
        </div>
        <div>
          <label className={labelCls} htmlFor="fd-city">City</label>
          <input id="fd-city" type="text" maxLength={150} placeholder="e.g. Bengaluru" className={inputCls} value={values.city} onChange={set('city')} />
        </div>
        <div>
          <label className={labelCls} htmlFor="fd-country">Country</label>
          <input id="fd-country" type="text" maxLength={100} placeholder="e.g. India" className={inputCls} value={values.country} onChange={set('country')} />
        </div>
        <div>
          <label className={labelCls} htmlFor="fd-lead">Lead investor</label>
          <input id="fd-lead" type="text" maxLength={255} placeholder="e.g. GEF Capital" className={inputCls} value={values.leadInvestor} onChange={set('leadInvestor')} />
        </div>
        <div>
          <label className={labelCls} htmlFor="fd-investors">All investors</label>
          <input id="fd-investors" type="text" placeholder="Comma-separated" className={inputCls} value={values.investors} onChange={set('investors')} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls} htmlFor="fd-source">Source URL</label>
          <input id="fd-source" type="url" maxLength={1000} placeholder="https://" className={inputCls} value={values.sourceUrl} onChange={set('sourceUrl')} />
        </div>
      </div>

      {error && <p className="m-0 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button type="submit" className={btnPrimary} disabled={saving}>
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" className={btnSecondary} onClick={onCancel} disabled={saving}>Cancel</button>
        )}
      </div>
    </form>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { FormField } from "@/components/ui/FormField";
import { PhoneField } from "@/components/ui/PhoneField";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { CountryCityFields } from "@/components/submit-event/CountryCityFields";
import {
  PACKAGE_INCLUSIONS,
  packageFor,
  PARTICIPATION_OPTIONS,
  PARTICIPATION_OTHERS,
  REQUIREMENT_MAX_LENGTH,
  type ParticipationPackage,
} from "@/modules/ens-travel-enquiries/domain/participation";
import {
  FOUND_US_DETAIL_MAX_LENGTH,
  FOUND_US_OPTIONS,
  FOUND_US_OTHERS,
  REFERRED_BY_OPTIONS,
} from "@/modules/ens-travel-enquiries/domain/sources";
import { JourneyField, fieldVariants } from "./JourneyField";
import { EASE, useReducedMotion } from "./hooks";
import type { JourneyFormController } from "./useJourneyForm";

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  );
}

const PARTICIPATION_SELECT_OPTIONS = PARTICIPATION_OPTIONS.map((option) => ({
  value: option.value,
  label: option.label,
}));
const REFERRED_BY_SELECT_OPTIONS = REFERRED_BY_OPTIONS.map((option) => ({ value: option.value, label: option.label }));
const FOUND_US_SELECT_OPTIONS = FOUND_US_OPTIONS.map((option) => ({ value: option.value, label: option.label }));

/** A labelled dropdown on this form — "Participating As", "Referred By", "How Did You Find Us".
 * The site's own `CustomSelect`, the same control Country and City use, so it looks and behaves
 * like its neighbours. It takes no id or label association of its own, so the wrapper carries the
 * id (`field-<id>`, for focus on an invalid submit) and the select is named through `ariaLabel`. */
function SelectField({
  id,
  label,
  required,
  options,
  placeholder,
  value,
  error,
  onChange,
  onLeave,
}: {
  id: string;
  label: string;
  required?: boolean;
  options: { value: string; label: string }[];
  placeholder: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  onLeave: () => void;
}) {
  return (
    <div className={"field" + (error ? " has-error" : "")} id={`field-${id}`}>
      <label id={`label-${id}`}>
        {label}
        {required ? " *" : ""}
        {required ? null : <span className="opt"> (optional)</span>}
      </label>
      <CustomSelect
        options={options}
        value={value}
        onChange={onChange}
        onBlurValidate={onLeave}
        placeholder={placeholder}
        ariaLabel={label}
      />
      <div className={"field-error" + (error ? " visible" : "")} id={`err-${id}`} aria-live="polite">
        {error}
      </div>
    </div>
  );
}

/** The box that opens under "How Did You Find Us" once "Others" is picked — the same fold-open
 * row as ParticipationDetail, holding one text field for the visitor's own words. */
function FoundUsDetail({
  foundUs,
  detail,
  error,
  onChange,
  onBlur,
}: {
  foundUs: string;
  detail: string;
  error?: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const isOthers = foundUs === FOUND_US_OTHERS;
  const wasOthers = useRef(isOthers);

  useEffect(() => {
    if (isOthers && !wasOthers.current) {
      wasOthers.current = true;
      const t = window.setTimeout(
        () => document.getElementById("f-ens-jf-found-us-detail")?.focus(),
        reducedMotion ? 0 : 700
      );
      return () => window.clearTimeout(t);
    }
    wasOthers.current = isOthers;
  }, [isOthers, reducedMotion]);

  return (
    <AnimatePresence initial={false}>
      {isOthers && (
        <motion.div
          key="found-us-detail"
          className="ens-jf-cell is-wide ens-jf-detail"
          style={{ overflow: "hidden" }}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.34, ease: EASE }}
        >
          <div className="ens-jf-detail-inner">
            <div className="ens-jf-requirement">
              <FormField
                id="ens-jf-found-us-detail"
                label="Where Did You Find Us?"
                required
                maxLength={FOUND_US_DETAIL_MAX_LENGTH}
                placeholder="e.g. a friend, a WhatsApp group, an event"
                value={detail}
                error={error}
                onChange={onChange}
                onBlur={onBlur}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const PACKAGE_NAME: Record<ParticipationPackage, string> = {
  delegate: "Delegation",
  booth: "Booth / POD",
};

/** What the chosen package includes, as a compact ticked list. Same data as the participation-fee
 * cards above the form (PACKAGE_INCLUSIONS), so what the reader was shown there is what they see
 * confirmed here. */
function InclusionsBox({ pack }: { pack: ParticipationPackage }) {
  const reducedMotion = useReducedMotion();
  return (
    <div className={`ens-jf-inclusions is-${pack}`} role="region" aria-label={`${PACKAGE_NAME[pack]} inclusions`}>
      <p className="ens-jf-inclusions-head">
        <span className="ens-jf-inclusions-title">Inclusions</span>
        <span className="ens-jf-inclusions-tag">{PACKAGE_NAME[pack]}</span>
      </p>
      <ul className="ens-jf-inclusions-list">
        {PACKAGE_INCLUSIONS[pack].map((item, i) => (
          <motion.li
            key={item.text}
            className={item.highlight ? "is-highlight" : undefined}
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: reducedMotion ? 0 : 0.18 + i * 0.05, ease: EASE }}
          >
            <span className="ens-jf-inclusions-tick" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5.5 12.5 10 17l8.5-9.5" />
              </svg>
            </span>
            {item.text}
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

/** The full-width row that opens under "Participating As", showing whatever the choice calls for:
 *
 *   a delegate option  →  the delegation inclusions
 *   a booth option     →  the booth / POD inclusions
 *   Others             →  a required free-text box for the visitor's own requirement
 *   nothing yet        →  nothing
 *
 * Each of those is its own keyed state, so switching between them folds the row shut and opens it
 * again with the new content; switching between the one- and two-person versions of the same
 * package leaves it alone. The row unfolds as its own line rather than inside the dropdown's cell,
 * so the Contact / Participating row stays level; it clips while its height animates, and is padded
 * just wide enough that the textarea's focus ring still fits inside the clip (`.ens-jf-detail`). */
function ParticipationDetail({
  participation,
  requirement,
  requirementError,
  onRequirementChange,
  onRequirementBlur,
}: {
  participation: string;
  requirement: string;
  requirementError?: string;
  onRequirementChange: (value: string) => void;
  onRequirementBlur: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const isOthers = participation === PARTICIPATION_OTHERS;
  const pack = packageFor(participation);
  const kind = isOthers ? "others" : pack;
  const wasOthers = useRef(isOthers);

  // Picking "Others" is a request to type: put the cursor in the box once it has opened. Only on
  // the change to "Others", never on first render.
  useEffect(() => {
    if (isOthers && !wasOthers.current) {
      wasOthers.current = true;
      const t = window.setTimeout(
        () => document.getElementById("f-ens-jf-requirement")?.focus(),
        reducedMotion ? 0 : 700
      );
      return () => window.clearTimeout(t);
    }
    wasOthers.current = isOthers;
  }, [isOthers, reducedMotion]);

  return (
    <AnimatePresence mode="wait" initial={false}>
      {kind && (
        <motion.div
          key={kind}
          className="ens-jf-cell is-wide ens-jf-detail"
          style={{ overflow: "hidden" }}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.34, ease: EASE }}
        >
          <div className="ens-jf-detail-inner">
            {kind === "others" ? (
              <div className="ens-jf-requirement">
                <FormField
                  id="ens-jf-requirement"
                  label="Your Requirement"
                  required
                  type="textarea"
                  rows={4}
                  maxLength={REQUIREMENT_MAX_LENGTH}
                  placeholder="Tell us how you'd like to take part, and anything we should know"
                  value={requirement}
                  error={requirementError}
                  hint={`${requirement.length} / ${REQUIREMENT_MAX_LENGTH}`}
                  onChange={onRequirementChange}
                  onBlur={onRequirementBlur}
                />
              </div>
            ) : (
              <InclusionsBox pack={kind} />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** The fields, then the call to action.
 *
 * Every control is the site's own: `FormField` for the two text fields, `ui/PhoneField` for the
 * dial code and number (which brings the per-country length rules with it), and
 * `submit-event/CountryCityFields` for Country and City — the searchable country list with an
 * "Other (add manually)" escape, and the city list that reads the admin Partnership Tracker's
 * curated cities. That is the same set, in the same components, as /feature-your-startup,
 * /submit-funding-round and /submit-press-release; only the skin is this page's.
 *
 * Layout: two columns on a wide screen, one from 719px down —
 *
 *     Full Name          Participating As
 *     Inclusions / Your Requirement   (full width — see ParticipationDetail)
 *     Email Address      Contact Number
 *     Country            City
 *     Referred By        How Did You Find Us
 *     Where Did You Find Us?          (full width, only under "Others" — see FoundUsDetail)
 *
 * Email beside phone and country beside city is the pairing every lead page on the site uses;
 * Participating As sits beside the name by request, with the inclusions (or the requirement box)
 * opening directly under that row. Country comes before City because the City list is built from
 * whatever Country holds — a City field placed above it could only say "Select a country first".
 *
 * No field shows a message until it has been left once or Register has been pressed — see
 * `showError` in useJourneyForm.
 *
 * Nothing here watches the viewport itself: the form element carries the whole reveal and each row
 * reads its delay from it through `fieldVariants`. */
export function JourneyForm({
  form,
  promotedCities,
}: {
  form: JourneyFormController;
  promotedCities?: Record<string, string[]>;
}) {
  const reducedMotion = useReducedMotion();
  const { data, submitting, submitError, showError } = form;

  // Matches hooks.ts's useRise: the reduced-motion path must still land on the visible state,
  // because the preference only arrives after the element has mounted on its hidden `initial`.
  const reveal = reducedMotion
    ? ({ initial: false, animate: "show" } as const)
    : ({ initial: "hidden", whileInView: "show", viewport: { once: true, amount: 0.15 } } as const);

  return (
    <motion.form
      className="ens-jf"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        form.submit();
      }}
      {...reveal}
      // Hands the card over to the success state: the form lifts and fades rather than vanishing,
      // and the card animates its own height across the swap (see the `layout` on
      // .ens-journey-panel in PlanYourJourney).
      exit={
        reducedMotion
          ? { opacity: 0, transition: { duration: 0.2 } }
          : { opacity: 0, y: -12, transition: { duration: 0.4, ease: EASE } }
      }
    >
      <div className="ens-jf-grid">
        <JourneyField index={0}>
          <FormField
            id="ens-jf-name"
            label="Full Name"
            required
            placeholder="Enter your full name"
            maxLength={120}
            value={data.name}
            error={showError("name")}
            onChange={(v) => form.update({ name: v }, "name")}
            onBlur={() => form.blurValidate("name")}
          />
        </JourneyField>

        <JourneyField index={1}>
          <SelectField
            id="ens-jf-participation"
            label="Participating As"
            required
            options={PARTICIPATION_SELECT_OPTIONS}
            placeholder="Select how you're participating"
            value={data.participation}
            error={showError("participation")}
            // The requirement box's need depends on this choice, so it is re-checked too.
            onChange={(v) => form.update({ participation: v }, ["participation", "requirement"])}
            /* false: leaving a dropdown is not answering it — see blurValidate. */
            onLeave={() => form.blurValidate("participation", false)}
          />
        </JourneyField>

        <ParticipationDetail
          participation={data.participation}
          requirement={data.requirement}
          requirementError={showError("requirement")}
          onRequirementChange={(v) => form.update({ requirement: v }, "requirement")}
          onRequirementBlur={() => form.blurValidate("requirement")}
        />

        <JourneyField index={2}>
          <FormField
            id="ens-jf-email"
            label="Email Address"
            required
            type="email"
            placeholder="Enter your email address"
            maxLength={160}
            value={data.email}
            error={showError("email")}
            onChange={(v) => form.update({ email: v }, "email")}
            onBlur={() => form.blurValidate("email")}
          />
        </JourneyField>

        <JourneyField index={3}>
          <PhoneField
            id="ens-jf-phone"
            label="Contact Number"
            phoneCode={data.phoneCode}
            phoneCodeCustom={data.phoneCodeCustom}
            phoneNumber={data.phoneNumber}
            error={showError("phone")}
            /* update(), not a bare setter: PhoneField fires onBlurValidate straight after a code
               change, and that validates the state as it was BEFORE the change landed. If an error
               was already on screen it would be re-asserted from stale values and stick. Queuing a
               re-check against the committed data clears it on the next commit — the same reason
               /feature-your-startup uses updateAndMaybeValidate here. */
            onChangeCode={(v) => form.update({ phoneCode: v }, "phone")}
            onChangeCustomCode={(v) => form.update({ phoneCodeCustom: v }, "phone")}
            onChangeNumber={(v) => form.update({ phoneNumber: v }, "phone")}
            onBlurValidate={() => form.blurValidate("phone")}
          />
        </JourneyField>

        {/* Country and City arrive as one row from the shared component, so this cell spans the
            grid and lets that component's own `.field-row` do the splitting. */}
        <JourneyField index={4} wide>
          <CountryCityFields
            country={data.country}
            countryOther={data.countryOther}
            city={data.city}
            cityOther={data.cityOther}
            countryError={showError("country")}
            cityError={showError("city")}
            promotedCities={promotedCities}
            onChangeCountry={(v) => form.update({ country: v }, "country")}
            onChangeCountryOther={(v) => form.update({ countryOther: v }, "country")}
            onChangeCity={(v) => form.update({ city: v }, "city")}
            onChangeCityOther={(v) => form.update({ cityOther: v }, "city")}
            /* false: leaving a dropdown is not answering it — see blurValidate. These two speak
               only once Register has been pressed. */
            onBlurCountry={() => form.blurValidate("country", false)}
            onBlurCity={() => form.blurValidate("city", false)}
          />
        </JourneyField>

        {/* Where the enquiry came from: the partner who referred them (optional) and the channel
            they found the event through, with a box for their own words under "Others". */}
        <JourneyField index={5}>
          <SelectField
            id="ens-jf-referred-by"
            label="Referred By"
            options={REFERRED_BY_SELECT_OPTIONS}
            placeholder="Select a referrer, if any"
            value={data.referredBy}
            error={showError("referredBy")}
            onChange={(v) => form.update({ referredBy: v }, "referredBy")}
            onLeave={() => form.blurValidate("referredBy", false)}
          />
        </JourneyField>

        <JourneyField index={6}>
          <SelectField
            id="ens-jf-found-us"
            label="How Did You Find Us"
            required
            options={FOUND_US_SELECT_OPTIONS}
            placeholder="Select an option"
            value={data.foundUs}
            error={showError("foundUs")}
            // The detail box's need depends on this choice, so it is re-checked too.
            onChange={(v) => form.update({ foundUs: v }, ["foundUs", "foundUsDetail"])}
            onLeave={() => form.blurValidate("foundUs", false)}
          />
        </JourneyField>

        <FoundUsDetail
          foundUs={data.foundUs}
          detail={data.foundUsDetail}
          error={showError("foundUsDetail")}
          onChange={(v) => form.update({ foundUsDetail: v }, "foundUsDetail")}
          onBlur={() => form.blurValidate("foundUsDetail")}
        />
      </div>

      <motion.div className="ens-jf-actions" variants={fieldVariants} custom={7}>
        <button type="submit" className="ens-jf-submit" disabled={submitting} aria-busy={submitting}>
          <span className="ens-btn-shine" aria-hidden="true" />
          <span className="ens-jf-submit-label">{submitting ? "Submitting…" : "Register Your Interest"}</span>
          <span className="ens-jf-submit-icon" aria-hidden="true">
            {submitting ? <span className="ens-jf-spinner" /> : <ArrowIcon />}
          </span>
        </button>

        <p className={"ens-jf-submit-error" + (submitError ? " is-visible" : "")} role="alert">
          {submitError}
        </p>

        <p className="ens-jf-note">Your details are used only to help plan your Expand North Star visit.</p>
      </motion.div>
    </motion.form>
  );
}

/** How many copies of the line sit in each of the two identical groups — enough to overfill the
 * widest screen, so the loop never shows a gap. */
const COPIES = 8;

function Sparkle() {
  return (
    <svg className="ens-ticker-star" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0c.7 6.3 5 10.9 12 12-7 1.1-11.3 5.7-12 12-.7-6.3-5-10.9-12-12C7 10.9 11.3 6.3 12 0z" />
    </svg>
  );
}

function Group() {
  return (
    <div className="ens-ticker-group">
      {Array.from({ length: COPIES }, (_, i) => (
        <span className="ens-ticker-item" key={i}>
          {/* One span, so the item's flex gap sits only between the line and the sparkle — bare
              text, <sup> and text would each become a flex item and get pushed apart. */}
          <span className="ens-ticker-text">
            12<sup>th</sup>&nbsp;Indian Startup Delegation to Dubai
          </span>
          <Sparkle />
        </span>
      ))}
    </div>
  );
}

/** The green running strip above the event bar: "12th Indian Startup Delegation to Dubai",
 * styled after the delegation artwork (bright green, heavy black Montserrat).
 *
 * Pure CSS: the track holds two identical groups and slides left by exactly one group (-50%), so
 * the loop is seamless. It pauses on hover and stands still under reduced motion. Screen readers get
 * the line once; the moving copies are hidden from them. */
export function EnsTicker() {
  return (
    <div className="ens-ticker">
      <p className="ens-sr-only">12th Indian Startup Delegation to Dubai</p>
      <div className="ens-ticker-track" aria-hidden="true">
        <Group />
        <Group />
      </div>
    </div>
  );
}

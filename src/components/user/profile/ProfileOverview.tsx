'use client';

import { motion, useReducedMotion } from 'motion/react';
import ProfileCompletion from './ProfileCompletion';
import SectionDivider from './SectionDivider';
import InfoItem from './InfoItem';
import { PhoneIcon, MapPinIcon, GlobeIcon, LinkedinIcon, LinkIcon, TagIcon, BriefcaseIcon, UserIcon, PencilIcon } from './icons';

interface Props {
  isMobile: boolean;
  name: string;
  email: string;
  initials: string;
  avatarBg: string;
  categoryLabel?: string | null;
  phone?: string | null;
  city?: string | null;
  country?: string | null;
  linkedinUrl?: string | null;
  website?: string | null;
  sectorLabel?: string | null;
  bio?: string | null;
  percent: number | null;
  onEdit: () => void;
}

export default function ProfileOverview({
  isMobile, name, email, initials, avatarBg, categoryLabel,
  phone, city, country, linkedinUrl, website, sectorLabel, bio,
  percent, onEdit,
}: Props) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: reducedMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="up-card"
      style={{
        background: '#fff', borderRadius: 20, border: '1px solid #e5e7eb', overflow: 'hidden',
        boxShadow: '0 1px 4px rgba(15,23,42,0.04)', marginBottom: '1.5rem', position: 'relative',
      }}
    >
      {/* Subtle brand glow, decorative only */}
      <div aria-hidden style={{
        position: 'absolute', top: -80, right: -80, width: 260, height: 260, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(238,23,97,0.06) 0%, rgba(238,23,97,0) 70%)',
        pointerEvents: 'none',
      }} />

      {/* Identity */}
      <div style={{ padding: isMobile ? '1.5rem 1.25rem' : '1.75rem 2rem', position: 'relative' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, minWidth: 0 }}>
            <motion.div
              initial={reducedMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={reducedMotion ? undefined : { scale: 1.03 }}
              transition={{ duration: 0.5, delay: reducedMotion ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
              style={{
                width: 68, height: 68, borderRadius: 18, flexShrink: 0,
                background: `linear-gradient(135deg, ${avatarBg}, ${avatarBg}cc)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 900, fontSize: 26,
                boxShadow: `0 8px 20px ${avatarBg}40`,
              }}
            >
              {initials}
            </motion.div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>{name}</h2>
                {categoryLabel && (
                  <span style={{
                    fontSize: '0.6875rem', fontWeight: 700, color: '#c8114d', background: '#fde8f0',
                    padding: '3px 9px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.03em',
                  }}>
                    {categoryLabel}
                  </span>
                )}
              </div>
              <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>{email}</p>
            </div>
          </div>

          <motion.button
            type="button"
            onClick={onEdit}
            whileHover={reducedMotion ? undefined : { y: -1 }}
            whileTap={reducedMotion ? undefined : { scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="up-edit-btn"
            style={{
              padding: '0.7rem 1.35rem', background: 'linear-gradient(135deg, #ee1761 0%, #c8114d 100%)',
              color: '#fff', borderRadius: 10, border: 'none', fontWeight: 700, fontSize: '0.875rem',
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 9,
              boxShadow: '0 2px 10px rgba(238,23,97,0.28)', fontFamily: 'inherit', flexShrink: 0,
            }}
          >
            <span className="up-edit-icon" style={{ display: 'flex' }}><PencilIcon /></span>
            Edit Profile
          </motion.button>
        </div>

        {percent !== null && (
          <div style={{ marginTop: isMobile ? '1.5rem' : '1.75rem', maxWidth: 420 }}>
            <ProfileCompletion percent={percent} />
          </div>
        )}
      </div>

      <SectionDivider />

      {/* Contact & Location / Professional */}
      <div style={{
        padding: isMobile ? '1.25rem 1.25rem 0.5rem' : '1.5rem 2rem 0.5rem',
        display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 0 : '2rem',
      }}>
        <div>
          <p className="up-section-title">Contact &amp; Location</p>
          <InfoItem index={0} direction="left" label="Phone Number" value={phone} icon={<PhoneIcon />} emptyText="Not added yet" onAddClick={onEdit} />
          <InfoItem index={1} direction="left" label="City" value={city} icon={<MapPinIcon />} emptyText="Not added yet" onAddClick={onEdit} />
          <InfoItem index={2} direction="left" label="Country" value={country} icon={<GlobeIcon />} emptyText="Not added yet" onAddClick={onEdit} />
        </div>
        <div>
          <p className="up-section-title">Professional</p>
          <InfoItem index={0} direction="right" label="LinkedIn URL" value={linkedinUrl} icon={<LinkedinIcon />} emptyText="Not added yet" onAddClick={onEdit} />
          <InfoItem index={1} direction="right" label="Website" value={website} icon={<LinkIcon />} emptyText="Not added yet" onAddClick={onEdit} />
          <InfoItem index={2} direction="right" label="Category" value={categoryLabel} icon={<TagIcon />} emptyText="Not set" onAddClick={onEdit} />
          <InfoItem index={3} direction="right" label="Sector" value={sectorLabel} icon={<BriefcaseIcon />} emptyText="Not set" onAddClick={onEdit} />
        </div>
      </div>

      <SectionDivider />

      {/* About / Bio */}
      <div style={{ padding: isMobile ? '1.25rem' : '1.5rem 2rem 1.75rem' }}>
        <p className="up-section-title" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <UserIcon /> About
        </p>
        {bio ? (
          <p style={{ margin: 0, fontSize: '0.9375rem', lineHeight: 1.7, color: '#334155', maxWidth: 720 }}>{bio}</p>
        ) : (
          <p
            role="button"
            tabIndex={0}
            onClick={onEdit}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEdit(); } }}
            style={{ margin: 0, fontSize: '0.9375rem', color: '#cbd5e1', cursor: 'pointer' }}
            className="up-bio-empty"
          >
            No bio added yet. <span style={{ color: '#ee1761', fontWeight: 700 }}>Add one →</span>
          </p>
        )}
      </div>

      <style jsx>{`
        .up-section-title {
          margin: 0 0 6px; font-size: 0.75rem; font-weight: 700; color: #94a3b8;
          text-transform: uppercase; letter-spacing: 0.05em;
        }
        .up-edit-btn { transition: box-shadow 0.25s ease; }
        .up-edit-btn:hover { box-shadow: 0 6px 16px rgba(238,23,97,0.35); }
        .up-edit-btn:hover .up-edit-icon { transform: translateX(2px); }
        .up-edit-icon { transition: transform 0.2s ease; }
      `}</style>
    </motion.div>
  );
}

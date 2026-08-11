'use client';

import { useState } from 'react';
import { salesTrackerApi } from './api';

export default function TeamCard({ team, onTeamChange }: { team: string[]; onTeamChange: (team: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');

  async function handleAdd() {
    const name = input.trim();
    if (!name || team.includes(name)) return;
    let updated: string[];
    try { updated = await salesTrackerApi.addTeamMember(name); } catch { alert('Could not add team member. Try again.'); return; }
    onTeamChange(updated);
    setInput('');
  }
  async function handleRemove(name: string) {
    try { await salesTrackerApi.removeTeamMember(name); } catch { alert('Could not remove team member. Try again.'); return; }
    onTeamChange(team.filter((t) => t !== name));
  }

  return (
    <div className="card">
      <div className="card-head" onClick={() => setOpen((o) => !o)}>
        <h2>Team members</h2>
        <span className={`chev${open ? ' open' : ''}`}>&#8250;</span>
      </div>
      <div className={`card-body${open ? '' : ' collapsed'}`}>
        <div>
          {team.length === 0 && <span className="hint">No team members yet — add names below.</span>}
          {team.map((name) => (
            <span className="team-chip" key={name}>{name} <button title="Remove" onClick={() => handleRemove(name)}>&times;</button></span>
          ))}
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <div className="field" style={{ maxWidth: 220 }}>
            <input type="text" placeholder="Add team member name" value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }} />
          </div>
          <button onClick={handleAdd}>Add</button>
        </div>
      </div>
    </div>
  );
}

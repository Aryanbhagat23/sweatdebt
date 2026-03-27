import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  collection, addDoc, serverTimestamp,
  getDocs, query, where,
} from "firebase/firestore";
import T from "../theme";

const FORFEITS = [
  { id:"pushups",  icon:"💪", name:"Pushups"  },
  { id:"run",      icon:"🏃", name:"Run"       },
  { id:"burpees",  icon:"🔥", name:"Burpees"  },
  { id:"squats",   icon:"🦵", name:"Squats"   },
  { id:"plank",    icon:"🧘", name:"Plank"    },
  { id:"custom",   icon:"✏️", name:"Custom"   },
];

const RULES = [
  { id:"all_lose",    label:"All losers do the forfeit",         desc:"Everyone who fails does the workout" },
  { id:"last_loses",  label:"Last to finish loses",              desc:"Slowest person does double the forfeit" },
  { id:"most_votes",  label:"Group votes on the loser",          desc:"Members vote who did it worst" },
  { id:"elimination", label:"Elimination — worst each round",    desc:"One person eliminated per round" },
];

const DEADLINES = [
  { value:24,   label:"24 hours" },
  { value:48,   label:"48 hours" },
  { value:72,   label:"3 days"   },
  { value:168,  label:"1 week"   },
];

export default function CreateGroupBet({ user }) {
  const navigate = useNavigate();
  const [step,        setStep]        = useState(1); // 1=details 2=forfeit 3=rules 4=invite
  const [name,        setName]        = useState("");
  const [description, setDescription] = useState("");
  const [forfeit,     setForfeit]     = useState(null);
  const [reps,        setReps]        = useState("");
  const [rule,        setRule]        = useState("all_lose");
  const [deadline,    setDeadline]    = useState(48);
  const [minMembers,  setMinMembers]  = useState(3);
  const [maxMembers,  setMaxMembers]  = useState(10);
  const [friends,     setFriends]     = useState([]);
  const [invited,     setInvited]     = useState(new Set());
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");

  // load friends
  useEffect(() => {
    getDocs(collection(db, "users", user.uid, "friends"))
      .then(snap => setFriends(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(() => {});
  }, [user]);

  const toggleInvite = uid => {
    setInvited(prev => {
      const next = new Set(prev);
      next.has(uid) ? next.delete(uid) : next.add(uid);
      return next;
    });
  };

  const canNext = {
    1: name.trim().length > 2 && description.trim().length > 5,
    2: forfeit && reps,
    3: rule,
    4: invited.size >= 2,
  };

  const createBet = async () => {
    setLoading(true);
    setError("");
    try {
      const invitedFriends = friends.filter(f => invited.has(f.id));
      const deadlineDate = new Date(Date.now() + deadline * 60 * 60 * 1000);

      await addDoc(collection(db, "group_bets"), {
  name:        name.trim(),
  description: description.trim(),
  forfeit:     forfeit || null,
  reps:        reps || null,
  rule:        rule || null,
  deadline:    deadlineDate,
  deadlineHrs: deadline,
  minMembers,
  maxMembers,
  createdBy:      user.uid,
  createdByName:  user.displayName  || null,
  createdByEmail: user.email        || null,
  createdAt:   serverTimestamp(),
  status:      "pending",
  members: [
    {
      uid:    user.uid,
      name:   user.displayName  || null,
      email:  user.email        || null,
      photo:  user.photoURL     || null,
      status: "accepted",
      result: null,
    },
    ...invitedFriends.map(f => ({
      uid:    f.id              || null,
      name:   f.displayName    || null,
      email:  f.email          || null,
      photo:  f.photoURL       || null,
      status: "invited",
      result: null,
    })),
  ],
  invitedUids:      invitedFriends.map(f => f.id),
  proofVideos:      [],
  honourMultiplier: 2,
});

      navigate("/group-bets");
    } catch (e) {
      console.error(e);
      setError("Something went wrong. Try again.");
    }
    setLoading(false);
  };

  const stepTitles = ["The bet", "The forfeit", "The rules", "Invite friends"];

  return (
    <div style={{ minHeight:"100vh", background:T.bg0, paddingBottom:"100px" }}>
      {/* header */}
      <div style={{ display:"flex", alignItems:"center", gap:"12px", padding:"52px 16px 20px" }}>
        <button type="button"
          onClick={() => step > 1 ? setStep(s => s-1) : navigate("/group-bets")}
          style={{ width:"44px", height:"44px", borderRadius:"50%", background:T.bg1, border:`1px solid ${T.border}`, color:T.panel, fontSize:"20px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          ←
        </button>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:T.fontDisplay, fontSize:"24px", color:T.panel, letterSpacing:"0.04em", fontStyle:"italic" }}>
            Group Bet
          </div>
          <div style={{ fontFamily:T.fontMono, fontSize:"11px", color:T.textMuted }}>
            step {step} of 4 — {stepTitles[step-1]}
          </div>
        </div>
        {/* honour multiplier badge */}
        <div style={{ background:`${T.accent}20`, border:`1px solid ${T.accent}60`, borderRadius:"20px", padding:"4px 12px", fontFamily:T.fontMono, fontSize:"11px", color:T.accent }}>
          2× honour
        </div>
      </div>

      {/* progress bar */}
      <div style={{ height:"3px", background:T.border, margin:"0 16px 24px" }}>
        <div style={{ height:"100%", width:`${(step/4)*100}%`, background:T.accent, borderRadius:"2px", transition:"width 0.3s" }}/>
      </div>

      <div style={{ padding:"0 16px" }}>

        {/* ── STEP 1: Details ── */}
        {step === 1 && (
          <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
            <div>
              <div style={{ fontFamily:T.fontMono, fontSize:"11px", color:T.textMuted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"8px" }}>Group bet name</div>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder='e.g. "Monday Morning Misery"'
                maxLength={40}
                style={{ width:"100%", background:T.bg1, border:`1px solid ${T.border}`, borderRadius:"14px", padding:"14px 16px", color:T.panel, fontSize:"16px", fontFamily:T.fontBody, outline:"none" }}
              />
            </div>
            <div>
              <div style={{ fontFamily:T.fontMono, fontSize:"11px", color:T.textMuted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"8px" }}>What's the bet?</div>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder='e.g. "Who can wake up before 7am every day this week?"'
                maxLength={200}
                rows={3}
                style={{ width:"100%", background:T.bg1, border:`1px solid ${T.border}`, borderRadius:"14px", padding:"14px 16px", color:T.panel, fontSize:"16px", fontFamily:T.fontBody, outline:"none", resize:"none", lineHeight:"1.5" }}
              />
              <div style={{ fontFamily:T.fontMono, fontSize:"11px", color:T.textMuted, textAlign:"right", marginTop:"4px" }}>{description.length}/200</div>
            </div>
            <div>
              <div style={{ fontFamily:T.fontMono, fontSize:"11px", color:T.textMuted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"8px" }}>Deadline</div>
              <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
                {DEADLINES.map(d => (
                  <button key={d.value} type="button" onClick={() => setDeadline(d.value)}
                    style={{ padding:"8px 16px", borderRadius:"20px", fontFamily:T.fontBody, fontSize:"13px", cursor:"pointer", background: deadline===d.value ? T.panel : T.bg1, color: deadline===d.value ? T.accent : T.textMuted, border: deadline===d.value ? "none" : `1px solid ${T.border}`, transition:"all 0.2s" }}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontFamily:T.fontMono, fontSize:"11px", color:T.textMuted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"8px" }}>Group size</div>
              <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
                <div style={{ flex:1, background:T.bg1, border:`1px solid ${T.border}`, borderRadius:"14px", padding:"14px 16px" }}>
                  <div style={{ fontFamily:T.fontMono, fontSize:"10px", color:T.textMuted, marginBottom:"4px" }}>MIN MEMBERS</div>
                  <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
                    <button type="button" onClick={() => setMinMembers(m => Math.max(2,m-1))} style={{ width:"32px", height:"32px", borderRadius:"50%", background:T.bg0, border:`1px solid ${T.border}`, color:T.panel, fontSize:"18px", cursor:"pointer" }}>-</button>
                    <div style={{ fontFamily:T.fontDisplay, fontSize:"28px", color:T.panel, minWidth:"32px", textAlign:"center" }}>{minMembers}</div>
                    <button type="button" onClick={() => setMinMembers(m => Math.min(maxMembers,m+1))} style={{ width:"32px", height:"32px", borderRadius:"50%", background:T.bg0, border:`1px solid ${T.border}`, color:T.panel, fontSize:"18px", cursor:"pointer" }}>+</button>
                  </div>
                </div>
                <div style={{ flex:1, background:T.bg1, border:`1px solid ${T.border}`, borderRadius:"14px", padding:"14px 16px" }}>
                  <div style={{ fontFamily:T.fontMono, fontSize:"10px", color:T.textMuted, marginBottom:"4px" }}>MAX MEMBERS</div>
                  <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
                    <button type="button" onClick={() => setMaxMembers(m => Math.max(minMembers,m-1))} style={{ width:"32px", height:"32px", borderRadius:"50%", background:T.bg0, border:`1px solid ${T.border}`, color:T.panel, fontSize:"18px", cursor:"pointer" }}>-</button>
                    <div style={{ fontFamily:T.fontDisplay, fontSize:"28px", color:T.panel, minWidth:"32px", textAlign:"center" }}>{maxMembers}</div>
                    <button type="button" onClick={() => setMaxMembers(m => Math.min(50,m+1))} style={{ width:"32px", height:"32px", borderRadius:"50%", background:T.bg0, border:`1px solid ${T.border}`, color:T.panel, fontSize:"18px", cursor:"pointer" }}>+</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Forfeit ── */}
        {step === 2 && (
          <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
            <div style={{ fontFamily:T.fontDisplay, fontSize:"22px", color:T.panel, letterSpacing:"0.04em", fontStyle:"italic" }}>
              What do losers have to do?
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
              {FORFEITS.map(f => (
                <button key={f.id} type="button" onClick={() => setForfeit(f.id)}
                  style={{
                    background: forfeit===f.id ? T.panel : T.bg1,
                    border: forfeit===f.id ? "none" : `1px solid ${T.border}`,
                    borderRadius:"16px", padding:"18px",
                    textAlign:"center", cursor:"pointer",
                    transition:"all 0.2s",
                  }}>
                  <div style={{ fontSize:"30px", marginBottom:"8px" }}>{f.icon}</div>
                  <div style={{ fontFamily:T.fontDisplay, fontSize:"18px", color: forfeit===f.id ? T.accent : T.panel, letterSpacing:"0.04em" }}>{f.name}</div>
                </button>
              ))}
            </div>
            {forfeit && (
              <div>
                <div style={{ fontFamily:T.fontMono, fontSize:"11px", color:T.textMuted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"8px" }}>
                  {forfeit==="run" ? "Distance (km)" : forfeit==="plank" ? "Duration (seconds)" : forfeit==="custom" ? "Describe the forfeit" : "How many reps?"}
                </div>
                <input
                  value={reps}
                  onChange={e => setReps(e.target.value)}
                  placeholder={forfeit==="run" ? "e.g. 2" : forfeit==="custom" ? "e.g. eat a raw onion" : "e.g. 50"}
                  style={{ width:"100%", background:T.bg1, border:`1px solid ${T.border}`, borderRadius:"14px", padding:"14px 16px", color:T.panel, fontSize:"16px", fontFamily:T.fontBody, outline:"none" }}
                />
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3: Rules ── */}
        {step === 3 && (
          <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
            <div style={{ fontFamily:T.fontDisplay, fontSize:"22px", color:T.panel, letterSpacing:"0.04em", fontStyle:"italic", marginBottom:"4px" }}>
              Set the rules
            </div>
            {RULES.map(r => (
              <button key={r.id} type="button" onClick={() => setRule(r.id)}
                style={{
                  background: rule===r.id ? T.panel : T.bg1,
                  border: rule===r.id ? "none" : `1px solid ${T.border}`,
                  borderRadius:"16px", padding:"16px 18px",
                  textAlign:"left", cursor:"pointer",
                  display:"flex", alignItems:"center", gap:"14px",
                  transition:"all 0.2s",
                }}>
                <div style={{ width:"22px", height:"22px", borderRadius:"50%", border: rule===r.id ? "none" : `2px solid ${T.border}`, background: rule===r.id ? T.accent : "transparent", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {rule===r.id && <div style={{ width:"10px", height:"10px", borderRadius:"50%", background:T.panel }}/>}
                </div>
                <div>
                  <div style={{ fontFamily:T.fontBody, fontSize:"15px", fontWeight:"600", color: rule===r.id ? T.accent : T.panel, marginBottom:"3px" }}>{r.label}</div>
                  <div style={{ fontFamily:T.fontBody, fontSize:"13px", color:T.textMuted }}>{r.desc}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ── STEP 4: Invite friends ── */}
        {step === 4 && (
          <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
            <div style={{ fontFamily:T.fontDisplay, fontSize:"22px", color:T.panel, letterSpacing:"0.04em", fontStyle:"italic" }}>
              Invite friends
            </div>
            <div style={{ fontFamily:T.fontBody, fontSize:"13px", color:T.textMuted, marginBottom:"4px" }}>
              Select at least 2 friends to invite. You can invite up to {maxMembers - 1} people.
            </div>
            {friends.length === 0 ? (
              <div style={{ background:T.bg1, borderRadius:"16px", padding:"24px", textAlign:"center" }}>
                <div style={{ fontSize:"32px", marginBottom:"8px" }}>👥</div>
                <div style={{ fontFamily:T.fontBody, fontSize:"14px", color:T.textMuted }}>No friends yet — add some from Find Friends first</div>
              </div>
            ) : (
              friends.map(f => {
                const isSelected = invited.has(f.id);
                return (
                  <div key={f.id}
                    onClick={() => toggleInvite(f.id)}
                    style={{ display:"flex", alignItems:"center", gap:"14px", background: isSelected ? T.panel : T.bg1, border: isSelected ? "none" : `1px solid ${T.border}`, borderRadius:"16px", padding:"14px", cursor:"pointer", transition:"all 0.2s" }}>
                    {f.photoURL
                      ? <img src={f.photoURL} alt="" style={{ width:"46px", height:"46px", borderRadius:"50%", objectFit:"cover", border:`2px solid ${isSelected ? T.accent : T.border}` }}/>
                      : <div style={{ width:"46px", height:"46px", borderRadius:"50%", background: isSelected ? `${T.accent}30` : T.bg0, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:T.fontDisplay, fontSize:"20px", color: isSelected ? T.accent : T.panel, border:`2px solid ${isSelected ? T.accent : T.border}`, flexShrink:0 }}>
                          {(f.displayName||"?").charAt(0)}
                        </div>
                    }
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:T.fontBody, fontSize:"15px", fontWeight:"600", color: isSelected ? T.accent : T.panel }}>{f.displayName}</div>
                      <div style={{ fontFamily:T.fontMono, fontSize:"12px", color:T.textMuted }}>@{f.username || f.displayName?.toLowerCase().replace(/\s/g,"")}</div>
                    </div>
                    <div style={{ width:"26px", height:"26px", borderRadius:"50%", background: isSelected ? T.accent : T.bg0, border: isSelected ? "none" : `2px solid ${T.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"14px", color: isSelected ? T.panel : T.textMuted, flexShrink:0 }}>
                      {isSelected ? "✓" : ""}
                    </div>
                  </div>
                );
              })
            )}

            {/* Summary card */}
            {invited.size > 0 && (
              <div style={{ background:T.bg1, border:`1px solid ${T.border}`, borderRadius:"16px", padding:"16px", marginTop:"8px" }}>
                <div style={{ fontFamily:T.fontMono, fontSize:"10px", color:T.textMuted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"12px" }}>Bet summary</div>
                {[
                  { label:"Name",    val: name },
                  { label:"Forfeit", val: `${FORFEITS.find(f=>f.id===forfeit)?.icon} ${reps} ${forfeit}` },
                  { label:"Rule",    val: RULES.find(r=>r.id===rule)?.label },
                  { label:"Deadline",val: DEADLINES.find(d=>d.value===deadline)?.label },
                  { label:"Invited", val: `${invited.size} friend${invited.size!==1?"s":""}` },
                ].map(row => (
                  <div key={row.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"8px", gap:"12px" }}>
                    <span style={{ fontFamily:T.fontBody, fontSize:"13px", color:T.textMuted, flexShrink:0 }}>{row.label}</span>
                    <span style={{ fontFamily:T.fontBody, fontSize:"13px", color:T.panel, textAlign:"right" }}>{row.val}</span>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:"12px", padding:"12px 16px", fontFamily:T.fontBody, fontSize:"13px", color:"#ef4444" }}>
                {error}
              </div>
            )}
          </div>
        )}
      </div>

      {/* bottom button */}
      <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:"480px", padding:"16px", background:`${T.bg0}f0`, borderTop:`1px solid ${T.border}`, paddingBottom:"calc(16px + env(safe-area-inset-bottom, 0px))" }}>
        {step < 4 ? (
          <button type="button"
            onClick={() => setStep(s => s+1)}
            disabled={!canNext[step]}
            style={{ width:"100%", padding:"18px", background: canNext[step] ? T.panel : T.bg1, border:"none", borderRadius:"16px", fontFamily:T.fontDisplay, fontSize:"22px", letterSpacing:"0.06em", color: canNext[step] ? T.accent : T.textMuted, cursor: canNext[step] ? "pointer" : "not-allowed", transition:"all 0.2s" }}>
            NEXT →
          </button>
        ) : (
          <button type="button"
            onClick={createBet}
            disabled={loading || invited.size < 2}
            style={{ width:"100%", padding:"18px", background: (loading||invited.size<2) ? T.bg1 : T.panel, border:"none", borderRadius:"16px", fontFamily:T.fontDisplay, fontSize:"22px", letterSpacing:"0.06em", color: (loading||invited.size<2) ? T.textMuted : T.accent, cursor: (loading||invited.size<2) ? "not-allowed" : "pointer", transition:"all 0.2s" }}>
            {loading ? "CREATING..." : "⚔️ LAUNCH GROUP BET"}
          </button>
        )}
      </div>
    </div>
  );
}
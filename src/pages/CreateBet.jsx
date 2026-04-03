import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { db } from "../firebase";
import {
  collection, addDoc, serverTimestamp,
  getDocs, query, where, setDoc, doc,
} from "firebase/firestore";
import T from "../theme";

/* ── options ── */
const FORFEITS = [
  { id:"pushups",  icon:"💪", name:"Pushups"  },
  { id:"run",      icon:"🏃", name:"Run"       },
  { id:"burpees",  icon:"🔥", name:"Burpees"  },
  { id:"squats",   icon:"🦵", name:"Squats"   },
  { id:"plank",    icon:"🧘", name:"Plank"    },
  { id:"custom",   icon:"✏️", name:"Custom"   },
];

const SPORTS = [
  { id:"football",   icon:"⚽", name:"Football"   },
  { id:"basketball", icon:"🏀", name:"Basketball" },
  { id:"cricket",    icon:"🏏", name:"Cricket"    },
  { id:"gaming",     icon:"🎮", name:"Gaming"     },
  { id:"mma",        icon:"🥊", name:"MMA"        },
  { id:"custom",     icon:"🎯", name:"Other"      },
];

const DEADLINES = [
  { value:24,  label:"24 hours" },
  { value:48,  label:"48 hours" },
  { value:72,  label:"3 days"   },
  { value:168, label:"1 week"   },
];

const C = {
  page:"#f0fdf4", card:"#ffffff", border:"#d1fae5",
  heading:"#052e16", muted:"#6b7280", accent:"#10b981",
};

export default function CreateBet({ user }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefilledUid   = searchParams.get("opponent");
  const prefilledSport = searchParams.get("sport");

  const [step,           setStep]           = useState(prefilledSport ? 2 : 1); // skip sport step if prefilled
  const [sport,          setSport]          = useState(prefilledSport || null);
  const [forfeit,        setForfeit]        = useState(null);
  const [reps,           setReps]           = useState("");
  const [description,    setDescription]    = useState("");
  const [opponentMode,   setOpponentMode]   = useState("email");
  const [opponentEmail,  setOpponentEmail]  = useState("");
  const [opponentFriend, setOpponentFriend] = useState(null);
  const [deadline,       setDeadline]       = useState(48);
  const [friends,        setFriends]        = useState([]);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState("");

  /* load friend list */
  useEffect(() => {
    if (!user) return;
    getDocs(collection(db, "users", user.uid, "friends"))
      .then(snap => {
        const list = snap.docs.map(d => ({ uid:d.id, ...d.data() }));
        setFriends(list);
        if (prefilledUid) {
          const found = list.find(f => f.uid === prefilledUid);
          if (found) { setOpponentFriend(found); setOpponentMode("friend"); }
        }
      })
      .catch(() => {});
  }, [user]);

  /* ── send auto-message to challenged friend ── */
  const sendChallengeMessage = async (betId, opponentUid, opponentName) => {
    try {
      const participants = [user.uid, opponentUid].sort();
      const convoId = participants.join("_");

      await setDoc(doc(db, "conversations", convoId), {
        participants,
        participantNames: {
          [user.uid]:    user.displayName || "You",
          [opponentUid]: opponentName,
        },
        lastMessage: "⚔️ Challenge sent!",
        updatedAt:   serverTimestamp(),
        createdAt:   serverTimestamp(),
      }, { merge: true });

      const forfeitLabel = forfeit === "custom" ? reps : `${reps} ${forfeit}`;
      const msgText = `⚔️ SWEATDEBT CHALLENGE\n\n${user.displayName || "Someone"} challenged you!\n\n🏅 Sport: ${sport || "Any"}\n💀 Forfeit if you lose: ${forfeitLabel}\n⏰ Deadline: ${DEADLINES.find(d=>d.value===deadline)?.label}\n\n👆 Accept or decline on the Challenges tab.\n\nGood luck! 😤`;

      await addDoc(collection(db, "conversations", convoId, "messages"), {
        senderId:    user.uid,
        senderName:  user.displayName || "You",
        text:        msgText,
        type:        "challenge",
        betId,
        createdAt:   serverTimestamp(),
        read:        false,
      });
    } catch(e) {
      console.warn("Auto-message failed (non-critical):", e);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    const opponent = opponentMode === "friend" ? opponentFriend : null;
    const email    = opponentMode === "friend" ? (opponent?.email || "") : opponentEmail.trim();

    if (!email && !opponent?.uid) {
      setError("Please enter an opponent email or pick a friend.");
      setLoading(false);
      return;
    }
    if (!forfeit) {
      setError("Please choose a forfeit type.");
      setLoading(false);
      return;
    }
    if (!reps) {
      setError("Please enter reps or a description.");
      setLoading(false);
      return;
    }

    try {
      const deadlineDate = new Date(Date.now() + deadline * 3600000);

      const betDoc = await addDoc(collection(db, "bets"), {
        createdBy:       user.uid,
        createdByName:   user.displayName || "",
        createdByEmail:  user.email || "",
        opponentEmail:   email,
        opponentUid:     opponent?.uid || null,
        opponentName:    opponent?.displayName || opponent?.name || email,
        sport:           sport || "custom",
        forfeit,
        reps,
        description:     description.trim() || `${user.displayName} vs ${opponent?.displayName || email} — Loser does ${reps} ${forfeit}`,
        deadline:        deadlineDate,
        status:          "pending",
        proofUploaded:   false,
        penalised:       false,
        createdAt:       serverTimestamp(),
      });

      if (opponent?.uid) {
        await sendChallengeMessage(
          betDoc.id,
          opponent.uid,
          opponent.displayName || opponent.name || "Opponent"
        );
      }

      // ✅ Show share options with the challenge link
      const challengeLink = `https://sweatdebt.vercel.app/challenge/${betDoc.id}`;
      const whatsappMsg   = `⚔️ ${user.displayName} challenged you on SweatDebt!\n\nLoser does: ${reps} ${forfeit}\nSport: ${sport}\n\nAccept the challenge: ${challengeLink}`;

      const shared = await new Promise(resolve => {
        const sheet = document.createElement("div");
        sheet.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:flex-end;justify-content:center;`;
        sheet.innerHTML = `
          <div style="background:#fff;width:100%;max-width:480px;border-radius:24px 24px 0 0;padding:24px;box-sizing:border-box;">
            <div style="width:40px;height:4px;background:#e5e7eb;border-radius:2px;margin:0 auto 20px;"></div>
            <div style="font-family:monospace;font-size:18px;font-weight:700;color:#2C4A3E;margin-bottom:6px;">Challenge Sent! ⚔️</div>
            <div style="font-family:system-ui;font-size:13px;color:#6b7280;margin-bottom:20px;">Share the link so they can accept:</div>
            <div style="background:#f0fdf4;border:1px solid #d1fae5;border-radius:10px;padding:10px 14px;font-family:monospace;font-size:11px;color:#2C4A3E;margin-bottom:16px;word-break:break-all;">${challengeLink}</div>
            <div style="display:flex;gap:10px;">
              <button id="wa-btn" style="flex:1;padding:14px;background:#25D366;border:none;border-radius:12px;font-family:monospace;font-size:14px;font-weight:700;color:#fff;cursor:pointer;">📱 WhatsApp</button>
              <button id="copy-btn" style="flex:1;padding:14px;background:#2C4A3E;border:none;border-radius:12px;font-family:monospace;font-size:14px;font-weight:700;color:#10b981;cursor:pointer;">📋 Copy Link</button>
            </div>
            <button id="done-btn" style="width:100%;margin-top:10px;padding:13px;background:#f3f4f6;border:none;border-radius:12px;font-family:system-ui;font-size:14px;color:#6b7280;cursor:pointer;">Done</button>
          </div>`;
        document.body.appendChild(sheet);

        sheet.querySelector("#wa-btn").onclick = () => {
          window.open(`https://wa.me/?text=${encodeURIComponent(whatsappMsg)}`);
        };
        sheet.querySelector("#copy-btn").onclick = () => {
          navigator.clipboard?.writeText(challengeLink);
          sheet.querySelector("#copy-btn").textContent = "✓ Copied!";
        };
        sheet.querySelector("#done-btn").onclick = () => {
          document.body.removeChild(sheet);
          resolve(true);
        };
        sheet.onclick = (e) => {
          if (e.target === sheet) { document.body.removeChild(sheet); resolve(true); }
        };
      });

      navigate("/");

    } catch(e) {
      console.error(e);
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  };

  const canNext = {
    1: !!sport,
    2: !!forfeit && !!reps,
    3: opponentMode === "friend" ? !!opponentFriend : opponentEmail.includes("@"),
    4: true,
  };

  const STEP_TITLES = ["Pick a sport", "Choose forfeit", "Who's the opponent?", "Set deadline"];

  return (
    <div style={{ minHeight:"100vh", background:C.page, paddingBottom:"100px" }}>
      <style>{`@keyframes _sp{to{transform:rotate(360deg)}}`}</style>

      {/* header */}
      <div style={{ display:"flex", alignItems:"center", gap:"12px", padding:"52px 16px 20px" }}>
        <button
          type="button"
          onClick={() => step > 1 ? setStep(s => prefilledSport && s === 2 ? (navigate("/"), 1) : s - 1) : navigate("/")}
          style={{
            width:"44px", height:"44px", borderRadius:"50%",
            background:C.card, border:`1px solid ${C.border}`,
            color:C.heading, fontSize:"20px", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
          }}>
          ←
        </button>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:T.fontDisplay, fontSize:"24px", color:C.heading, letterSpacing:"0.04em", fontStyle:"italic" }}>
            New Bet
          </div>
          <div style={{ fontFamily:T.fontMono, fontSize:"11px", color:C.muted }}>
            step {step} of 4 — {STEP_TITLES[step - 1]}
          </div>
        </div>
      </div>

      {/* progress bar */}
      <div style={{ height:"3px", background:C.border, margin:"0 16px 24px" }}>
        <div style={{ height:"100%", width:`${(step/4)*100}%`, background:C.accent, borderRadius:"2px", transition:"width 0.3s" }}/>
      </div>

      <div style={{ padding:"0 16px" }}>

        {/* ── STEP 1: Sport ── */}
        {step === 1 && (
          <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
            <div style={{ fontFamily:T.fontDisplay, fontSize:"22px", color:C.heading, letterSpacing:"0.04em", fontStyle:"italic", marginBottom:"4px" }}>
              What are you betting on?
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
              {SPORTS.map(s => (
                <button key={s.id} type="button" onClick={() => setSport(s.id)}
                  style={{ background:sport===s.id?C.heading:C.card, border:`1px solid ${sport===s.id?C.heading:C.border}`, borderRadius:"16px", padding:"18px", textAlign:"center", cursor:"pointer", transition:"all 0.2s" }}>
                  <div style={{ fontSize:"30px", marginBottom:"8px" }}>{s.icon}</div>
                  <div style={{ fontFamily:T.fontDisplay, fontSize:"16px", color:sport===s.id?C.accent:C.heading, letterSpacing:"0.04em" }}>{s.name}</div>
                </button>
              ))}
            </div>
            <div style={{ marginTop:"8px" }}>
              <div style={{ fontFamily:T.fontMono, fontSize:"11px", color:C.muted, marginBottom:"8px", letterSpacing:"0.08em", textTransform:"uppercase" }}>
                Add a description (optional)
              </div>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder='e.g. "I bet I can beat you in FIFA this weekend"'
                rows={2}
                style={{ width:"100%", background:C.card, border:`1px solid ${C.border}`, borderRadius:"12px", padding:"12px 14px", color:C.heading, fontSize:"15px", fontFamily:T.fontBody, outline:"none", resize:"none", lineHeight:"1.5" }}
              />
            </div>
          </div>
        )}

        {/* ── STEP 2: Forfeit ── */}
        {step === 2 && (
          <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
            <div style={{ fontFamily:T.fontDisplay, fontSize:"22px", color:C.heading, letterSpacing:"0.04em", fontStyle:"italic" }}>
              What does the loser do?
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
              {FORFEITS.map(f => (
                <button key={f.id} type="button" onClick={() => setForfeit(f.id)}
                  style={{ background:forfeit===f.id?C.heading:C.card, border:`1px solid ${forfeit===f.id?C.heading:C.border}`, borderRadius:"16px", padding:"18px", textAlign:"center", cursor:"pointer", transition:"all 0.2s" }}>
                  <div style={{ fontSize:"28px", marginBottom:"8px" }}>{f.icon}</div>
                  <div style={{ fontFamily:T.fontDisplay, fontSize:"16px", color:forfeit===f.id?C.accent:C.heading, letterSpacing:"0.04em" }}>{f.name}</div>
                </button>
              ))}
            </div>
            {forfeit && (
              <div>
                <div style={{ fontFamily:T.fontMono, fontSize:"11px", color:C.muted, marginBottom:"8px", letterSpacing:"0.08em", textTransform:"uppercase" }}>
                  {forfeit==="run" ? "Distance (km)" : forfeit==="plank" ? "Duration (secs)" : forfeit==="custom" ? "Describe the forfeit" : "How many reps?"}
                </div>
                <input
                  value={reps}
                  onChange={e => setReps(e.target.value)}
                  placeholder={forfeit==="run" ? "e.g. 2" : forfeit==="custom" ? "e.g. eat a raw onion" : "e.g. 50"}
                  style={{ width:"100%", background:C.card, border:`1px solid ${C.border}`, borderRadius:"12px", padding:"14px 16px", color:C.heading, fontSize:"16px", fontFamily:T.fontBody, outline:"none" }}
                />
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3: Opponent ── */}
        {step === 3 && (
          <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
            <div style={{ fontFamily:T.fontDisplay, fontSize:"22px", color:C.heading, letterSpacing:"0.04em", fontStyle:"italic" }}>
              Who are you challenging?
            </div>

            <div style={{ display:"flex", background:C.card, border:`1px solid ${C.border}`, borderRadius:"12px", padding:"4px" }}>
              <button type="button" onClick={() => setOpponentMode("friend")}
                style={{ flex:1, padding:"10px", borderRadius:"10px", fontFamily:T.fontBody, fontSize:"13px", fontWeight:"500", cursor:"pointer", background:opponentMode==="friend"?C.heading:"transparent", color:opponentMode==="friend"?C.accent:C.muted, border:"none", transition:"all 0.2s" }}>
                👥 From Friends
              </button>
              <button type="button" onClick={() => setOpponentMode("email")}
                style={{ flex:1, padding:"10px", borderRadius:"10px", fontFamily:T.fontBody, fontSize:"13px", fontWeight:"500", cursor:"pointer", background:opponentMode==="email"?C.heading:"transparent", color:opponentMode==="email"?C.accent:C.muted, border:"none", transition:"all 0.2s" }}>
                📧 By Email
              </button>
            </div>

            {opponentMode === "friend" ? (
              friends.length === 0 ? (
                <div style={{ background:C.card, borderRadius:"14px", border:`1px solid ${C.border}`, padding:"24px", textAlign:"center" }}>
                  <div style={{ fontSize:"32px", marginBottom:"8px" }}>👥</div>
                  <div style={{ fontFamily:T.fontBody, fontSize:"14px", color:C.muted }}>No friends yet — add some from Find Friends first</div>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                  {friends.map(f => {
                    const sel = opponentFriend?.uid === f.uid;
                    return (
                      <div key={f.uid} onClick={() => setOpponentFriend(sel ? null : f)}
                        style={{ display:"flex", alignItems:"center", gap:"12px", background:sel?C.heading:C.card, border:`1px solid ${sel?C.accent:C.border}`, borderRadius:"14px", padding:"12px 14px", cursor:"pointer", transition:"all 0.2s" }}>
                        {f.photoURL
                          ? <img src={f.photoURL} alt="" style={{ width:"42px", height:"42px", borderRadius:"50%", objectFit:"cover", border:`2px solid ${sel?C.accent:C.border}` }}/>
                          : <div style={{ width:"42px", height:"42px", borderRadius:"50%", background:sel?`${C.accent}30`:C.page, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:T.fontDisplay, fontSize:"18px", color:sel?C.accent:C.heading, border:`2px solid ${sel?C.accent:C.border}`, flexShrink:0 }}>
                              {(f.displayName||"?").charAt(0)}
                            </div>
                        }
                        <div style={{ flex:1 }}>
                          <div style={{ fontFamily:T.fontBody, fontSize:"14px", fontWeight:"600", color:sel?"#fff":C.heading }}>{f.displayName || f.name}</div>
                          <div style={{ fontFamily:T.fontMono, fontSize:"11px", color:C.muted }}>@{f.username || f.displayName?.toLowerCase().replace(/\s/g,"")}</div>
                        </div>
                        {sel && <div style={{ width:"24px", height:"24px", borderRadius:"50%", background:C.accent, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"14px", color:C.heading, flexShrink:0 }}>✓</div>}
                      </div>
                    );
                  })}
                  {opponentFriend && (
                    <div style={{ background:`${C.accent}15`, border:`1px solid ${C.accent}40`, borderRadius:"10px", padding:"10px 14px", fontFamily:T.fontBody, fontSize:"13px", color:C.accent }}>
                      💬 A challenge message will be auto-sent to {opponentFriend.displayName} in your chat
                    </div>
                  )}
                </div>
              )
            ) : (
              <div>
                <div style={{ fontFamily:T.fontMono, fontSize:"11px", color:C.muted, marginBottom:"8px", letterSpacing:"0.08em", textTransform:"uppercase" }}>Opponent's email</div>
                <input
                  type="email"
                  value={opponentEmail}
                  onChange={e => setOpponentEmail(e.target.value)}
                  placeholder="friend@email.com"
                  style={{ width:"100%", background:C.card, border:`1px solid ${C.border}`, borderRadius:"12px", padding:"14px 16px", color:C.heading, fontSize:"16px", fontFamily:T.fontBody, outline:"none" }}
                />
              </div>
            )}
          </div>
        )}

        {/* ── STEP 4: Deadline + Summary ── */}
        {step === 4 && (
          <div style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
            <div style={{ fontFamily:T.fontDisplay, fontSize:"22px", color:C.heading, letterSpacing:"0.04em", fontStyle:"italic" }}>
              Set a deadline
            </div>
            <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
              {DEADLINES.map(d => (
                <button key={d.value} type="button" onClick={() => setDeadline(d.value)}
                  style={{ padding:"10px 18px", borderRadius:"20px", fontFamily:T.fontBody, fontSize:"13px", cursor:"pointer", background:deadline===d.value?C.heading:C.card, color:deadline===d.value?C.accent:C.muted, border:`1px solid ${deadline===d.value?C.heading:C.border}`, transition:"all 0.2s" }}>
                  {d.label}
                </button>
              ))}
            </div>

            {/* summary card */}
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:"16px", padding:"16px" }}>
              <div style={{ fontFamily:T.fontMono, fontSize:"10px", color:C.muted, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:"12px" }}>Bet summary</div>
              {[
                { label:"Sport",    val: sport   ? `${SPORTS.find(s=>s.id===sport)?.icon} ${sport}` : "—" },
                { label:"Forfeit",  val: forfeit ? `${FORFEITS.find(f=>f.id===forfeit)?.icon} ${reps} ${forfeit}` : "—" },
                { label:"Opponent", val: opponentMode==="friend" ? (opponentFriend?.displayName || "—") : (opponentEmail || "—") },
                { label:"Deadline", val: DEADLINES.find(d=>d.value===deadline)?.label },
              ].map(row => (
                <div key={row.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"8px", gap:"12px" }}>
                  <span style={{ fontFamily:T.fontBody, fontSize:"13px", color:C.muted, flexShrink:0 }}>{row.label}</span>
                  <span style={{ fontFamily:T.fontBody, fontSize:"13px", color:C.heading, textAlign:"right" }}>{row.val}</span>
                </div>
              ))}
            </div>

            {error && (
              <div style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:"12px", padding:"12px 16px", fontFamily:T.fontBody, fontSize:"13px", color:"#ef4444" }}>
                {error}
              </div>
            )}
          </div>
        )}
      </div>

      {/* bottom button */}
      <div style={{
        position:"fixed", bottom:0,
        left:"50%", transform:"translateX(-50%)",
        width:"100%", maxWidth:"480px",
        padding:"16px",
        background:`${C.page}f0`,
        borderTop:`1px solid ${C.border}`,
        paddingBottom:"calc(16px + env(safe-area-inset-bottom, 0px))",
      }}>
        {step < 4 ? (
          <button type="button"
            onClick={() => setStep(s => s + 1)}
            disabled={!canNext[step]}
            style={{ width:"100%", padding:"18px", background:canNext[step]?C.heading:"#e5e7eb", border:"none", borderRadius:"16px", fontFamily:T.fontDisplay, fontSize:"22px", letterSpacing:"0.06em", color:canNext[step]?C.accent:C.muted, cursor:canNext[step]?"pointer":"not-allowed", transition:"all 0.2s" }}>
            NEXT →
          </button>
        ) : (
          <button type="button"
            onClick={handleSubmit}
            disabled={loading}
            style={{ width:"100%", padding:"18px", background:loading?"#e5e7eb":C.heading, border:"none", borderRadius:"16px", fontFamily:T.fontDisplay, fontSize:"22px", letterSpacing:"0.06em", color:loading?C.muted:C.accent, cursor:loading?"not-allowed":"pointer", transition:"all 0.2s" }}>
            {loading ? "CREATING..." : "⚔️ SEND CHALLENGE"}
          </button>
        )}
      </div>
    </div>
  );
}
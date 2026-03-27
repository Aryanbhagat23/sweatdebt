import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, onSnapshot, where, query } from "firebase/firestore";
import T from "../theme";

const STATUS_STYLE = {
  pending:   { bg:"rgba(245,166,35,0.15)",  color:"#f5a623", label:"WAITING"   },
  active:    { bg:`rgba(16,185,129,0.15)`,  color:"#10b981", label:"LIVE"      },
  completed: { bg:"rgba(107,114,128,0.15)", color:"#6b7280", label:"DONE"      },
};

export default function GroupBets({ user }) {
  const navigate = useNavigate();
  const [myBets,  setMyBets]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState("all"); // all | created | invited

  useEffect(() => {
    // bets where user is a member (creator or invitee)
    const unsub = onSnapshot(collection(db, "group_bets"), snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const mine = all.filter(b =>
        b.createdBy === user.uid ||
        (b.invitedUids || []).includes(user.uid)
      );
      mine.sort((a,b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0));
      setMyBets(mine);
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const filtered = myBets.filter(b => {
    if (tab === "created") return b.createdBy === user.uid;
    if (tab === "invited") return b.createdBy !== user.uid;
    return true;
  });

  const pending = myBets.filter(b => {
    const myMember = b.members?.find(m => m.uid === user.uid);
    return myMember?.status === "invited";
  });

  const timeLeft = deadline => {
    if (!deadline?.toDate) return null;
    const ms = deadline.toDate() - new Date();
    if (ms <= 0) return "Expired";
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    if (h > 48) return `${Math.floor(h/24)}d left`;
    if (h > 0)  return `${h}h ${m}m left`;
    return `${m}m left`;
  };

  if (loading) return (
    <div style={{ minHeight:"100vh", background:T.bg0, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <style>{`@keyframes _sp{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width:"32px", height:"32px", borderRadius:"50%", border:`3px solid ${T.border}`, borderTop:`3px solid ${T.accent}`, animation:"_sp 0.8s linear infinite" }}/>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:T.bg0, paddingBottom:"90px" }}>

      {/* header */}
      <div style={{ padding:"52px 16px 16px" }}>
        <div style={{ fontFamily:T.fontDisplay, fontSize:"32px", color:T.panel, letterSpacing:"0.04em", fontStyle:"italic" }}>
          Group Bets
        </div>
        <div style={{ fontFamily:T.fontBody, fontSize:"13px", color:T.textMuted }}>
          bet with the whole squad
        </div>
      </div>

      {/* pending invites banner */}
      {pending.length > 0 && (
        <div style={{ margin:"0 16px 16px", background:`${T.accent}15`, border:`1px solid ${T.accent}50`, borderRadius:"14px", padding:"14px 16px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontFamily:T.fontBody, fontSize:"14px", fontWeight:"600", color:T.panel }}>
              ⚔️ {pending.length} pending invite{pending.length!==1?"s":""}!
            </div>
            <div style={{ fontFamily:T.fontBody, fontSize:"12px", color:T.textMuted, marginTop:"2px" }}>
              Friends are waiting for you to accept
            </div>
          </div>
          <button type="button" onClick={() => setTab("invited")}
            style={{ background:T.panel, border:"none", borderRadius:"10px", padding:"8px 14px", fontFamily:T.fontDisplay, fontSize:"14px", letterSpacing:"0.04em", color:T.accent, cursor:"pointer" }}>
            VIEW
          </button>
        </div>
      )}

      {/* create button */}
      <div style={{ padding:"0 16px 16px" }}>
        <button type="button" onClick={() => navigate("/create-group-bet")}
          style={{ width:"100%", padding:"16px", background:T.panel, border:"none", borderRadius:"16px", fontFamily:T.fontDisplay, fontSize:"20px", letterSpacing:"0.06em", color:T.accent, cursor:"pointer" }}>
          + CREATE GROUP BET
        </button>
      </div>

      {/* tabs */}
      <div style={{ display:"flex", margin:"0 16px 16px", background:T.bg1, borderRadius:"12px", padding:"4px", border:`1px solid ${T.border}` }}>
        {[["all","All"],["created","Created"],["invited","Invited"]].map(([key,label]) => (
          <button key={key} type="button" onClick={() => setTab(key)}
            style={{ flex:1, padding:"10px", borderRadius:"10px", fontFamily:T.fontBody, fontSize:"13px", fontWeight:"500", cursor:"pointer", background: tab===key ? T.panel : "transparent", color: tab===key ? T.accent : T.textMuted, border:"none", transition:"all 0.2s" }}>
            {label}
          </button>
        ))}
      </div>

      {/* list */}
      {filtered.length === 0 ? (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"48px 16px", gap:"12px" }}>
          <div style={{ fontSize:"40px" }}>👥</div>
          <div style={{ fontFamily:T.fontDisplay, fontSize:"22px", color:T.panel, letterSpacing:"0.04em", fontStyle:"italic" }}>
            No group bets yet
          </div>
          <div style={{ fontFamily:T.fontBody, fontSize:"14px", color:T.textMuted, textAlign:"center" }}>
            Create one or wait for a friend to invite you
          </div>
        </div>
      ) : (
        <div style={{ padding:"0 16px", display:"flex", flexDirection:"column", gap:"10px" }}>
          {filtered.map(bet => {
            const s = STATUS_STYLE[bet.status] || STATUS_STYLE.pending;
            const myMember = bet.members?.find(m => m.uid === user.uid);
            const accepted = bet.members?.filter(m => m.status==="accepted").length || 0;
            const total    = bet.members?.length || 0;
            const tl       = timeLeft(bet.deadline);
            const isCreator = bet.createdBy === user.uid;

            return (
              <div key={bet.id}
                onClick={() => navigate(`/group-bets/${bet.id}`)}
                style={{ background:T.bg1, border:`1px solid ${T.border}`, borderRadius:"20px", padding:"18px", cursor:"pointer" }}>

                {/* top row */}
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"10px" }}>
                  <div style={{ flex:1, marginRight:"10px" }}>
                    <div style={{ fontFamily:T.fontDisplay, fontSize:"18px", color:T.panel, letterSpacing:"0.04em", fontStyle:"italic", marginBottom:"3px" }}>
                      {bet.name}
                    </div>
                    <div style={{ fontFamily:T.fontBody, fontSize:"13px", color:T.textMuted }}>
                      by {isCreator ? "You" : bet.createdByName}
                    </div>
                  </div>
                  <div style={{ background:s.bg, color:s.color, fontSize:"10px", fontWeight:"700", fontFamily:T.fontMono, letterSpacing:"0.06em", padding:"4px 10px", borderRadius:"20px", flexShrink:0 }}>
                    {s.label}
                  </div>
                </div>

                {/* description */}
                <div style={{ fontFamily:T.fontBody, fontSize:"14px", color:T.textMuted, marginBottom:"12px", lineHeight:"1.4" }}>
                  "{bet.description}"
                </div>

                {/* forfeit + timer row */}
                <div style={{ display:"flex", gap:"8px", marginBottom:"12px" }}>
                  <div style={{ flex:1, background:T.bg0, borderRadius:"10px", padding:"10px 12px" }}>
                    <div style={{ fontFamily:T.fontMono, fontSize:"10px", color:T.textMuted, marginBottom:"3px" }}>FORFEIT</div>
                    <div style={{ fontFamily:T.fontDisplay, fontSize:"16px", color:"#f5a623", letterSpacing:"0.04em" }}>
                      {bet.reps} {bet.forfeit}
                    </div>
                  </div>
                  {tl && (
                    <div style={{ flex:1, background:T.bg0, borderRadius:"10px", padding:"10px 12px" }}>
                      <div style={{ fontFamily:T.fontMono, fontSize:"10px", color:T.textMuted, marginBottom:"3px" }}>TIME</div>
                      <div style={{ fontFamily:T.fontDisplay, fontSize:"16px", color: tl==="Expired" ? "#ef4444" : T.panel, letterSpacing:"0.04em" }}>
                        {tl}
                      </div>
                    </div>
                  )}
                </div>

                {/* members row */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"-6px" }}>
                    {bet.members?.slice(0,5).map((m,i) => (
                      <div key={m.uid} style={{ width:"28px", height:"28px", borderRadius:"50%", border:`2px solid ${T.bg1}`, marginLeft: i===0 ? "0" : "-8px", zIndex:5-i, overflow:"hidden", background:T.panel, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:T.fontDisplay, fontSize:"11px", color:T.accent }}>
                        {m.photo ? <img src={m.photo} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : (m.name||"?").charAt(0)}
                      </div>
                    ))}
                    {total > 5 && <div style={{ fontFamily:T.fontMono, fontSize:"11px", color:T.textMuted, marginLeft:"4px" }}>+{total-5}</div>}
                  </div>
                  <div style={{ fontFamily:T.fontMono, fontSize:"11px", color:T.textMuted }}>
                    {accepted}/{total} accepted
                  </div>
                </div>

                {/* invite action for invited members */}
                {myMember?.status === "invited" && (
                  <div style={{ marginTop:"12px", display:"flex", gap:"8px" }}>
                    <div style={{ flex:1, padding:"10px", background:T.panel, borderRadius:"10px", textAlign:"center", fontFamily:T.fontDisplay, fontSize:"16px", letterSpacing:"0.04em", color:T.accent }}>
                      ✓ ACCEPT
                    </div>
                    <div style={{ flex:1, padding:"10px", background:"transparent", border:`1px solid #ef4444`, borderRadius:"10px", textAlign:"center", fontFamily:T.fontDisplay, fontSize:"16px", letterSpacing:"0.04em", color:"#ef4444" }}>
                      ✗ DECLINE
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
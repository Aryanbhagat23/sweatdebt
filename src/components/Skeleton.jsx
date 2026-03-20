import React from "react";

// Animated shimmer base
const shimmerStyle = {
  background: "linear-gradient(90deg, #1a1a1a 25%, #242424 50%, #1a1a1a 75%)",
  backgroundSize: "200% 100%",
  animation: "shimmer 1.5s infinite",
  borderRadius: "8px",
};

export function SkeletonBox({ width="100%", height="16px", radius="8px", style={} }) {
  return (
    <>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      <div style={{
        ...shimmerStyle,
        width, height,
        borderRadius: radius,
        flexShrink: 0,
        ...style,
      }}/>
    </>
  );
}

export function SkeletonCircle({ size="44px" }) {
  return <SkeletonBox width={size} height={size} radius="50%"/>;
}

export function SkeletonText({ lines=1, width="100%", style={} }) {
  const widths = Array.isArray(width) ? width : Array(lines).fill(width);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:"8px",...style}}>
      {widths.map((w,i) => (
        <SkeletonBox key={i} width={w} height="14px"/>
      ))}
    </div>
  );
}

// Feed video card skeleton
export function SkeletonVideoCard() {
  return (
    <div style={{background:"#1a1a1a",marginBottom:"8px"}}>
      {/* Video thumbnail */}
      <SkeletonBox height="280px" radius="0"/>
      {/* User row */}
      <div style={{display:"flex",alignItems:"center",gap:"12px",padding:"12px 16px"}}>
        <SkeletonCircle size="38px"/>
        <div style={{flex:1,display:"flex",flexDirection:"column",gap:"6px"}}>
          <SkeletonBox width="120px" height="14px"/>
          <SkeletonBox width="70px" height="11px"/>
        </div>
        <div style={{display:"flex",gap:"8px"}}>
          <SkeletonBox width="40px" height="24px" radius="12px"/>
          <SkeletonBox width="40px" height="24px" radius="12px"/>
          <SkeletonBox width="32px" height="24px" radius="12px"/>
        </div>
      </div>
      {/* Rematch button */}
      <div style={{padding:"0 16px 14px"}}>
        <SkeletonBox height="48px" radius="12px"/>
      </div>
    </div>
  );
}

// Bet card skeleton
export function SkeletonBetCard() {
  return (
    <div style={{margin:"0 16px 10px",background:"#1a1a1a",borderRadius:"20px",padding:"18px",border:"1px solid #222"}}>
      <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"16px"}}>
        <SkeletonCircle size="46px"/>
        <div style={{flex:1,display:"flex",flexDirection:"column",gap:"6px"}}>
          <SkeletonBox width="160px" height="14px"/>
          <SkeletonBox width="80px" height="11px"/>
        </div>
        <SkeletonBox width="72px" height="26px" radius="20px"/>
      </div>
      <SkeletonBox height="14px" style={{marginBottom:"8px"}}/>
      <SkeletonBox width="75%" height="14px" style={{marginBottom:"16px"}}/>
      <SkeletonBox height="42px" radius="12px"/>
    </div>
  );
}

// Stat card skeleton
export function SkeletonStatCard() {
  return (
    <div style={{background:"#1a1a1a",borderRadius:"16px",padding:"16px",textAlign:"center",border:"1px solid #222",display:"flex",flexDirection:"column",alignItems:"center",gap:"8px"}}>
      <SkeletonBox width="50px" height="36px" radius="6px"/>
      <SkeletonBox width="40px" height="11px"/>
    </div>
  );
}

// Leaderboard row skeleton
export function SkeletonLeaderRow() {
  return (
    <div style={{display:"flex",alignItems:"center",gap:"14px",padding:"14px",borderRadius:"16px",marginBottom:"8px",background:"#1a1a1a"}}>
      <SkeletonBox width="28px" height="24px" radius="4px"/>
      <SkeletonCircle size="46px"/>
      <div style={{flex:1,display:"flex",flexDirection:"column",gap:"6px"}}>
        <SkeletonBox width="140px" height="14px"/>
        <SkeletonBox width="100px" height="11px"/>
      </div>
      <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:"4px"}}>
        <SkeletonBox width="48px" height="20px" radius="4px"/>
        <SkeletonBox width="36px" height="11px"/>
      </div>
    </div>
  );
}

// Profile skeleton
export function SkeletonProfile() {
  return (
    <div>
      {/* Header */}
      <div style={{background:"#1a1a1a",padding:"52px 16px 20px",borderBottom:"1px solid #222"}}>
        <div style={{display:"flex",alignItems:"center",gap:"14px",marginBottom:"20px"}}>
          <SkeletonCircle size="54px"/>
          <div style={{flex:1,display:"flex",flexDirection:"column",gap:"8px"}}>
            <SkeletonBox width="140px" height="18px"/>
            <SkeletonBox width="100px" height="13px"/>
          </div>
        </div>
        <SkeletonBox height="72px" radius="14px"/>
      </div>
      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:"1px",background:"#222"}}>
        {[...Array(4)].map((_,i)=>(
          <div key={i} style={{background:"#1a1a1a",padding:"16px 8px",display:"flex",flexDirection:"column",alignItems:"center",gap:"6px"}}>
            <SkeletonBox width="40px" height="24px" radius="4px"/>
            <SkeletonBox width="32px" height="11px"/>
          </div>
        ))}
      </div>
      {/* Menu items */}
      <div style={{padding:"16px"}}>
        <SkeletonBox width="80px" height="11px" style={{marginBottom:"12px"}}/>
        {[...Array(4)].map((_,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:"14px",padding:"14px",background:"#1a1a1a",borderRadius:"14px",marginBottom:"8px"}}>
            <SkeletonBox width="42px" height="42px" radius="12px"/>
            <div style={{flex:1,display:"flex",flexDirection:"column",gap:"6px"}}>
              <SkeletonBox width="120px" height="14px"/>
              <SkeletonBox width="90px" height="11px"/>
            </div>
            <SkeletonBox width="16px" height="16px" radius="4px"/>
          </div>
        ))}
      </div>
    </div>
  );
}

// Search results skeleton
export function SkeletonSearchResult() {
  return (
    <div style={{display:"flex",alignItems:"center",gap:"14px",background:"#1a1a1a",border:"1px solid #222",borderRadius:"16px",padding:"14px",marginBottom:"10px"}}>
      <SkeletonCircle size="52px"/>
      <div style={{flex:1,display:"flex",flexDirection:"column",gap:"6px"}}>
        <SkeletonBox width="130px" height="16px"/>
        <SkeletonBox width="90px" height="12px"/>
        <div style={{display:"flex",gap:"6px",marginTop:"2px"}}>
          <SkeletonBox width="60px" height="22px" radius="10px"/>
          <SkeletonBox width="50px" height="22px" radius="10px"/>
          <SkeletonBox width="60px" height="22px" radius="10px"/>
        </div>
      </div>
      <SkeletonBox width="36px" height="36px" radius="10px"/>
    </div>
  );
}

// Comment skeleton
export function SkeletonComment() {
  return (
    <div style={{display:"flex",gap:"10px",padding:"10px 0"}}>
      <SkeletonCircle size="34px"/>
      <div style={{flex:1,display:"flex",flexDirection:"column",gap:"6px"}}>
        <div style={{display:"flex",gap:"8px"}}>
          <SkeletonBox width="90px" height="13px"/>
          <SkeletonBox width="40px" height="11px"/>
        </div>
        <SkeletonBox height="14px"/>
        <SkeletonBox width="65%" height="14px"/>
      </div>
    </div>
  );
}

// Notification skeleton
export function SkeletonNotification() {
  return (
    <div style={{display:"flex",alignItems:"flex-start",gap:"12px",padding:"14px",background:"#222",borderRadius:"14px",marginBottom:"8px"}}>
      <SkeletonBox width="42px" height="42px" radius="12px"/>
      <div style={{flex:1,display:"flex",flexDirection:"column",gap:"6px"}}>
        <SkeletonBox width="80%" height="14px"/>
        <SkeletonBox width="55%" height="12px"/>
        <SkeletonBox width="50px" height="11px"/>
      </div>
    </div>
  );
}

// Full page skeleton screens
export function FeedSkeleton() {
  return (
    <div style={{minHeight:"100vh",background:"#111",paddingBottom:"90px"}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"52px 16px 12px"}}>
        <SkeletonBox width="140px" height="32px" radius="4px"/>
        <SkeletonCircle size="36px"/>
      </div>
      {/* Tabs */}
      <div style={{display:"flex",gap:"24px",padding:"0 16px",borderBottom:"1px solid #222",marginBottom:"4px",paddingBottom:"12px"}}>
        <SkeletonBox width="64px" height="14px"/>
        <SkeletonBox width="56px" height="14px"/>
        <SkeletonBox width="72px" height="14px"/>
      </div>
      {/* Cards */}
      {[...Array(2)].map((_,i)=>(
        <SkeletonVideoCard key={i}/>
      ))}
    </div>
  );
}

export function BetsSkeleton() {
  return (
    <div style={{minHeight:"100vh",background:"#111",paddingBottom:"90px"}}>
      <div style={{padding:"52px 16px 16px"}}>
        <SkeletonBox width="140px" height="36px" radius="4px" style={{marginBottom:"16px"}}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px",marginBottom:"16px"}}>
          {[...Array(3)].map((_,i)=><SkeletonStatCard key={i}/>)}
        </div>
        <SkeletonBox height="58px" radius="16px" style={{marginBottom:"12px"}}/>
        <SkeletonBox height="52px" radius="16px" style={{marginBottom:"16px"}}/>
        <SkeletonBox width="80px" height="11px" style={{marginBottom:"12px"}}/>
      </div>
      {[...Array(3)].map((_,i)=><SkeletonBetCard key={i}/>)}
    </div>
  );
}

export function LeaderboardSkeleton() {
  return (
    <div style={{minHeight:"100vh",background:"#111",paddingBottom:"90px"}}>
      <div style={{padding:"52px 16px 16px"}}>
        <SkeletonBox width="180px" height="36px" radius="4px" style={{marginBottom:"16px"}}/>
        <div style={{display:"flex",gap:"8px",marginBottom:"20px",flexWrap:"wrap"}}>
          {[...Array(4)].map((_,i)=>(
            <SkeletonBox key={i} width="80px" height="40px" radius="20px"/>
          ))}
        </div>
      </div>
      {/* Podium skeleton */}
      <div style={{display:"flex",alignItems:"flex-end",justifyContent:"center",gap:"12px",padding:"0 16px 28px"}}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"8px",flex:1}}>
          <SkeletonCircle size="52px"/>
          <SkeletonBox width="60px" height="12px"/>
          <SkeletonBox width="40px" height="40px" radius="4px"/>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"8px",flex:1}}>
          <SkeletonCircle size="64px"/>
          <SkeletonBox width="70px" height="12px"/>
          <SkeletonBox width="40px" height="56px" radius="4px"/>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"8px",flex:1}}>
          <SkeletonCircle size="52px"/>
          <SkeletonBox width="60px" height="12px"/>
          <SkeletonBox width="40px" height="28px" radius="4px"/>
        </div>
      </div>
      <div style={{padding:"0 16px"}}>
        <SkeletonBox width="80px" height="11px" style={{marginBottom:"12px"}}/>
        {[...Array(4)].map((_,i)=><SkeletonLeaderRow key={i}/>)}
      </div>
    </div>
  );
}
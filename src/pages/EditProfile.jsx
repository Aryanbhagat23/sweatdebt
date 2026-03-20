import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

const CLOUD_NAME = "daf3vs5n6";
const UPLOAD_PRESET = "jrmodcfe";

export default function EditProfile({ user }) {
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [photoURL, setPhotoURL] = useState(user?.photoURL || null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [usernameError, setUsernameError] = useState("");

  useEffect(() => {
    const load = async () => {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const d = snap.data();
        setUsername(d.username || "");
        setBio(d.bio || "");
        setPhotoURL(d.photoURL || user?.photoURL || null);
        setDisplayName(d.displayName || user?.displayName || "");
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const uploadPhoto = () => {
    if (!window.cloudinary) return;
    setUploading(true);
    window.cloudinary.openUploadWidget({
      cloudName: CLOUD_NAME,
      uploadPreset: UPLOAD_PRESET,
      sources: ["local", "camera"],
      resourceType: "image",
      cropping: true,
      croppingAspectRatio: 1,
      showSkipCropButton: false,
      multiple: false,
      styles: {
        palette: {
          window:"#111111", windowBorder:"#333333",
          tabIcon:"#d4ff00", textDark:"#000000",
          textLight:"#f5f0e8", link:"#d4ff00",
          action:"#d4ff00", inactiveTabIcon:"#666666",
          error:"#ff4444", inProgress:"#d4ff00",
          complete:"#00e676", sourceBg:"#1a1a1a",
        },
      },
    }, (error, result) => {
      if (result?.event === "success") {
        setPhotoURL(result.info.secure_url);
        setUploading(false);
      }
      if (error) setUploading(false);
    });
  };

  const validateUsername = (val) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setUsername(clean);
    if (clean.length < 3) setUsernameError("At least 3 characters");
    else if (clean.length > 20) setUsernameError("Max 20 characters");
    else setUsernameError("");
  };

  const save = async () => {
    if (usernameError || username.length < 3) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        displayName: displayName.trim(),
        username: username.trim(),
        bio: bio.trim(),
        photoURL: photoURL,
      });
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        navigate(-1);
      }, 1200);
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  if (loading) return (
    <div style={{minHeight:"100vh",background:"#111",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{color:"#555",fontFamily:"monospace"}}>Loading...</div>
    </div>
  );

  return (
    <div style={S.page}>
      <div style={S.header}>
        <button style={S.back} onClick={() => navigate(-1)}>←</button>
        <div style={S.title}>Edit Profile</div>
        <button
          style={{...S.saveBtn, opacity: saving||usernameError ? 0.5 : 1}}
          onClick={save}
          disabled={saving || !!usernameError}
        >
          {saved ? "✓ Saved!" : saving ? "Saving..." : "Save"}
        </button>
      </div>

      {/* Profile picture */}
      <div style={S.avatarSection}>
        <div style={S.avatarWrap} onClick={uploadPhoto}>
          {photoURL ? (
            <img src={photoURL} alt="profile" style={S.avatarImg}/>
          ) : (
            <div style={S.avatarPlaceholder}>
              {displayName?.charAt(0)?.toUpperCase() || "?"}
            </div>
          )}
          <div style={S.avatarOverlay}>
            <div style={S.cameraIcon}>{uploading ? "⏳" : "📷"}</div>
          </div>
        </div>
        <div style={S.changePhotoText} onClick={uploadPhoto}>
          {uploading ? "Uploading..." : "Tap to change photo"}
        </div>
      </div>

      {/* Form */}
      <div style={S.form}>
        <div style={S.fieldGroup}>
          <div style={S.fieldLabel}>DISPLAY NAME</div>
          <input
            style={S.input}
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Your full name"
            maxLength={30}
          />
        </div>

        <div style={S.fieldGroup}>
          <div style={S.fieldLabel}>USERNAME</div>
          <div style={S.usernameWrap}>
            <span style={S.atSign}>@</span>
            <input
              style={{...S.input, paddingLeft:"36px", borderColor: usernameError ? "#ff4444" : username.length>=3 ? "#00e676" : "#333"}}
              value={username}
              onChange={e => validateUsername(e.target.value)}
              placeholder="yourname"
              maxLength={20}
              autoCapitalize="none"
              autoCorrect="off"
            />
          </div>
          {usernameError ? (
            <div style={S.fieldError}>{usernameError}</div>
          ) : username.length >= 3 ? (
            <div style={S.fieldSuccess}>✓ @{username} looks good</div>
          ) : (
            <div style={S.fieldHint}>Only letters, numbers and underscores</div>
          )}
        </div>

        <div style={S.fieldGroup}>
          <div style={S.fieldLabel}>BIO</div>
          <textarea
            style={{...S.input, minHeight:"80px", resize:"none", lineHeight:"1.5"}}
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="Tell people who you are... 💪"
            maxLength={120}
          />
          <div style={S.fieldHint}>{bio.length}/120</div>
        </div>

        <div style={S.fieldGroup}>
          <div style={S.fieldLabel}>EMAIL</div>
          <div style={{...S.input, color:"#555", display:"flex", alignItems:"center"}}>
            {user?.email}
          </div>
          <div style={S.fieldHint}>Email cannot be changed</div>
        </div>
      </div>

      {/* Danger zone */}
      <div style={S.danger}>
        <div style={S.dangerTitle}>ACCOUNT</div>
        <div style={S.dangerCard}>
          <div style={S.dangerRow} onClick={() => auth.signOut()}>
            <span style={S.dangerIcon}>🚪</span>
            <span style={{...S.dangerText, color:"#ff4444"}}>Sign out</span>
            <span style={S.dangerArrow}>›</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const S = {
  page:{minHeight:"100vh",background:"#111",paddingBottom:"40px"},
  header:{display:"flex",alignItems:"center",gap:"12px",padding:"52px 16px 20px"},
  back:{background:"#1a1a1a",border:"1px solid #333",borderRadius:"50%",width:"44px",height:"44px",color:"#f5f0e8",fontSize:"20px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},
  title:{fontFamily:"'Bebas Neue',sans-serif",fontSize:"28px",color:"#f5f0e8",letterSpacing:"0.04em",flex:1},
  saveBtn:{background:"#d4ff00",border:"none",borderRadius:"12px",padding:"10px 20px",fontFamily:"'Bebas Neue',sans-serif",fontSize:"18px",letterSpacing:"0.04em",color:"#000",cursor:"pointer"},
  avatarSection:{display:"flex",flexDirection:"column",alignItems:"center",padding:"8px 20px 28px"},
  avatarWrap:{position:"relative",width:"96px",height:"96px",borderRadius:"50%",cursor:"pointer",marginBottom:"12px"},
  avatarImg:{width:"96px",height:"96px",borderRadius:"50%",objectFit:"cover",border:"3px solid #d4ff00"},
  avatarPlaceholder:{width:"96px",height:"96px",borderRadius:"50%",background:"linear-gradient(135deg,#d4ff00,#ff5c1a)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Bebas Neue',sans-serif",fontSize:"36px",color:"#000",border:"3px solid #333"},
  avatarOverlay:{position:"absolute",inset:0,borderRadius:"50%",background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center"},
  cameraIcon:{fontSize:"24px"},
  changePhotoText:{fontFamily:"'DM Sans',sans-serif",fontSize:"14px",color:"#d4ff00",fontWeight:"500",cursor:"pointer"},
  form:{padding:"0 16px"},
  fieldGroup:{marginBottom:"20px"},
  fieldLabel:{fontFamily:"'DM Mono',monospace",fontSize:"11px",color:"#555",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:"8px"},
  input:{width:"100%",background:"#1a1a1a",border:"1px solid #333",borderRadius:"14px",padding:"14px 16px",color:"#f5f0e8",fontSize:"16px",fontFamily:"'DM Sans',sans-serif",outline:"none",transition:"border-color 0.2s"},
  usernameWrap:{position:"relative"},
  atSign:{position:"absolute",left:"16px",top:"50%",transform:"translateY(-50%)",color:"#d4ff00",fontFamily:"'DM Mono',monospace",fontSize:"16px",fontWeight:"500",zIndex:1},
  fieldError:{fontFamily:"'DM Sans',sans-serif",fontSize:"12px",color:"#ff4444",marginTop:"6px"},
  fieldSuccess:{fontFamily:"'DM Sans',sans-serif",fontSize:"12px",color:"#00e676",marginTop:"6px"},
  fieldHint:{fontFamily:"'DM Mono',monospace",fontSize:"11px",color:"#444",marginTop:"6px"},
  danger:{padding:"24px 16px 0"},
  dangerTitle:{fontFamily:"'DM Mono',monospace",fontSize:"11px",color:"#555",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:"10px"},
  dangerCard:{background:"#1a1a1a",border:"1px solid #222",borderRadius:"16px",overflow:"hidden"},
  dangerRow:{display:"flex",alignItems:"center",gap:"14px",padding:"16px",cursor:"pointer"},
  dangerIcon:{fontSize:"20px"},
  dangerText:{fontFamily:"'DM Sans',sans-serif",flex:1,fontSize:"16px",fontWeight:"500"},
  dangerArrow:{fontFamily:"'DM Sans',sans-serif",fontSize:"20px",color:"#444"},
};
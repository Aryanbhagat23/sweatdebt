import React, { useEffect, useState } from "react";

export default function PageTransition({ children }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 20);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(8px)",
      transition: "opacity 0.25s ease, transform 0.25s ease",
    }}>
      {children}
    </div>
  );
}
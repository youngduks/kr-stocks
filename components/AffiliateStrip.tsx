import { getActiveAffiliates } from "@/lib/affiliates";

export default function AffiliateStrip() {
  const list = getActiveAffiliates();
  if (list.length === 0) return null;

  return (
    <section
      style={{
        marginTop: "2rem",
        marginBottom: "1rem",
        padding: "1rem",
        borderTop: "1px solid rgba(127,127,127,0.2)",
        borderBottom: "1px solid rgba(127,127,127,0.2)",
        background: "rgba(127,127,127,0.03)",
      }}
      aria-label="추천 서비스"
    >
      <div style={{ fontSize: "0.75rem", opacity: 0.55, marginBottom: "0.6rem", letterSpacing: "0.02em" }}>
        🤝 추천 서비스 · 가입 시 혜택
      </div>
      <div
        style={{
          display: "grid",
          gap: "0.6rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        }}
      >
        {list.map((a) => (
          <a
            key={a.id}
            href={a.url!}
            target="_blank"
            rel="nofollow noopener sponsored"
            style={{
              display: "block",
              padding: "0.7rem 0.85rem",
              borderRadius: 8,
              border: "1px solid rgba(127,127,127,0.25)",
              background: "rgba(127,127,127,0.04)",
              textDecoration: "none",
              color: "inherit",
              transition: "background 0.15s",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.2rem" }}>
              <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                {a.emoji} {a.name}
              </span>
              {a.highlight && (
                <span
                  style={{
                    fontSize: "0.65rem",
                    background: "rgba(255,180,50,0.18)",
                    color: "#c87a1a",
                    padding: "0.1rem 0.4rem",
                    borderRadius: 4,
                    fontWeight: 600,
                  }}
                >
                  {a.highlight}
                </span>
              )}
            </div>
            <div style={{ fontSize: "0.75rem", opacity: 0.7, lineHeight: 1.35 }}>{a.description}</div>
          </a>
        ))}
      </div>
      <div style={{ fontSize: "0.65rem", opacity: 0.4, marginTop: "0.7rem", textAlign: "right" }}>
        * 제휴 링크 — 가입 시 운영진에게 수수료가 지급됩니다 (사용자 부담 없음)
      </div>
    </section>
  );
}

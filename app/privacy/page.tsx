import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { fetchAllPrices } from "@/lib/fetchPrices";
import Link from "next/link";
import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: "kr-stocks.com 개인정보처리방침 — 수집 정보, 쿠키·광고 사용, 문의처 안내.",
  robots: { index: true, follow: true },
  alternates: { canonical: "https://kr-stocks.com/privacy" },
};

const LAST_UPDATED = "2026-07-14";

export default async function PrivacyPage() {
  const data = await fetchAllPrices();

  return (
    <>
      <Header fxRate={data.fx.krw_per_usdt} fxChange={data.fx.change_24h_pct} />
      <main className="max-w-3xl mx-auto px-5 pt-6 pb-12">
        <Link href="/" className="text-xs text-text-dim hover:text-text-muted">
          ← 홈으로
        </Link>

        <article className="mt-4">
          <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">개인정보처리방침</h1>
            <p className="text-text-dim text-sm">시행일자: {LAST_UPDATED}</p>
          </header>

          <div className="space-y-6 text-sm text-text-muted leading-relaxed">
            <p>
              kr-stocks.com(이하 "사이트")은 이용자의 개인정보를 중요하게 생각하며, 관련 법령을
              준수합니다. 본 방침은 사이트가 어떤 정보를 어떻게 수집·이용하는지 안내합니다.
            </p>

            <section>
              <h2 className="text-lg font-bold text-text mb-2">1. 수집하는 정보</h2>
              <div className="p-4 rounded-xl bg-bg-card border border-line space-y-2">
                <p>
                  <span className="font-semibold text-text">방문 통계</span> — 사이트는 실시간 방문자 수 표시를
                  위해 브라우저에서 무작위로 생성한 익명 세션 식별자(session ID)만 서버에 전송·집계합니다.
                  이름, 이메일, 전화번호 등 개인을 특정할 수 있는 정보는 수집하지 않으며, IP 주소를 별도로
                  저장하지 않습니다.
                </p>
                <p>
                  <span className="font-semibold text-text">자동 수집 정보</span> — 웹 서버 특성상 접속 로그,
                  브라우저 종류, 기기 정보 등이 인프라(Vercel) 단에서 일반적인 운영·보안 목적으로 일시
                  처리될 수 있습니다.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-text mb-2">2. 이용 목적</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>실시간 방문자 수 등 서비스 이용 현황 통계 제공</li>
                <li>서비스 안정성 확보 및 오류 대응</li>
                <li>서비스 개선을 위한 이용 패턴 분석</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-text mb-2">3. 보유·이용 기간</h2>
              <p>
                방문 세션 식별자는 접속 후 최대 5분간 "현재 접속자 수" 집계에만 활용되며, 이후 개별
                식별자는 통계 집계 목적 외에는 별도로 조회·이용하지 않습니다. 누적 방문자 수는 개인을
                특정할 수 없는 합계 수치로만 보관됩니다.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-text mb-2">4. 쿠키(Cookie) 및 광고</h2>
              <div className="p-4 rounded-xl bg-gradient-to-br from-accent-amber/10 via-accent-purple/5 to-accent-blue/10 border border-line space-y-2">
                <p>
                  사이트는 <span className="font-semibold text-text">Google AdSense</span>를 통해 광고를
                  게재할 수 있습니다. Google을 비롯한 제3자 광고 서비스 제공업체는 쿠키를 사용해 이용자의
                  이전 사이트 방문 이력을 기반으로 광고를 게재할 수 있습니다.
                </p>
                <p>
                  Google의 광고 쿠키 사용에 대한 자세한 내용과 맞춤 광고 해제 방법은{" "}
                  <a
                    href="https://policies.google.com/technologies/ads"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-blue hover:underline"
                  >
                    Google 광고 정책 페이지
                  </a>
                  에서, 맞춤 광고는{" "}
                  <a
                    href="https://adssettings.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent-blue hover:underline"
                  >
                    Google 광고 설정
                  </a>
                  에서 해제할 수 있습니다.
                </p>
                <p className="text-xs text-text-dim">
                  이용자는 브라우저 설정을 통해 쿠키 저장을 거부하거나 삭제할 수 있습니다. 다만 쿠키 저장을
                  거부할 경우 일부 서비스 이용에 제한이 있을 수 있습니다.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-text mb-2">5. 제3자 제공 및 처리 위탁</h2>
              <p>
                사이트는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만 서비스 운영을 위해
                아래와 같은 인프라·서비스를 이용하며, 각 서비스는 자체 개인정보처리방침을 따릅니다.
              </p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>
                  <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-accent-blue hover:underline">
                    Vercel
                  </a>{" "}
                  — 호스팅 인프라
                </li>
                <li>
                  <a href="https://upstash.com/trust/privacy.pdf" target="_blank" rel="noopener noreferrer" className="text-accent-blue hover:underline">
                    Upstash
                  </a>{" "}
                  — 방문자 수 집계용 데이터 저장
                </li>
                <li>
                  <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-accent-blue hover:underline">
                    Google AdSense
                  </a>{" "}
                  — 광고 게재(도입 시)
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-bold text-text mb-2">6. 이용자의 권리</h2>
              <p>
                사이트는 개인을 식별할 수 있는 정보를 별도로 수집·저장하지 않으므로 열람·정정·삭제를
                요청할 개인정보가 원칙적으로 존재하지 않습니다. 쿠키·광고 관련 문의나 기타 개인정보
                관련 문의는 아래 연락처로 접수해 주시면 신속히 답변드립니다.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-text mb-2">7. 문의처</h2>
              <p>
                개인정보 처리 관련 문의:{" "}
                <a
                  href="mailto:contact@kr-stocks.com?subject=%5B%EA%B0%9C%EC%9D%B8%EC%A0%95%EB%B3%B4%EB%AC%B8%EC%9D%98%5D%20kr-stocks.com"
                  className="text-accent-blue hover:underline"
                >
                  contact@kr-stocks.com
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-text mb-2">8. 방침 변경</h2>
              <p>
                본 방침은 법령·서비스 변경에 따라 개정될 수 있으며, 변경 시 본 페이지를 통해 공지합니다.
              </p>
            </section>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}

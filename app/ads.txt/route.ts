// ads.txt — Google AdSense 발급 publisher ID(ca-pub-5171852166925849) 기준.
// 형식: <광고시스템 도메인>, <publisher ID>, <관계(DIRECT/RESELLER)>, <TAG-ID>
// f08c47fec0942fa0 는 Google 소유 확인용 고정 인증 ID (Google 공식 문서 값).
export async function GET() {
  const body = "google.com, pub-5171852166925849, DIRECT, f08c47fec0942fa0\n";
  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

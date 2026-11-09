#!/usr/bin/env bash
# 보이스노트 규칙 엔진은 웹과 아이폰 앱이 같은 파일을 쓴다.
#   원본: public/voicenote/rules.js
#   사본: ios/VoiceNote.swiftpm/Resources/rules.js  (Swift Playgrounds는 심볼릭 링크를 못 따라가서 사본을 둔다)
#
#   scripts/sync-voicenote-rules.sh          원본 → 사본 복사
#   scripts/sync-voicenote-rules.sh --check  둘이 다르면 실패 (CI·커밋 전 확인용)
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=public/voicenote/rules.js
DST=ios/VoiceNote.swiftpm/Resources/rules.js
if [[ "${1:-}" == "--check" ]]; then
  if cmp -s "$SRC" "$DST"; then echo "rules.js 동기화됨"; else echo "rules.js가 다릅니다. scripts/sync-voicenote-rules.sh 를 실행하세요." >&2; exit 1; fi
else
  cp "$SRC" "$DST"
  echo "복사함: $SRC → $DST"
fi

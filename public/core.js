export function redact(value) {
  let count = 0;
  const hide = () => { count++; return '[REDACTED]'; };
  const text = value
    .replace(/\bBearer\s+[^\s"'<>]+/gi, () => `Bearer ${hide()}`)
    .replace(/\b(?:sk-[a-zA-Z0-9_-]{12,}|gh[pousr]_[a-zA-Z0-9_]{12,}|github_pat_[a-zA-Z0-9_]+|AKIA[A-Z0-9]{16})\b/g, hide)
    .replace(/\beyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/g, hide)
    .replace(/\b(password|passwd|pwd|api[_-]?key|access[_-]?token|refresh[_-]?token|secret|authorization|cookie|set-cookie)\b(["']?\s*[:=]\s*)("[^"]*"|'[^']*'|[^\r\n,;&]+)/gi, (_, key, separator, value) => `${key}${separator}${value.includes('[REDACTED]') ? '[REDACTED]' : hide()}`)
    .replace(/(https?:\/\/)[^\s/@]+:[^\s/@]+@/gi, (_, scheme) => `${scheme}${hide()}@`)
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, hide)
    .replace(/\b01[016789][- ]?\d{3,4}[- ]?\d{4}\b/g, hide);
  return { text, count };
}

export function prepare(input, mask = true) {
  const output = {}; let count = 0;
  for (const key of ['context', 'stack', 'log']) {
    const value = String(input[key] || '').trim();
    const result = mask ? redact(value) : { text: value, count: 0 };
    output[key] = result.text; count += result.count;
  }
  return { ...output, count };
}

export function classify(log) {
  const rules = [
    [/TypeError|Cannot read properties|undefined is not/i, 'TypeError', '값이 없거나 예상한 타입과 다른 값이 사용됐을 가능성이 있습니다.', ['스택 트레이스의 첫 번째 프로젝트 파일과 줄 번호를 확인하세요.', '해당 변수의 초기값과 API 응답 구조를 확인하세요.', '로딩 중 상태와 값이 없는 경우를 분리해 재현하세요.']],
    [/ECONNREFUSED|ENOTFOUND|ETIMEDOUT|Failed to fetch/i, '네트워크 오류', '주소·포트·서버 상태 또는 네트워크 설정을 확인할 필요가 있습니다.', ['대상 서버 실행 여부와 호스트·포트를 확인하세요.', '실행 환경의 네트워크 접근과 환경변수를 확인하세요.', '브라우저 오류라면 Network 탭에서 CORS와 응답을 확인하세요.']],
    [/\b401\b|Unauthorized/i, '인증 오류', '인증 정보가 누락됐거나 만료됐을 가능성이 있습니다.', ['요청에 인증 정보가 포함되는지 확인하세요.', '토큰 만료와 서버의 인증 설정을 확인하세요.', '개발 환경과 배포 환경의 쿠키 설정을 비교하세요.']],
    [/\b403\b|Forbidden/i, '권한 오류', '인증 후 접근 권한이나 정책에 의해 요청이 거부됐을 수 있습니다.', ['요청 계정의 권한을 확인하세요.', '접근 정책과 허용된 출처를 확인하세요.', '서버 로그에서 거부 이유를 확인하세요.']],
    [/Module not found|Cannot find module|ERR_MODULE_NOT_FOUND/i, '모듈 오류', '의존성 누락 또는 파일 경로 차이일 수 있습니다.', ['패키지 설치 여부와 잠금 파일을 확인하세요.', 'import 경로와 파일명 대소문자를 확인하세요.', '로컬과 배포 환경의 런타임 버전을 비교하세요.']],
    [/SyntaxError|Unexpected token/i, '구문 오류', '코드 구문이나 응답 데이터 형식이 예상과 다를 수 있습니다.', ['오류 위치 전후의 코드 구문을 확인하세요.', 'JSON 처리 중이라면 실제 응답 본문과 Content-Type을 확인하세요.', '빌드 도구와 런타임의 문법 지원 여부를 확인하세요.']],
    [/\b500\b|Internal Server Error/i, '서버 오류', '서버 내부에서 처리되지 않은 예외가 발생했을 수 있습니다.', ['실패한 요청의 시각과 요청 ID를 확인하세요.', '서버 로그에서 최초 예외를 확인하세요.', '환경변수와 외부 서비스 연결을 확인하세요.']]
  ];
  const hit = rules.find(([pattern]) => pattern.test(log));
  return hit ? { type: hit[1], hypothesis: hit[2], steps: hit[3] } : { type: '오류 확인 필요', hypothesis: '로그만으로 원인을 특정하기 어렵습니다. 아래 순서로 추가 정보를 수집하세요.', steps: ['첫 오류 메시지와 발생 파일·줄 번호를 확인하세요.', '같은 입력과 실행 환경에서 재현되는지 확인하세요.', '기대 동작, 실제 동작, 최근 변경 사항을 함께 기록하세요.'] };
}

export function formatCard(data) {
  const info = classify(data.log);
  const summary = data.log.split('\n').find(line => /error|exception|failed|오류/i.test(line)) || data.log.split('\n')[0];
  const fence = '`'.repeat(Math.max(3, ...([...data.log.matchAll(/`+/g)].map(m => m[0].length + 1))));
  return `# [${info.type}] ${summary.slice(0, 140)}\n\n## 발생 상황\n${data.context || '미입력 — 어떤 동작에서 발생했는지 추가해 주세요.'}\n\n## 개발 환경\n${data.stack || '미입력 — 프레임워크·런타임 버전을 추가해 주세요.'}\n\n## 확인된 사실\n- 아래 오류 메시지가 입력됐습니다. 실행 결과나 코드는 직접 확인하지 않았습니다.\n\n## 원인 후보 · 규칙 기반 추정\n${info.hypothesis}\n\n## 확인 순서\n${info.steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}\n\n## 에러 로그\n${fence}text\n${data.log}\n${fence}\n\n## 공유할 질문\n위 상황에서 오류가 발생합니다. 원인 후보와 우선 확인할 위치를 함께 검토해 주세요.\n\n## 추가하면 좋은 정보\n- 재현 순서:\n- 기대 동작 / 실제 동작:\n- 이미 시도한 방법:\n- 최근 변경 사항:\n\n---\n에러노트 · 규칙 기반 초안 · 원인 확정 아님`;
}

import { prepare, classify, formatCard } from './core.js';
const $ = id => document.getElementById(id);
let markdown = ''; let busy = false;
const updateCount = () => { $('counter').textContent = `${$('log').value.length.toLocaleString()} / 20,000`; };
$('log').addEventListener('input', updateCount);
$('sample').addEventListener('click', () => {
  if (busy) return;
  $('context').value = '로그인 직후 프로필 화면에서 사용자 이름을 표시할 때 오류가 발생합니다.';
  $('stack').value = 'Next.js · TypeScript · Vercel';
  $('log').value = 'TypeError: Cannot read properties of undefined (reading \'name\')\n    at UserProfile (src/components/UserProfile.tsx:24:18)\n    at renderWithHooks (react-dom.development.js:15486:18)\n\nGET /api/user 200\nuser.email = developer@example.com\nAuthorization: Bearer example-secret-token';
  updateCount(); $('log').focus();
});
$('editor').addEventListener('submit', async event => {
  event.preventDefault(); if (busy) return;
  const input = { log: $('log').value, context: $('context').value, stack: $('stack').value };
  if (!input.log.trim()) { $('form-status').textContent = '에러 로그를 입력해 주세요.'; $('log').focus(); return; }
  busy = true; $('generate').disabled = true; $('form-status').classList.remove('error');
  $('form-status').textContent = '이슈 카드를 정리하고 있어요…';
  try {
    const data = prepare(input, $('mask').checked);
    let mode = '규칙 기반 정리';
    if ($('ai').checked) {
      const response = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), signal: AbortSignal.timeout(55000) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'AI 분석을 완료하지 못했습니다.');
      markdown = result.text; mode = 'AI 분석 · 검토 필요';
    } else markdown = formatCard(data);
    $('result-text').textContent = markdown;
    $('result-type').textContent = `${classify(data.log).type} · ${mode}`;
    $('mask-count').textContent = $('mask').checked ? `${data.count}곳 가림` : '자동 가리기 꺼짐';
    $('empty').hidden = true; $('result').hidden = false; $('result-badge').textContent = 'READY';
    $('form-status').textContent = '완성됐어요. 공유 전에 내용과 민감정보를 확인해 주세요.';
    $('copy-status').textContent = '';
    if (innerWidth < 761) $('output-title').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    $('form-status').classList.add('error');
    $('form-status').textContent = error.name === 'TimeoutError' ? '응답 시간이 초과됐습니다. 다시 시도하거나 AI 선택을 해제해 주세요.' : error.message;
  } finally { busy = false; $('generate').disabled = false; }
});
$('copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(markdown); $('copy-status').textContent = '복사했어요. 팀 채팅이나 이슈에 붙여 넣으세요.'; }
  catch { $('copy-status').textContent = '복사를 허용하지 않은 브라우저입니다. .md 저장을 이용해 주세요.'; }
});
$('download').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = 'error-note.md'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$('reset').addEventListener('click', () => {
  if (busy) return;
  $('editor').reset(); markdown = ''; $('result-text').textContent = ''; $('result').hidden = true; $('empty').hidden = false; $('result-badge').textContent = 'PREVIEW'; $('form-status').textContent = '입력 내용은 자동 저장되지 않습니다.'; $('form-status').classList.remove('error'); updateCount(); $('context').focus();
});
fetch('/api/analyze').then(r => r.ok ? r.json() : Promise.reject()).then(config => {
  $('ai').disabled = !config.enabled; $('ai-status').textContent = config.enabled ? '사용 가능' : 'AI 연결 준비 중';
}).catch(() => { $('ai').disabled = true; $('ai-status').textContent = 'AI 연결 확인 불가'; });

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { redact, prepare, formatCard } from '../public/core.js';
test('redacts secrets from logs, context and environment', () => {
  const input = {log:'Authorization: Bearer token-value\nemail=a@sample.com\npassword="sensitive"\nhttps://alice:secret@host/path', context: '연락 b@sample.com',stack:'api_key=secret123'};
  const output = prepare(input);
  for (const secret of ['token-value','a@sample.com','sensitive','alice:secret','b@sample.com','secret123']) assert.ok(!JSON.stringify(output).includes(secret));
  assert.ok(output.count >= 6);
});
test('does not misrepresent unrecognized errors or execute pasted HTML', () => {
  const result = formatCard(prepare({log:'<script>alert(1)</script>\nunknown failure'}));
  assert.match(result,/원인을 특정하기 어렵/); assert.match(result,/원인 확정 아님/);
});
test('embedded markdown fences cannot end the log block', () => {
  assert.match(formatCard({log:'Error\n```\nhello',context:'',stack:''}), /````text/);
});
test('ordinary logs remain readable and masking can be disabled', () => {
  assert.equal(redact('TypeError at user.ts:24').text,'TypeError at user.ts:24');
  assert.equal(prepare({log:'test@example.com'},false).log,'test@example.com');
});

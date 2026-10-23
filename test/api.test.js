import { test } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/analyze.js';
function response() { return { headers:{}, setHeader(k,v){this.headers[k]=v;}, status(code){this.code=code;return this;},json(data){this.data=data;return this;} }; }
test('AI disabled is explicit, does not invent a result',async()=>{
  const res=response(); await handler({method:'GET'},res); assert.equal(res.code,200); assert.equal(res.data.enabled,false);
  const result=response(); await handler({method:'POST',body:{log:'TypeError'},headers:{}},result); assert.equal(result.code,503); assert.ok(result.data.error); assert.equal(result.data.text,undefined);
});
test('invalid requests are rejected before any external call',async()=>{
  for(const body of [{log:''},{log:'x'.repeat(20001)},{log:'Error',context:{}},null,'bad json']) {
    const res=response(); await handler({method:'POST',body,headers:{}},res); assert.equal(res.code,400);
  }
  const res=response(); await handler({method:'DELETE'},res); assert.equal(res.code,405);
});

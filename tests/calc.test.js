// node --test tests/calc.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { stampProgress, incrementalProfit, sampleSizePerArm } = require('../lib/calc.js');

test('신규 가입자: WHITE까지 5잔, 첫 무료 커피까지 32잔', () => {
  const p = stampProgress(0);
  assert.equal(p.grade, 'WELCOME');
  assert.equal(p.toWhite, 5);
  assert.equal(p.toSmallReward, 23);
  assert.equal(p.toFreeCoffee, 32);
  assert.equal(p.whiteCouponPack, false);
});

test('5잔째 WHITE 쿠폰팩', () => {
  const p = stampProgress(5);
  assert.equal(p.grade, 'WHITE');
  assert.equal(p.whiteCouponPack, true);
  assert.equal(p.toBlue, 15);
});

test('20잔 BLUE 승급 직후 사용 가능 스탬프 0개(승급용 소멸)', () => {
  const p = stampProgress(20);
  assert.equal(p.grade, 'BLUE');
  assert.equal(p.usable, 0);
  assert.equal(p.toSmallReward, 3);
});

test('23잔째 첫 800원 할인, 32잔째 첫 무료 커피', () => {
  assert.equal(stampProgress(23).toSmallReward, 0);
  assert.equal(stampProgress(32).toFreeCoffee, 0);
  assert.equal(stampProgress(31).toFreeCoffee, 1);
});

test('잘못된 입력은 거부', () => {
  assert.throws(() => stampProgress(-1), RangeError);
  assert.throws(() => stampProgress('abc'), RangeError);
});

test('증분 이익: 원래 왔을 고객의 혜택 비용까지 반영', () => {
  // 처리군 1000명 중 250명 재방문, 대조군 1000명 중 200명 재방문
  // 증분 방문 50 × 1,500원 = 75,000, 혜택 250건 × 400원 = 100,000 → 손실
  const r = incrementalProfit({ treatN: 1000, treatReturns: 250, ctrlN: 1000, ctrlReturns: 200, contributionPerVisit: 1500, redemptions: 250, unitCost: 400 });
  assert.equal(r.incrementalVisits, 50);
  assert.equal(r.benefitCost, 100000);
  assert.equal(r.profit, -25000);
  assert.equal(r.adopt, false);
});

test('증분 이익: 대조군 크기가 달라도 비율로 환산', () => {
  const r = incrementalProfit({ treatN: 2000, treatReturns: 500, ctrlN: 1000, ctrlReturns: 200, contributionPerVisit: 2000, redemptions: 300, unitCost: 300 });
  assert.equal(r.incrementalVisits, 100);
  assert.equal(r.profit, 100 * 2000 - 90000);
  assert.equal(r.adopt, true);
});

test('표본 수: 전략서 값과 일치(20%→23% 약 2,943명, 20%→25% 약 1,094명)', () => {
  assert.ok(Math.abs(sampleSizePerArm(0.2, 0.23) - 2943) <= 2);
  assert.ok(Math.abs(sampleSizePerArm(0.2, 0.25) - 1094) <= 2);
  // 3개 비교 본페로니 보정
  assert.ok(Math.abs(sampleSizePerArm(0.2, 0.23, 0.05 / 3) - 3925) <= 3);
});

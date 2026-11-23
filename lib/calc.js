/*
 * 포트폴리오 랜딩 계산 모듈 (브라우저·Node 공용)
 * - stampProgress: 이디야멤버스 공개 안내 기준 스탬프 진행 계산
 *   근거: members.ediya.com/guide/membership (2026-11-23 열람)
 *   WHITE 5개(쿠폰팩 최초 1회), BLUE 20개(승급용 스탬프 소멸), BLUE 이후 적립분 3개=800원 할인, 12개=아메리카노(L)
 * - incrementalProfit: H1 실험 증분 이익 (전략서 4-4 경제성 공식)
 * - sampleSizePerArm: 두 비율 비교 표본 수(정규 근사, 양측)
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Calc = api;
})(typeof self !== 'undefined' ? self : this, function () {
  const WHITE_AT = 5;
  const BLUE_AT = 20;
  const REWARD_SMALL = 3;   // 800원 할인
  const REWARD_FREE = 12;   // 아메리카노(L) 무료

  function stampProgress(totalStamps) {
    const n = Math.floor(Number(totalStamps));
    if (!Number.isFinite(n) || n < 0) throw new RangeError('stamps must be a non-negative number');
    const grade = n >= BLUE_AT ? 'BLUE' : n >= WHITE_AT ? 'WHITE' : 'WELCOME';
    const usable = Math.max(0, n - BLUE_AT);
    return {
      grade,
      usable,
      toWhite: Math.max(0, WHITE_AT - n),
      toBlue: Math.max(0, BLUE_AT - n),
      // 첫 800원 할인까지 남은 잔 수, 첫 무료 아메리카노까지 남은 잔 수(누적 기준)
      toSmallReward: Math.max(0, BLUE_AT + REWARD_SMALL - n),
      toFreeCoffee: Math.max(0, BLUE_AT + REWARD_FREE - n),
      whiteCouponPack: n >= WHITE_AT,
    };
  }

  /**
   * 증분 이익 = (처리군 재방문 − 대조군 기대 재방문) × 방문당 공헌이익
   *            − 처리군 혜택 사용 건수 × 혜택 단가 − 운영비
   * 대조군 기대 재방문은 대조군 재방문율 × 처리군 인원으로 환산한다.
   */
  function incrementalProfit({ treatN, treatReturns, ctrlN, ctrlReturns, contributionPerVisit, redemptions, unitCost, opsCost = 0 }) {
    for (const [k, v] of Object.entries({ treatN, treatReturns, ctrlN, ctrlReturns, contributionPerVisit, redemptions, unitCost, opsCost })) {
      if (!Number.isFinite(v) || v < 0) throw new RangeError(`${k} must be a non-negative number`);
    }
    if (treatN === 0 || ctrlN === 0) throw new RangeError('group size must be > 0');
    const expectedCtrl = (ctrlReturns / ctrlN) * treatN;
    const incrementalVisits = treatReturns - expectedCtrl;
    const benefitCost = redemptions * unitCost;
    const profit = incrementalVisits * contributionPerVisit - benefitCost - opsCost;
    return { incrementalVisits, benefitCost, profit, adopt: profit > 0 };
  }

  // 표준정규 분위수(Acklam 근사)
  function normInv(p) {
    if (p <= 0 || p >= 1) throw new RangeError('p in (0,1)');
    const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
    const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
    const pl = 0.02425;
    let q, r;
    if (p < pl) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
    if (p > 1 - pl) { q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
    q = p - 0.5; r = q * q;
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q / (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
  }

  function sampleSizePerArm(p1, p2, alpha = 0.05, power = 0.8) {
    const za = normInv(1 - alpha / 2), zb = normInv(power);
    const pb = (p1 + p2) / 2;
    const n = Math.pow(za * Math.sqrt(2 * pb * (1 - pb)) + zb * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2)), 2) / Math.pow(p2 - p1, 2);
    return Math.ceil(n);
  }

  return { stampProgress, incrementalProfit, sampleSizePerArm, normInv, WHITE_AT, BLUE_AT };
});

/* 랜딩 상호작용과 측정 이벤트(GA4 권장 이벤트 우선, 전략서 3-3)
 * - 모든 이벤트는 dataLayer에 push한다. GTM이 설정되면 GTM이 GA4로 보낸다.
 * - 개인정보는 보내지 않는다. 사용자 식별자 대신 예시 매장 ID만 보낸다.
 * - ?debug=1 이면 화면에 dataLayer 기록을 보여 준다(포트폴리오 캡처용).
 */
(function () {
  const cfg = window.LANDING_CONFIG || {};
  const dl = (window.dataLayer = window.dataLayer || []);
  const params = new URLSearchParams(location.search);
  const debug = params.get('debug') === '1';
  const debugBox = document.getElementById('debug');
  const debugLog = document.getElementById('debug-log');

  // 이전 방문에서 저장한 동의를 GA 설정보다 먼저 반영한다(첫 page_view가 거부 상태로 나가지 않게)
  try {
    if (localStorage.getItem('landing_consent_v1') === 'granted') gtag('consent', 'update', { analytics_storage: 'granted' });
  } catch (e) { /* 저장소 접근 불가 */ }

  // GA4 직접 연결(gtag). 동의 모드 기본값은 index.html <head>에서 denied로 설정됨.
  if (cfg.measurementId && !cfg.gtmId) {
    const g = document.createElement('script');
    g.async = true;
    g.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(cfg.measurementId);
    document.head.appendChild(g);
    gtag('js', new Date());
    gtag('config', cfg.measurementId, debug ? { debug_mode: true } : {});
  }

  function track(event, data) {
    const payload = Object.assign({ event }, data || {});
    if (payload.ecommerce) dl.push({ ecommerce: null }); // GA4 권장: 이전 ecommerce 객체 초기화
    dl.push(payload);
    if (cfg.measurementId && !cfg.gtmId && event !== 'consent_update') {
      const params = Object.assign({}, data || {});
      if (params.ecommerce) { Object.assign(params, params.ecommerce); delete params.ecommerce; }
      if (debug) params.debug_mode = true;
      gtag('event', event, params);
    }
    if (debug) {
      debugBox.hidden = false;
      debugLog.textContent = JSON.stringify(payload) + '\n' + debugLog.textContent;
    }
  }
  window.__track = track;

  // GTM 로드(ID가 있을 때만)
  if (cfg.gtmId) {
    dl.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(cfg.gtmId);
    document.head.appendChild(s);
  }

  // 동의 배너
  const KEY = 'landing_consent_v1';
  const banner = document.getElementById('consent');
  function readConsent() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function saveConsent(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* 저장 불가 환경 */ } }
  function applyConsent(v) {
    const granted = v === 'granted';
    gtag('consent', 'update', { analytics_storage: granted ? 'granted' : 'denied' });
    track('consent_update', { analytics_storage: granted ? 'granted' : 'denied' });
  }
  const stored = readConsent();
  if (stored) applyConsent(stored); else banner.hidden = false;
  document.getElementById('consent-accept').addEventListener('click', () => { saveConsent('granted'); applyConsent('granted'); banner.hidden = true; });
  document.getElementById('consent-reject').addEventListener('click', () => { saveConsent('denied'); applyConsent('denied'); banner.hidden = true; });
  document.getElementById('consent-reopen').addEventListener('click', (e) => { e.preventDefault(); banner.hidden = false; });

  // CTA 클릭
  document.querySelectorAll('[data-cta]').forEach((el) => {
    if (el.tagName === 'A') el.addEventListener('click', () => track('click_cta', { cta_location: el.dataset.cta }));
  });

  // 스탬프 계산기
  const stampInput = document.getElementById('stamp-input');
  const stampOut = document.getElementById('stamp-output');
  function renderStamp() {
    const v = Number(stampInput.value);
    if (!Number.isFinite(v) || v < 0 || v > 200) { stampOut.textContent = '0~200 사이 숫자를 넣어 주세요.'; return; }
    const p = window.Calc.stampProgress(v);
    const parts = [`현재 등급: ${p.grade}`];
    if (p.toWhite > 0) parts.push(`WHITE 쿠폰팩까지 ${p.toWhite}잔`);
    else if (p.toBlue > 0) parts.push(`BLUE 승급까지 ${p.toBlue}잔`);
    if (p.toSmallReward > 0) parts.push(`첫 800원 할인까지 ${p.toSmallReward}잔`);
    parts.push(p.toFreeCoffee > 0 ? `첫 무료 아메리카노까지 ${p.toFreeCoffee}잔` : '무료 아메리카노 교환 가능 구간');
    stampOut.textContent = parts.join(' · ');
  }
  stampInput.addEventListener('input', renderStamp);
  stampInput.addEventListener('change', () => track('use_stamp_calculator', { stamps: Number(stampInput.value) || 0 }));
  renderStamp();

  // 프로모션 노출·클릭(전략서: select_promotion에는 items 필요)
  const promoItems = [{ item_id: 'sizeup_welcome', item_name: '7일 내 2회차 사이즈업(제안안)', promotion_id: 'welcome_2nd_visit', promotion_name: '웰컴 2회차 혜택' }];
  const offer = document.querySelector('[data-promo-id]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { track('view_promotion', { ecommerce: { items: promoItems } }); io.disconnect(); } });
    }, { threshold: 0.5 });
    io.observe(offer);
  }
  document.querySelector('[data-testid="select-promo"]').addEventListener('click', () => {
    track('select_promotion', { ecommerce: { items: promoItems } });
    location.href = 'appendix/#offer';
  });

  // IP 협업 응모 시뮬레이션
  document.querySelector('[data-testid="join-campaign"]').addEventListener('click', (e) => {
    track('join_campaign', { campaign_id: e.currentTarget.dataset.campaign, valid_visit_days: 0 });
    e.currentTarget.textContent = '응모 조건: 가입 + 서로 다른 날 2번 방문(시뮬레이션 기록됨)';
  });

  // 주문 시뮬레이션(begin_checkout → purchase, transaction_id·items·currency 포함)
  const item = { item_id: 'americano_l', item_name: '아메리카노(매장 기본)', price: 3200, quantity: 1 };
  const btnBegin = document.querySelector('[data-testid="begin-checkout"]');
  const btnBuy = document.querySelector('[data-testid="purchase"]');
  const orderOut = document.getElementById('order-output');
  btnBegin.addEventListener('click', () => {
    track('begin_checkout', { ecommerce: { currency: 'KRW', value: 3200, items: [item] } });
    btnBuy.disabled = false;
    orderOut.textContent = '장바구니에 담았습니다(시뮬레이션).';
  });
  btnBuy.addEventListener('click', () => {
    const tid = 'sim_' + Date.now().toString(36);
    track('purchase', { ecommerce: { transaction_id: tid, currency: 'KRW', value: 3200, items: [item] } });
    btnBuy.disabled = true;
    orderOut.textContent = `주문 완료 이벤트를 기록했습니다(결제 없음, 거래 ID ${tid}).`;
  });

  // 가입 시뮬레이션 → sign_up, marketing_consent, set_favorite_store
  const form = document.getElementById('signup-form');
  const signOut = document.getElementById('signup-output');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const area = form.area.value;
    if (!area) { signOut.textContent = '동네를 골라 주세요.'; form.area.focus(); return; }
    track('click_cta', { cta_location: 'bottom' });
    track('sign_up', { method: 'simulation' });
    track('marketing_consent', { ad_consent: form.consent_ad.checked, night_consent: form.consent_night.checked });
    track('set_favorite_store', { store_id: area, store_type: 'residential_demo' });
    signOut.textContent = '단골 매장을 정했습니다(시뮬레이션). 실제 가입이나 혜택은 없습니다.';
  });
})();

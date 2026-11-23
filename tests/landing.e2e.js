// 랜딩 E2E: 비공식 표기, 브랜드 안전, 동의 모드, 측정 이벤트, 접근성 기본값
const { test, expect } = require('@playwright/test');

const events = (page) => page.evaluate(() => window.dataLayer.filter((e) => e.event).map((e) => e.event));

test.beforeEach(async ({ page }) => {
  page.on('pageerror', (err) => { throw err; });
  await page.goto('/index.html');
});

test('상·하단 비공식 표기와 noindex가 있다', async ({ page }) => {
  await expect(page.getByTestId('disclaimer-top')).toContainText('비공식');
  await expect(page.getByTestId('disclaimer-bottom')).toContainText('관련이 없고');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});

test('브랜드 안전: 이미지·로고 없음, 후기는 모두 예시 표시', async ({ page }) => {
  await expect(page.locator('img')).toHaveCount(0);
  const reviews = page.locator('.review');
  const n = await reviews.count();
  expect(n).toBeGreaterThan(0);
  for (let i = 0; i < n; i++) await expect(reviews.nth(i)).toContainText('실제 고객 후기 아님');
});

test('동의 기본값은 거부, 동의 클릭 시 granted로 갱신', async ({ page }) => {
  const def = await page.evaluate(() => Array.from(window.dataLayer).find((e) => e[0] === 'consent' && e[1] === 'default'));
  expect(def[2].analytics_storage).toBe('denied');
  await expect(page.getByTestId('consent-banner')).toBeVisible();
  await page.getByTestId('consent-accept').click();
  await expect(page.getByTestId('consent-banner')).toBeHidden();
  const upd = await page.evaluate(() => window.dataLayer.filter((e) => e.event === 'consent_update').pop());
  expect(upd.analytics_storage).toBe('granted');
});

test('스탬프 계산기: 0잔이면 첫 무료까지 32잔', async ({ page }) => {
  await expect(page.getByTestId('stamp-output')).toContainText('첫 무료 아메리카노까지 32잔');
  await page.getByTestId('stamp-input').fill('20');
  await expect(page.getByTestId('stamp-output')).toContainText('BLUE');
});

test('주문 시뮬레이션: purchase에 transaction_id·currency·items', async ({ page }) => {
  await page.getByTestId('consent-reject').click();
  await page.getByTestId('begin-checkout').click();
  await page.getByTestId('purchase').click();
  const p = await page.evaluate(() => window.dataLayer.filter((e) => e.event === 'purchase').pop());
  expect(p.ecommerce.transaction_id).toMatch(/^sim_/);
  expect(p.ecommerce.currency).toBe('KRW');
  expect(p.ecommerce.items.length).toBe(1);
  await expect(page.getByTestId('purchase')).toBeDisabled();
});

test('가입 시뮬레이션: 매장 미선택이면 막고, 선택하면 이벤트 4종', async ({ page }) => {
  await page.getByTestId('consent-reject').click();
  await page.getByTestId('cta-bottom').click();
  await expect(page.getByTestId('signup-output')).toContainText('골라 주세요');
  await page.getByTestId('area-select').selectOption('demo_busanjin');
  await page.getByTestId('consent-ad').check();
  await page.getByTestId('cta-bottom').click();
  const ev = await events(page);
  for (const name of ['click_cta', 'sign_up', 'marketing_consent', 'set_favorite_store']) expect(ev).toContain(name);
  const store = await page.evaluate(() => window.dataLayer.filter((e) => e.event === 'set_favorite_store').pop());
  expect(store.store_id).toBe('demo_busanjin');
  const consent = await page.evaluate(() => window.dataLayer.filter((e) => e.event === 'marketing_consent').pop());
  expect(consent).toMatchObject({ ad_consent: true, night_consent: false });
});

test('제안 혜택이 화면에 보이면 view_promotion, 클릭하면 부록으로', async ({ page }) => {
  await page.getByTestId('consent-reject').click();
  await page.getByTestId('offer-card').scrollIntoViewIfNeeded();
  await expect.poll(() => events(page)).toContain('view_promotion');
  await page.getByTestId('select-promo').click();
  await expect(page).toHaveURL(/appendix\/#offer/);
  await expect(page.locator('#offer h2')).toBeVisible();
});

test('개인정보 입력란이 없다(이름·전화·이메일)', async ({ page }) => {
  await expect(page.locator('input[type=email], input[type=tel], input[name*=name i], input[name*=phone i]')).toHaveCount(0);
});

test('터치 대상 최소 44px', async ({ page }) => {
  const small = await page.evaluate(() => Array.from(document.querySelectorAll('.btn, summary'))
    .filter((el) => el.offsetParent !== null)
    .map((el) => ({ t: el.textContent.trim().slice(0, 20), h: el.getBoundingClientRect().height }))
    .filter((x) => x.h < 44));
  expect(small).toEqual([]);
});

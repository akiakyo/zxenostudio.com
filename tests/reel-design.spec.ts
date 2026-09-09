import {test,expect} from '@playwright/test';
test('textured poster and organic screening reveal at desktop and mobile sizes',async({page})=>{
 await page.addInitScript(()=>sessionStorage.setItem('zxeno-intro-3d','seen'));await page.goto('/');
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:900});
  for(const progress of [0,.35,.8]){
   await page.locator('.reel-transition').evaluate((el,p)=>{const rect=el.getBoundingClientRect();scrollTo({top:scrollY+rect.top+(rect.height-innerHeight)*p,behavior:'instant'})},progress);
   await page.waitForTimeout(150);await page.screenshot({path:`test-results/poster-${width}-${progress}.png`});
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  }
 }
 await expect(page.locator('.reel-window')).toHaveCSS('clip-path','url("#reel-portal")');
 await page.locator('.play-reel').click();await expect(page.locator('#film-title')).toHaveText('RED LINE');await page.keyboard.press('Escape');
});

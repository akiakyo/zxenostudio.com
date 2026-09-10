import {test,expect} from '@playwright/test';
test('hero objects and email modal',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
 await expect(page.getByRole('link',{name:'Explore selected work'})).toHaveCount(0);
 const scene=page.locator('.hero-showcase-stage .artwork-tilt');await expect(scene).toBeVisible();
 await page.getByRole('button',{name:'Merchandise',exact:true}).click();await expect(page.getByRole('button',{name:'Merchandise',exact:true})).toHaveAttribute('aria-pressed','true');
 await scene.scrollIntoViewIfNeeded();await page.waitForTimeout(600);await page.locator('.hero-products').screenshot({path:'test-results/hero-products.png'});
 await page.locator('.footer-contact a[href^="mailto:"]').click();await expect(page.getByRole('dialog',{name:"Let's make it happen."})).toBeVisible();
 await page.getByLabel('Your message', {exact:true}).fill('Hello ZXENO');await expect(page.getByRole('button',{name:'Open email app'})).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('.email-dialog')).not.toBeVisible();
 for(const width of [390,1280]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();}
 await page.goto('/book?service=Motion');await page.getByRole('link',{name:'Request a call by email'}).click();await expect(page.getByLabel('Subject',{exact:true})).toHaveValue('Book a call — Motion');expect(errors).toEqual([]);
});

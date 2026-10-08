import {test,expect} from '@playwright/test';
test('hero objects and email modal',async({page})=>{
 /* the 3D hero alone takes most of the default 30 seconds on a cold dev server */
 test.setTimeout(60000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
 await expect(page.getByRole('link',{name:'Explore selected work'})).toHaveCount(0);
 const scene=page.locator('.hero-showcase-stage .artwork-tilt');await expect(scene).toBeVisible();
 await page.getByRole('button',{name:'Merchandise',exact:true}).click();await expect(page.getByRole('button',{name:'Merchandise',exact:true})).toHaveAttribute('aria-pressed','true');
 await scene.scrollIntoViewIfNeeded();await page.waitForTimeout(600);await page.locator('.hero-products').screenshot({path:'test-results/hero-products.png'});
 await page.locator('.footer-contact a[href^="mailto:"]').click();await expect(page.getByRole('dialog',{name:"Let's make it happen."})).toBeVisible();
 await page.getByLabel('Your message', {exact:true}).fill('Hello ZXENO');await expect(page.getByRole('button',{name:'Send message'})).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('.email-dialog')).not.toBeVisible();
 for(const width of [390,1280]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();}
 /* the booking form files an inquiry instead of opening a mail app */
 const posted:any[]=[];await page.route('**/api/inquiry',async route=>{posted.push(route.request().postDataJSON());await route.fulfill({status:201,json:{ok:true}});});
 /* a cold dev server can reload the page once while it bundles dependencies,
    which would clear anything typed before it settles */
 await page.goto('/book?service=Motion',{waitUntil:'networkidle'});const booking=page.locator('.booking-panel');await expect(booking.getByLabel(/^Service/)).toHaveValue('Motion');
 await booking.getByLabel('Your name').fill('Ana Cruz');await booking.getByLabel('Email',{exact:true}).fill('ana@example.com');await booking.getByLabel('Project overview').fill('A launch film.');
 await booking.getByRole('button',{name:'Send inquiry'}).click();await expect(booking.getByText('Your inquiry is with the team.')).toBeVisible();
 expect(posted[0]).toMatchObject({name:'Ana Cruz',email:'ana@example.com',service:'Motion',message:'A launch film.',website:''});
 await page.screenshot({path:'test-results/booking-sent.png'});expect(errors).toEqual([]);
});

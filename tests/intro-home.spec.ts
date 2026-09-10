import {test,expect} from '@playwright/test';
test('homepage intro works without hero video and can replay',async({page})=>{
 await page.goto('/');await expect(page.locator('.intro')).toBeVisible();await page.getByRole('button',{name:'Skip intro'}).click();await expect(page.locator('.intro')).toHaveCount(0);await expect(page.locator('#main')).not.toHaveAttribute('inert','');
 await page.goto('/');await expect(page.locator('.intro')).toHaveCount(0);
 await page.goto('/?intro=1');await expect(page.locator('.intro')).toBeVisible();await page.getByRole('button',{name:'Skip intro'}).click();
 await page.goto('/services');await expect(page.locator('.intro')).toHaveCount(0);
});

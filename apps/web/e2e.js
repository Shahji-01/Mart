import puppeteer from 'puppeteer';

(async () => {
  console.log('Starting E2E integration test...');
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // 1. Visit homepage
    console.log('Navigating to homepage...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    
    // Verify frontend is up
    const title = await page.title();
    console.log('Frontend Title:', title);
    
    // 2. We can verify backend is linked by making an API call through the browser
    console.log('Testing backend API via frontend proxy...');
    const healthResult = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/healthz');
        if (!res.ok) throw new Error('API returned ' + res.status);
        return await res.json();
      } catch (err) {
        return { error: err.message };
      }
    });
    console.log('Health check result:', healthResult);
    
    if (healthResult.error) {
      throw new Error(`Frontend to Backend linking failed: ${healthResult.error}`);
    }
    
    // 3. Test actual user interaction (Fetch categories from frontend)
    console.log('Testing Categories fetch via frontend proxy...');
    const categoriesResult = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/categories');
        if (!res.ok) throw new Error('API returned ' + res.status);
        return await res.json();
      } catch (err) {
        return { error: err.message };
      }
    });
    
    if (categoriesResult.error) {
      throw new Error(`Categories fetch failed: ${categoriesResult.error}`);
    }
    console.log(`Successfully fetched ${categoriesResult.length} categories from the backend!`);

    console.log('\n✅ E2E Integration Test Passed! Frontend is successfully linked to the Backend.');
  } catch (err) {
    console.error('\n❌ E2E Integration Test Failed:', err.message);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
})();

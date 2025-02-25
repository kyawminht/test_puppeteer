const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files (HTML, CSS, JS)
app.use(express.static('public'));

// Endpoint to handle form submission
app.post('/send-messages', async (req, res) => {
  const { cookies, friendIds, message } = req.body;

  try {
    // Convert friendIds to an array
    const allFriends = friendIds.split(',').map(id => id.trim());

    // Process the account
    await processAccount({ cookies, maxFriends: allFriends.length }, allFriends, message);

    res.status(200).send('Messages sent successfully!');
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('An error occurred while sending messages.');
  }
});

// Puppeteer logic
async function processAccount(account, friendChunk, message) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log(`Starting account processing for ${friendChunk.length} friends`);
    await page.setCookie(...account.cookies);
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    // Initial login check
    await page.goto('https://www.facebook.com', { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForSelector('[aria-label="Your profile"]', { timeout: 45000 });

    await new Promise(resolve => setTimeout(resolve, randomDelay(19000, 22000)));

    for (const friend of friendChunk) {
      try {
        console.log(`Processing friend: ${friend}`);
        await page.goto(`https://www.facebook.com/messages/t/${friend}`, {
          waitUntil: 'networkidle2',
          timeout: 60000
        });

        // Message sending logic
        await handleContinueButton(page);
        await sendMessage(page, message);

        // Random delay between messages (11-16 minutes)
        await new Promise(resolve => setTimeout(resolve, randomDelay(690000, 990000)));
      } catch (error) {
        console.error(`Error with friend ${friend}:`, error.message);
        await page.goto('about:blank');
      }
    }
  } finally {
    await browser.close();
    console.log(`Account finished processing ${friendChunk.length} friends`);
  }
}

// Utility functions
const randomDelay = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

async function handleContinueButton(page) {
  try {
    await page.waitForSelector('div[aria-label="Continue"][role="button"]', { timeout: 30000 });
    await page.click('div[aria-label="Continue"][role="button"]');
    console.log('Clicked continue button');
    await new Promise(resolve => setTimeout(resolve, randomDelay(8000, 15000)));
  } catch (error) {
    // Continue button not found
  }
}

async function sendMessage(page, message) {
  await page.waitForSelector('div[aria-label="Message"]', { timeout: 25000 });
  await page.focus('div[aria-label="Message"]');

  // Type message with human-like delays
  for (const char of message) {
    await page.keyboard.type(char, { delay: randomDelay(50, 150) });
  }

  // Random send delay (1-5 seconds)
  await new Promise(resolve => setTimeout(resolve, randomDelay(5000, 15000)));
  await page.keyboard.press('Enter');
  console.log('Message sent successfully');
}

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
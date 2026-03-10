// save as download-logos.js
const https = require('https');
const fs = require('fs');

const logos = {
  'aws.svg': 'https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg',
  'gcp.svg': 'https://upload.wikimedia.org/wikipedia/commons/5/51/Google_Cloud_logo.svg',
  'cloudflare.png': 'https://upload.wikimedia.org/wikipedia/commons/9/94/Cloudflare_Logo.png',
  'salesforce.svg': 'https://upload.wikimedia.org/wikipedia/commons/f/f9/Salesforce.com_logo.svg',
  'microsoft.svg': 'https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg',
  'gmail.svg': 'https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg',
  'oracle.svg': 'https://upload.wikimedia.org/wikipedia/commons/5/50/Oracle_logo.svg',
};

if (!fs.existsSync('logos')) fs.mkdirSync('logos');

Object.entries(logos).forEach(([name, url]) => {
  https.get(url, res => {
    res.pipe(fs.createWriteStream(`logos/${name}`))
      .on('finish', () => console.log(`✓ ${name}`));
  });
});
#!/bin/bash
mkdir -p logos

# Wikimedia Commons direct image URLs
curl -o logos/aws.svg "https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg"
curl -o logos/gcp.svg "https://upload.wikimedia.org/wikipedia/commons/5/51/Google_Cloud_logo.svg"
curl -o logos/cloudflare.svg "https://upload.wikimedia.org/wikipedia/commons/9/94/Cloudflare_Logo.png"
curl -o logos/salesforce.svg "https://upload.wikimedia.org/wikipedia/commons/f/f9/Salesforce.com_logo.svg"
curl -o logos/microsoft.svg "https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg"
curl -o logos/gmail.svg "https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg"
curl -o logos/oracle.svg "https://upload.wikimedia.org/wikipedia/commons/5/50/Oracle_logo.svg"

echo "✓ Logos downloaded to ./logos/"
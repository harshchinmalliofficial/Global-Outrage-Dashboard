// Import all logos (SVG and PNG)
import awsLogo from './logos/aws.svg';
import gcpLogo from './logos/gcplogo.png';
import cloudflareLogo from './logos/cloudflarelogo.png';
import salesforceLogo from './logos/salesforce.svg';
import microsoftLogo from './logos/microsoft.svg';
import gmailLogo from './logos/gmail.svg';
import oracleLogo from './logos/oracle.svg';

// Import PNGs - these are also image paths, not components
import servicenowLogo from './logos/servicenow.svg';
import outlookLogo from './logos/outlook.png';
import teamsLogo from './logos/teamslogo.png';
import zscalerLogo from './logos/zscaler.svg';

// Fallback icon from react-icons
import { FaCloud } from 'react-icons/fa';

export const companyLogos = {
  AWS: {
    src: awsLogo,
    type: 'svg',
  },
  GCP: {
    src: gcpLogo,
    type: 'png',
  },
  Cloudflare: {
    src: cloudflareLogo,
    type: 'png',
  },
  Salesforce: {
    src: salesforceLogo,
    type: 'svg',
  },
  'Microsoft 365': {
    src: microsoftLogo,
    type: 'svg',
  },
  Gmail: {
    src: gmailLogo,
    type: 'svg',
  },
  ServiceNow: {
    src: servicenowLogo,
    type: 'svg',
  },
  Zscaler: {
    src: zscalerLogo,
    type: 'svg',
  },
  'Oracle Cloud': {
    src: oracleLogo,
    type: 'svg',
  },
  AutomationEdge: {
    src: null,
    fallback: FaCloud,
  },
  Outlook: {
    src: outlookLogo,
    type: 'png',
  },
  'Microsoft Teams': {
    src: teamsLogo,
    type: 'png',
  },
};

export const getCompanyLogo = (serviceName) => {
  return (
    companyLogos[serviceName] || {
      src: null,
      fallback: FaCloud,
    }
  );
};
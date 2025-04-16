import fs from 'fs/promises';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CA_CERT_URL = 'https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem';
const CA_CERT_PATH = path.join(__dirname, '..', 'certs', 'rds-ca-bundle.pem');

async function downloadCertificate() {
  try {
    // Create certs directory if it doesn't exist
    await fs.mkdir(path.join(__dirname, '..', 'certs'), { recursive: true });

    console.log('Downloading RDS CA certificate...');
    
    return new Promise((resolve, reject) => {
      https.get(CA_CERT_URL, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download certificate: ${response.statusCode}`));
          return;
        }

        let cert = '';
        response.on('data', (chunk) => cert += chunk);
        response.on('end', async () => {
          await fs.writeFile(CA_CERT_PATH, cert);
          console.log('Certificate downloaded and saved successfully.');
          console.log('Certificate path:', CA_CERT_PATH);
          resolve(CA_CERT_PATH);
        });
      }).on('error', reject);
    });
  } catch (error: any) {
    console.error('Error downloading certificate:', error.message);
    throw error;
  }
}

// Run if this script is executed directly
if (import.meta.url.endsWith(process.argv[1])) {
  downloadCertificate().catch(console.error);
}

export { downloadCertificate, CA_CERT_PATH };

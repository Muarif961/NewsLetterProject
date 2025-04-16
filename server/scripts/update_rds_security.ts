import { EC2Client, UpdateSecurityGroupRuleDescriptionsIngressCommand } from "@aws-sdk/client-ec2";
import dotenv from 'dotenv';

dotenv.config();

const ec2Client = new EC2Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

async function updateSecurityGroup() {
  try {
    console.log('Updating security group rules...');
    const command = new UpdateSecurityGroupRuleDescriptionsIngressCommand({
      GroupId: 'newsletter-db-security-group',
      IpPermissions: [
        {
          IpProtocol: 'tcp',
          FromPort: 5432,
          ToPort: 5432,
          IpRanges: [{ 
            CidrIp: '0.0.0.0/0',
            Description: 'Allow PostgreSQL access from all IPs (Warning: Consider restricting in production)'
          }]
        }
      ]
    });

    await ec2Client.send(command);
    console.log('Security group updated successfully');
  } catch (error: any) {
    console.error('Error updating security group:', error.message);
    throw error;
  }
}

updateSecurityGroup().catch(console.error);

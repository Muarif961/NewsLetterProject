import { RDSClient, CreateDBInstanceCommand, DescribeDBInstancesCommand } from "@aws-sdk/client-rds";
import { EC2Client, CreateSecurityGroupCommand, AuthorizeSecurityGroupIngressCommand } from "@aws-sdk/client-ec2";
import dotenv from 'dotenv';

dotenv.config();

// List of valid AWS regions that support RDS PostgreSQL
const VALID_AWS_REGIONS = [
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
  'eu-west-1', 'eu-west-2', 'eu-central-1',
  'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1'
];

// Validate required environment variables
const requiredEnvVars = ['AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Validate AWS region format
const region = process.env.AWS_REGION;
if (!VALID_AWS_REGIONS.includes(region)) {
  throw new Error(`Invalid AWS region: ${region}. Must be one of: ${VALID_AWS_REGIONS.join(', ')}`);
}

console.log('Using AWS Region:', process.env.AWS_REGION);

const rdsClient = new RDSClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

const ec2Client = new EC2Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

async function createSecurityGroup() {
  try {
    console.log('Creating security group...');
    const createSecurityGroupCommand = new CreateSecurityGroupCommand({
      GroupName: 'newsletter-db-security-group',
      Description: 'Security group for Newsletter RDS instance'
    });

    const securityGroup = await ec2Client.send(createSecurityGroupCommand);
    const groupId = securityGroup.GroupId;

    console.log('Configuring security group ingress rules...');
    const authorizeIngressCommand = new AuthorizeSecurityGroupIngressCommand({
      GroupId: groupId,
      IpPermissions: [
        {
          IpProtocol: 'tcp',
          FromPort: 5432,
          ToPort: 5432,
          IpRanges: [{ CidrIp: '0.0.0.0/0' }] // Warning: This allows access from anywhere, consider restricting in production
        }
      ]
    });

    await ec2Client.send(authorizeIngressCommand);
    console.log('Security group created and configured:', groupId);
    return groupId;
  } catch (error: any) {
    if (error.name === 'InvalidGroup.Duplicate') {
      console.log('Security group already exists, proceeding...');
      return null;
    }
    throw error;
  }
}

async function createRDSInstance() {
  try {
    console.log('Setting up security...');
    const securityGroupId = await createSecurityGroup();

    const dbPassword = 'temp_password_' + Math.random().toString(36).slice(-8) + 
                      Math.random().toString(36).slice(-8).toUpperCase() + 
                      Math.random().toString(36).slice(-8) + '!';

    const params = {
      DBName: 'newsletter_db',
      DBInstanceIdentifier: 'newsletter-db-instance',
      DBInstanceClass: 'db.t3.micro',
      Engine: 'postgres',
      EngineVersion: '16.6',
      MasterUsername: 'newsletter_admin',
      MasterUserPassword: dbPassword,
      AllocatedStorage: 20,
      VpcSecurityGroupIds: securityGroupId ? [securityGroupId] : undefined,
      PubliclyAccessible: true,
      BackupRetentionPeriod: 7,
      MultiAZ: false,
      AutoMinorVersionUpgrade: true,
      StorageEncrypted: true,
      Port: 5432,
      PreferredBackupWindow: '03:00-04:00',
      PreferredMaintenanceWindow: 'mon:04:00-mon:05:00'
    };

    console.log('Creating RDS instance with configuration:', JSON.stringify({
      ...params,
      MasterUserPassword: '[REDACTED]'
    }, null, 2));

    const command = new CreateDBInstanceCommand(params);
    const response = await rdsClient.send(command);
    console.log('RDS Instance creation initiated:', response.DBInstance?.DBInstanceIdentifier);

    // Save credentials securely
    console.log('\nDATABASE CREDENTIALS (SAVE THESE SECURELY):');
    console.log('----------------------------------------');
    console.log('Username:', params.MasterUsername);
    console.log('Password:', dbPassword);
    console.log('Database:', params.DBName);
    console.log('----------------------------------------');

    // Wait for the instance to be available
    await waitForInstance(params.DBInstanceIdentifier);

  } catch (error: any) {
    console.error('Error creating RDS instance:', {
      message: error.message,
      code: error.code,
      region: process.env.AWS_REGION,
      stack: error.stack
    });
    throw error;
  }
}

async function waitForInstance(dbInstanceIdentifier: string) {
  console.log('Waiting for instance to be available...');

  while (true) {
    try {
      const command = new DescribeDBInstancesCommand({
        DBInstanceIdentifier: dbInstanceIdentifier
      });

      const response = await rdsClient.send(command);
      const instance = response.DBInstances?.[0];

      if (instance?.DBInstanceStatus === 'available') {
        console.log('\nRDS INSTANCE DETAILS:');
        console.log('----------------------------------------');
        console.log('Status:', instance.DBInstanceStatus);
        console.log('Endpoint:', instance.Endpoint?.Address);
        console.log('Port:', instance.Endpoint?.Port);
        console.log('DB Name:', instance.DBName);
        console.log('----------------------------------------');

        // Construct and display connection string (without password)
        const connectionString = `postgresql://${instance.MasterUsername}:[PASSWORD]@${instance.Endpoint?.Address}:${instance.Endpoint?.Port}/${instance.DBName}`;
        console.log('\nConnection string template:');
        console.log(connectionString);
        break;
      }

      console.log('Current status:', instance?.DBInstanceStatus);
      await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds before checking again
    } catch (error: any) {
      console.error('Error checking instance status:', error.message);
      throw error;
    }
  }
}

createRDSInstance().catch(console.error);
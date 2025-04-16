import { RDSClient, DescribeDBInstancesCommand } from "@aws-sdk/client-rds";
import dotenv from 'dotenv';

dotenv.config();

const rdsClient = new RDSClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

async function checkInstanceStatus() {
  try {
    const command = new DescribeDBInstancesCommand({
      DBInstanceIdentifier: 'newsletter-db-instance'
    });

    const response = await rdsClient.send(command);
    const instance = response.DBInstances?.[0];

    console.log('\nRDS INSTANCE STATUS:');
    console.log('----------------------------------------');
    console.log('Status:', instance?.DBInstanceStatus);
    if (instance?.Endpoint) {
      console.log('Endpoint:', instance.Endpoint.Address);
      console.log('Port:', instance.Endpoint.Port);
      console.log('DB Name:', instance.DBName);
      
      // Construct connection string template (without password)
      const connectionString = `postgresql://${instance.MasterUsername}:[PASSWORD]@${instance.Endpoint.Address}:${instance.Endpoint.Port}/${instance.DBName}`;
      console.log('\nConnection string template:');
      console.log(connectionString);
    }
    console.log('----------------------------------------');

  } catch (error: any) {
    console.error('Error checking RDS instance status:', error.message);
    throw error;
  }
}

checkInstanceStatus().catch(console.error);

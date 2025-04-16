import React from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from 'lucide-react';

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const privacyContent = [
  {
    title: "1. Introduction",
    content: "Welcome to Newsletterly, a product of Futurzy LTD. We are committed to safeguarding your personal data and ensuring your privacy is protected in accordance with the General Data Protection Regulation (GDPR) and other applicable data protection laws."
  },
  {
    title: "2. Information We Collect",
    content: `We collect the following categories of personal data:
    • Contact Information (email address, name)
    • Account Data (login credentials, user preferences, profile images)
    • Newsletter Data (templates, content, analytics)
    • Subscriber Data (email addresses, subscription status)
    • Payment Information (subscription details, transaction records)
    • Usage Data (IP address, device information, activity logs)
    • Cookies and Tracking Data`
  },
  {
    title: "3. How We Use Your Data",
    content: `We process your personal data for:
    • Service Provision (newsletter creation, management, delivery)
    • Maintenance and Improvement
    • Communications
    • Analytics and Personalization
    • Legal and Compliance purposes`
  },
  {
    title: "4. Legal Basis for Processing",
    content: `We rely on the following legal bases:
    • Consent
    • Contractual Necessity
    • Legitimate Interests
    • Legal Compliance`
  },
  {
    title: "5. Data Sharing",
    content: `We may share your data with:
    • Email Delivery Providers
    • AI Services (OpenAI)
    • News Content Providers
    • Payment Processors (Stripe)
    All sharing is conducted under strict data protection agreements.`
  },
  {
    title: "6. Data Security",
    content: "We implement robust security measures to protect your data, including encryption, access controls, and regular security audits."
  },
  {
    title: "7. Your Rights",
    content: `Under GDPR, you have the right to:
    • Access your data
    • Rectify incorrect data
    • Request data erasure
    • Restrict processing
    • Data portability
    • Object to processing`
  },
  {
    title: "8. Updates to This Policy",
    content: "We may update this policy periodically. Any significant changes will be communicated to you via email or through our platform."
  }
];

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/50 p-8 perspective-1000">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <Button 
            variant="ghost" 
            onClick={() => window.history.back()}
            className="gap-2 hover:translate-x-1 transition-transform"
          >
            <ArrowLeft size={20} />
            Back
          </Button>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-8"
        >
          <motion.div
            variants={fadeIn}
            className="bg-card p-8 rounded-2xl shadow-2xl transform hover:scale-[1.02] transition-transform duration-300"
          >
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Privacy Policy</h1>
            <p className="text-muted-foreground mt-4">Effective Date: 19/01/2025</p>
          </motion.div>

          {privacyContent.map((section) => (
            <motion.div
              key={section.title}
              variants={fadeIn}
              className="bg-card/50 backdrop-blur-sm p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300"
              whileHover={{ scale: 1.01, rotateX: 2 }}
            >
              <h2 className="text-2xl font-semibold mb-4 text-primary">{section.title}</h2>
              <div className="text-muted-foreground whitespace-pre-line">{section.content}</div>
            </motion.div>
          ))}

          <motion.div
            variants={fadeIn}
            className="bg-primary/5 p-6 rounded-xl backdrop-blur-md"
          >
            <h2 className="text-2xl font-semibold mb-4 text-primary">Contact Us</h2>
            <p className="text-muted-foreground">
              For any privacy-related inquiries, please contact us at:<br />
              Email: michael@futurzy.com<br />
              Address: Futurzy LTD, 2 Twyford Avenue, London W39QA, UK
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
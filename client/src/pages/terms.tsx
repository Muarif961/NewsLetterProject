import React from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Lock, User, Book, Scale, Bell, FileText } from 'lucide-react';

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

const icons = {
  'Service Description': <Book className="w-6 h-6" />,
  'User Responsibilities': <User className="w-6 h-6" />,
  'Account Terms': <Shield className="w-6 h-6" />,
  'Security': <Lock className="w-6 h-6" />,
  'Intellectual Property': <FileText className="w-6 h-6" />,
  'Legal Compliance': <Scale className="w-6 h-6" />,
  'Notifications': <Bell className="w-6 h-6" />
};

const termsContent = [
  {
    title: "Service Description",
    content: "Newsletterly is an AI-powered newsletter platform that provides content generation, template customization, subscriber management, and analytics features. Our service includes automated content creation, email delivery, and performance tracking capabilities."
  },
  {
    title: "User Responsibilities",
    content: "Users must provide accurate information, maintain account security, comply with applicable laws, and use the service responsibly. This includes respecting intellectual property rights and maintaining appropriate content standards."
  },
  {
    title: "Account Terms",
    content: "Users are responsible for maintaining their account security, keeping credentials confidential, and promptly reporting unauthorized access. Accounts must be registered with accurate information and may not be shared between multiple users."
  },
  {
    title: "Security",
    content: "We implement industry-standard security measures including encryption, secure data storage, and regular security audits. Users must enable two-factor authentication when available and follow security best practices."
  },
  {
    title: "Intellectual Property",
    content: "Users retain rights to their content while granting us necessary licenses to provide the service. Our platform, including its features and functionalities, remains our intellectual property."
  },
  {
    title: "Legal Compliance",
    content: "Users must comply with all applicable laws and regulations, including data protection, privacy, and anti-spam laws. Any illegal use of our service is strictly prohibited."
  },
  {
    title: "Notifications",
    content: "We may send service-related notifications through email or in-app messages. Users are responsible for maintaining accurate contact information to receive these communications."
  }
];

export default function Terms() {
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
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Terms of Service</h1>
            <p className="text-muted-foreground mt-4">Effective Date: 19/01/2025</p>
          </motion.div>

          {termsContent.map((section) => (
            <motion.div
              key={section.title}
              variants={fadeIn}
              className="bg-card/50 backdrop-blur-sm p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300"
              whileHover={{ scale: 1.01, rotateX: 2 }}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  {icons[section.title]}
                </div>
                <h2 className="text-2xl font-semibold text-primary">{section.title}</h2>
              </div>
              <div className="text-muted-foreground whitespace-pre-line">{section.content}</div>
            </motion.div>
          ))}

          <motion.div
            variants={fadeIn}
            className="bg-primary/5 p-6 rounded-xl backdrop-blur-md"
          >
            <h2 className="text-2xl font-semibold mb-4 text-primary">Contact Us</h2>
            <p className="text-muted-foreground">
              For any questions about these terms, please contact us at:<br />
              Email: michael@futurzy.com<br />
              Address: Futurzy LTD, 2 Twyford Avenue, London W39QA, UK
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
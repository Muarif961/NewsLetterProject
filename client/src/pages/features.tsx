import React, { lazy, Suspense, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import { BsRobot, BsSpeedometer, BsGraphUp, BsTypeH1 } from "react-icons/bs";
import { IoMdAnalytics } from "react-icons/io";
import { RiCustomerService2Line } from "react-icons/ri";
import { AiOutlineSchedule } from "react-icons/ai";
import { LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { ErrorBoundary } from "../components/error-boundary";
import bgImage from "../assets/home/test-bg.png";
import heroBg from "../assets/home/hero-bg.png";

// Lazy load components with explicit loading states
const Header = lazy(() => import("../components/landing/Header"));
const Footer = lazy(() => import("../components/landing/Footer"));

// Loading component with subtle animation
const LoadingComponent = ({ height = "h-20" }: { height?: string }) => (
  <div className={`${height} flex items-center justify-center`}>
    <Loader2 className="h-8 w-8 animate-spin text-white/50" />
  </div>
);

const features = [
  {
    icon: <BsRobot className="w-8 h-8" />,
    title: "AI Content Generation",
    description:
      "Generate engaging newsletter content with a single prompt using advanced AI technology.",
  },
  {
    icon: <BsSpeedometer className="w-8 h-8" />,
    title: "Lightning Fast Creation",
    description:
      "Create professional newsletters in seconds, not hours, with our streamlined interface.",
  },
  {
    icon: <LayoutTemplate className="w-8 h-8" />,
    title: "Ready-made Templates",
    description:
      "Jump-start your newsletters with our professionally designed templates for instant content creation.",
  },
  {
    icon: <RiCustomerService2Line className="w-8 h-8" />,
    title: "Subscriber Management",
    description:
      "Easily manage your subscriber list with powerful segmentation tools.",
  },
  {
    icon: <BsTypeH1 className="w-8 h-8" />,
    title: "Rich Text Editor",
    description:
      "Create beautiful content with our intuitive drag-and-drop rich text editor.",
  },
  {
    icon: <BsGraphUp className="w-8 h-8" />,
    title: "Performance Insights",
    description:
      "Get actionable insights to improve your newsletter performance over time.",
  },
];

// Section component for animated visibility
const Section = ({ children, className = "" }) => {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-10% 0px" });

  return (
    <div ref={ref} className={className}>
      <div
        style={{
          transform: isInView ? "none" : "translateY(50px)",
          opacity: isInView ? 1 : 0,
          transition: "all 0.9s cubic-bezier(0.17, 0.55, 0.55, 1) 0.2s",
        }}
      >
        {children}
      </div>
    </div>
  );
};

// Custom lightning icon component
const LightningIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#ffffff"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
  </svg>
);

export default function Features() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-purple-950 via-purple-900 to-purple-950 text-white">
      <div className="relative overflow-hidden w-full">
        <div
          className="absolute inset-0 bg-repeat opacity-10"
          style={{
            backgroundImage: `url('/grid-pattern.svg')`,
            backgroundSize: "30px 30px",
            transform: "translate3d(0, 0, 0)", // Force GPU acceleration
          }}
        />
        <div className="relative w-full pt-[80px]">
          <ErrorBoundary>
            <Suspense fallback={<LoadingComponent />}>
              <Header />
            </Suspense>
          </ErrorBoundary>

          {/* Hero Section */}
          <div
            className="py-32 pb-20 px-4 relative !bg-no-repeat !bg-cover !bg-center"
            style={{
              backgroundImage: `url(${heroBg})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="max-w-7xl mx-auto relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="text-center mb-16"
              >
                <h1 className="text-4xl md:text-5xl lg:text-7xl font-medium mb-6 text-white">
                  Build Newsletters in{" "}
                  <span className="text-[#25DAC5]">Seconds</span>
                </h1>
                <div className="max-w-3xl mx-auto mb-8 rounded-xl overflow-hidden shadow-2xl border-2 border-white/10 aspect-video relative">
                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40 z-10" />
                  <video 
                    className="w-full h-full object-cover absolute inset-0"
                    autoPlay
                    muted
                    loop
                    playsInline
                  >
                    <source src="/uploads/Newsltterly-Video-Website.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
                <p className="text-lg md:text-xl mb-10 text-gray-200 max-w-3xl mx-auto leading-relaxed">
                  Transform your newsletter creation process with our AI-powered
                  platform. Simply describe your content needs, and watch as our
                  advanced AI generates engaging, personalized newsletters
                  instantly.
                </p>
                <div className="flex justify-center w-full mt-6">
                  <Button
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-6 text-sm rounded-xl shadow-lg flex items-center justify-center"
                    onClick={() => (window.location.href = "/signup")}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="mr-2"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M13 10V3L4 14H11V21L20 10H13Z" />
                    </svg>
                    Start Free Trial
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Features Grid */}
          <div
            className="py-24 px-4 relative dark:bg-black bg-white dark:bg-opacity-95 bg-opacity-95"
            style={{
              boxShadow: "inset 0 0 100px rgba(0, 0, 0, 0.2)",
            }}
          >
            <div className="max-w-7xl mx-auto relative z-10">
              <Section>
                <h2 className="text-4xl font-semibold text-center dark:text-white text-gray-900 mb-16">
                  Powerful Features for Modern Newsletter Creation
                </h2>
              </Section>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
                {features.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    viewport={{ once: true, margin: "-50px" }}
                    className="dark:bg-white/10 bg-gray-50 backdrop-blur-lg rounded-xl p-8 border transition-all hover:shadow-xl hover:-translate-y-1 group hover:border-gray-400"
                    style={{
                      boxShadow: "none",
                      transition:
                        "box-shadow 0.3s ease-in-out, transform 0.2s ease, border-color 0.3s ease",
                      borderColor: "rgba(128, 128, 128, 0.2)",
                      borderWidth: "1px",
                    }}
                    whileHover={{
                      boxShadow: "0 0 20px rgba(128, 128, 128, 0.3)",
                      borderColor: "rgba(128, 128, 128, 0.5)",
                    }}
                  >
                    <div className="text-[#6054d6] mb-5">{feature.icon}</div>
                    <h3 className="text-xl font-semibold dark:text-white text-gray-900 mb-3">
                      {feature.title}
                    </h3>
                    <p className="dark:text-gray-300 text-gray-600">
                      {feature.description}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Benefits Section */}
          <div
            className="py-24 px-4 relative !bg-no-repeat !bg-cover !bg-center"
            style={{
              backgroundImage: `url(${bgImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="max-w-7xl mx-auto relative z-10">
              <Section>
                <div className="text-center mb-16">
                  <h2 className="text-4xl font-semibold mb-8 text-white">
                    Why Choose Newsletterly?
                  </h2>
                  <p className="text-xl text-gray-200 max-w-3xl mx-auto">
                    The all-in-one AI-powered platform for effortless newsletter
                    creation, distribution, and audience growth.
                  </p>
                </div>
              </Section>

              <div className="grid md:grid-cols-2 gap-8 mt-8">
                <Section className="bg-black/30 backdrop-blur-sm p-8 rounded-xl border border-white/10 benefit-card">
                  <h3 className="text-2xl font-semibold mb-4 text-[#25DAC5]">
                    Streamlined Creation & Automation
                  </h3>
                  <p className="text-gray-300 mb-4">
                    From idea to delivery in minutes—Newsletterly handles the
                    heavy lifting so you can focus on impact.
                  </p>
                  <ul className="list-disc pl-5 text-gray-200 space-y-2">
                    <li>
                      AI-Generated Newsletters: Create full newsletters from a
                      simple prompt.
                    </li>
                    <li>
                      Smart Formatting & Templates: One-click styling for
                      professional designs.
                    </li>
                    <li>
                      Automated Content Curation: Get relevant industry news and
                      insights in seconds.
                    </li>
                  </ul>
                </Section>

                <Section className="bg-black/30 backdrop-blur-sm p-8 rounded-xl border border-white/10 benefit-card">
                  <h3 className="text-2xl font-semibold mb-4 text-[#25DAC5]">
                    Audience Growth & Management
                  </h3>
                  <p className="text-gray-300 mb-4">
                    More than just newsletters—build, engage, and manage your
                    subscriber list with ease.
                  </p>
                  <ul className="list-disc pl-5 text-gray-200 space-y-2">
                    <li>
                      Subscriber Collection & Segmentation: Grow your list and
                      personalize outreach.
                    </li>
                    <li>
                      Integrated Email Sending: Reach your audience directly
                      from Newsletterly.
                    </li>
                    <li>
                      Performance Insights: Track open rates, engagement, and
                      optimize content.
                    </li>
                  </ul>
                </Section>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div
            className="py-24 px-4 relative !bg-no-repeat !bg-cover !bg-center"
            style={{
              backgroundImage: `url(${heroBg})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="max-w-5xl mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
                className="bg-white/5 backdrop-blur-md rounded-2xl p-10 border border-white/10"
              >
                <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">
                  Ready to Transform Your Newsletter Experience?
                </h2>
                <p className="text-xl mb-10 text-gray-200 max-w-3xl mx-auto">
                  Join thousands of content creators who are saving time and
                  engaging their audience.
                </p>
                <div className="flex justify-center w-full mt-6">
                  <Button
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-6 text-sm rounded-xl shadow-lg flex items-center justify-center"
                    onClick={() => (window.location.href = "/signup")}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="mr-2"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M13 10V3L4 14H11V21L20 10H13Z" />
                    </svg>
                    Start Free Trial
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>

          <ErrorBoundary>
            <Suspense fallback={<LoadingComponent />}>
              <Footer />
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}

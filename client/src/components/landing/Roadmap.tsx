
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { useTheme } from "../../components/theme-provider";
import BackgroundEffects from "./BackgroundEffects";
import bg from "../../assets/home/hero-bg.png";

const roadmapItems = [
  {
    title: "Smart Content",
    description: [
      "🔄 Seamless Multi-Source Content Aggregation",
      "🎯 Hyper-Personalized AI Content Curation",
      "💡 Intelligent Content Discovery Engine"
    ],
    timeline: "Q1 2025",
    icon: "🚀"
  },
  {
    title: "Engagement Suite",
    description: [
      "⚡ Dynamic Interactive Newsletter Experience",
      "🎯 Advanced Subscriber Segmentation & Targeting",
      "📊 Real-time A/B Testing Analytics"
    ],
    timeline: "Q2 2025",
    icon: "✨"
  },
  {
    title: "Creator Tools",
    description: [
      "🎨 Next-Gen Template Builder & Editor",
      "🔮 Smart Rich Media Integration Hub",
      "🤖 AI-Powered Design Assistant"
    ],
    timeline: "Q3 2025",
    icon: "💫"
  },
  {
    title: "Growth Tools",
    description: [
      "📈 Advanced Audience Intelligence Platform",
      "💰 Smart Revenue Optimization Engine",
      "🎯 AI-Driven Growth Acceleration Suite"
    ],
    timeline: "Q4 2025",
    icon: "⚡"
  }
];

const FloatingElement = ({ delay = 0, x = 0, y = 0, size = "4" }) => (
  <motion.div
    className={`absolute w-${size} h-${size} rounded-full bg-gradient-to-r from-[#25DAC5] to-purple-500`}
    animate={{
      y: [y, y - 20, y],
      x: [x, x + 10, x],
      scale: [1, 1.2, 1],
      opacity: [0.3, 0.6, 0.3],
    }}
    transition={{
      duration: 3,
      repeat: Infinity,
      delay,
      ease: "easeInOut"
    }}
    style={{ willChange: 'transform' }}
  />
);

const GlowingOrb = ({ x, y, delay = 0 }) => (
  <motion.div
    className="absolute w-32 h-32 rounded-full"
    style={{
      background: 'radial-gradient(circle, rgba(37,218,197,0.1) 0%, rgba(168,85,247,0.05) 50%, rgba(0,0,0,0) 70%)',
      x,
      y,
      willChange: 'transform'
    }}
    animate={{
      scale: [1, 1.2, 1],
      opacity: [0.3, 0.5, 0.3],
    }}
    transition={{
      duration: 4,
      repeat: Infinity,
      delay,
      ease: "easeInOut"
    }}
  />
);

const Roadmap = () => {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="py-32 relative !bg-no-repeat !bg-cover !bg-center overflow-hidden"
      style={{ background: `url(${bg})` }}
    >
      <BackgroundEffects />
      <FloatingElement x={100} y={100} delay={0} size="6" />
      <FloatingElement x={-150} y={200} delay={0.5} size="4" />
      <FloatingElement x={200} y={300} delay={1} size="5" />
      <FloatingElement x={-100} y={400} delay={1.5} size="3" />
      <FloatingElement x={150} y={500} delay={2} size="4" />

      <GlowingOrb x={-100} y={150} delay={0} />
      <GlowingOrb x={200} y={400} delay={1.5} />
      <GlowingOrb x={-150} y={600} delay={2.5} />

      <div className="max-w-[1000px] 2xl:max-w-[1100px] mx-auto px-6 relative z-30">
        <motion.h2
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-white text-4xl lg:text-7xl text-center font-medium mb-20"
        >
          The Future of <span className="text-[#25DAC5]">Newsletterly</span>
        </motion.h2>

        <div className="relative">
          <div className="absolute left-1/2 w-[2px] h-full bg-gradient-to-b from-[#25DAC5] to-[#A855F7] transform -translate-x-1/2" />
          
          <div className="relative space-y-24">
            {roadmapItems.map((item, index) => (
              <div key={item.title} className="flex justify-center items-center">
                <motion.div
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.2 }}
                  className={`flex items-center gap-2 ${
                    index % 2 === 0 ? "flex-row" : "flex-row-reverse"
                  }`}
                >
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className={`w-[340px] bg-white/10 backdrop-blur-lg rounded-xl p-5 border border-white/20 shadow-[0_0_35px_rgba(37,218,197,0.2)]`}
                  >
                    <div className="flex flex-col items-center text-center gap-3">
                      <BackgroundEffects />
                      <span className="text-3xl">{item.icon}</span>
                      <div>
                        <h3 className="text-white text-lg font-semibold mb-2">
                          {item.title}
                        </h3>
                        <ul className="list-none space-y-1">
                          {item.description.map((feature, featureIndex) => (
                            <li key={featureIndex} className="text-gray-300 text-sm">
                              {feature}
                            </li>
                          ))}
                        </ul>
                        <p className="text-[#25DAC5] mt-3 font-medium text-sm">
                          {item.timeline}
                        </p>
                      </div>
                    </div>
                  </motion.div>

                  <div className="w-6 h-6 bg-[#25DAC5] rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(37,218,197,0.5)]">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>

                  <div className="w-[340px]" />
                </motion.div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Roadmap;

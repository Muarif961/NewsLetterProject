import { motion } from "framer-motion";
import { useState, useEffect } from "react";

const ParticleEffect = ({ x, y, size = "4", color = "from-[#25DAC5] to-purple-500" }) => {
  const randomOffset = () => (Math.random() - 0.5) * 100;

  return (
    <motion.div
      className={`absolute w-${size} h-${size} rounded-full bg-gradient-to-r ${color}`}
      animate={{
        y: [y, y + randomOffset(), y + randomOffset(), y],
        x: [x, x + randomOffset(), x + randomOffset(), x],
        scale: [1, 1.2, 0.9, 1],
        opacity: [0.2, 0.5, 0.3, 0.2],
      }}
      transition={{
        duration: Math.random() * 5 + 3,
        repeat: Infinity,
        ease: "easeInOut",
        times: [0, 0.33, 0.66, 1]
      }}
      style={{ willChange: 'transform' }}
    />
  );
};

const MeshGradient = ({ className = "" }) => (
  <motion.div
    className={`absolute inset-0 opacity-30 ${className}`}
    initial={{ backgroundPosition: "0% 0%" }}
    animate={{ backgroundPosition: "100% 100%" }}
    transition={{ duration: 20, repeat: Infinity, repeatType: "reverse" }}
    style={{
      background: "radial-gradient(circle at center, rgba(37,218,197,0.1) 0%, rgba(168,85,247,0.05) 50%, transparent 70%)",
      filter: "blur(100px)",
      willChange: 'transform'
    }}
  />
);

const BackgroundEffects = () => {
  const [dimensions, setDimensions] = useState({ width: 1000, height: 800 });

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  const particles = Array.from({ length: 50 }).map((_, i) => ({
    x: Math.random() * dimensions.width,
    y: Math.random() * dimensions.height,
    size: Math.random() > 0.7 ? "4" : Math.random() > 0.3 ? "3" : "2",
    color: Math.random() > 0.5 ? "from-[#25DAC5] to-purple-500" : "from-purple-500 to-[#25DAC5]"
  }));

  return (
    <>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <MeshGradient />
        {particles.map((particle, i) => (
          <ParticleEffect
            key={i}
            x={particle.x}
            y={particle.y}
            size={particle.size}
            color={particle.color}
          />
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-background/50 to-background pointer-events-none" />
    </>
  );
};

export default BackgroundEffects;
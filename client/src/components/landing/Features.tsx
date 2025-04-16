import { Button } from "@/components/ui/button";
import { motion, useScroll, useTransform } from "framer-motion";
import { IoIosAddCircleOutline } from "react-icons/io";
import { useTheme } from "../../components/theme-provider";
import bg from "../../assets/home/test-bg.png";
import test from "../../assets/home/test.svg";
import worldwide from "../../assets/home/worldwide.svg";
import logo from "../../assets/logo-1.png";

export function Features() {
  const { theme } = useTheme();
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.5], [0, 1]);

  return (
    <>
      {/* Introduction Section */}
      <motion.div 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className={`py-24 md:py-32 ${theme === "light" ? "bg-white" : "bg-[#0A0A0A]"}`}
      >
        <div className="max-w-[1240px] 2xl:max-w-[1280px] mx-auto px-12 md:px-20">
          <div className="flex items-center gap-8 justify-between max-md:flex-wrap">
            <motion.img
              initial={{ x: -20, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
              src={logo}
              alt="Newsletterly"
            />
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className={`text-4xl font-semibold mb-3 ${theme === "light" ? "text-black" : "text-white"}`}>
                Introducing Newsletterly
              </h2>
              <p className={`${theme === "light" ? "text-gray-700" : "text-gray-300"}`}>
                Your Al-driven solution for crafting personalized newsletters effortlessly. With
                automated content curation, Al summarization, and customizable templates, you can
                engage your audience with rich media and optimized subject lines—all from a
                user-friendly interface.
              </p>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Test Section */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="py-16 md:py-28 flex relative !bg-no-repeat !bg-cover !bg-center"
        style={{ background: `url(${bg})` }}
      >
        <div className="w-full max-w-[1240px] 2xl:max-w-[1280px] mx-auto px-6 xl:px-6 relative z-30">
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-white text-4xl lg:text-7xl text-center font-medium"
          >
            Test, Optimize, Engage
          </motion.h1>
          <br />
          <br />
          <motion.img
            initial={{ scale: 0.9, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            src={test}
            alt="Test, Optimize, Engage"
            className="w-full"
          />
        </div>
      </motion.div>

      {/* Worldwide Section */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="pt-16 md:pt-20 flex relative !bg-no-repeat !bg-cover !bg-center"
        style={{ background: `url(${bg})` }}
      >
        <div className="w-full mx-auto pl-4 lg:pl-20 relative z-30">
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="absolute left-0 right-0 -top-4 md:top-6 text-white text-3xl lg:text-7xl text-center font-medium"
          >
            Worldwide News At <br /> Your Fingertips
          </motion.h1>
          <motion.img
            initial={{ scale: 0.9, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            src={worldwide}
            alt="Worldwide News At Your Fingertips"
            className="w-full"
          />
        </div>
      </motion.div>
    </>
  );
}

export default Features;
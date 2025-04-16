import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { IoDocumentTextOutline } from "react-icons/io5";
import BackgroundEffects from "./BackgroundEffects";
import { FiLayout } from "react-icons/fi";
import { BsStars } from "react-icons/bs";
import heroBg from "../../assets/home/hero-bg.png";

const Hero = () => {
  return (
    <div
      className="py-64 md:py-72 h-[900px] flex items-center relative !bg-no-repeat !bg-cover !bg-center"
      style={{ 
        background: `url(${heroBg})`,
        willChange: 'transform',
        backfaceVisibility: 'hidden'
      }}
    >
      <BackgroundEffects />
      <div className="w-full max-w-[1240px] 2xl:max-w-[1280px] mx-auto px-6 xl:px-6 relative z-30 flex flex-col gap-32 mt-32">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-white text-5xl lg:text-7xl text-center font-medium"
        >
          Send <span className="text-[#25DAC5]">AI-Powered</span> Personalized
          Newsletters in A Snap!
        </motion.h1>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="w-full md:max-w-[700px] mx-auto space-y-6 text-black"
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="rounded-[10px] bg-white px-4 py-3 w-full flex items-center gap-4 max-w-[512px] shadow-[0_0_35px_rgba(37,218,197,0.6),0_0_25px_rgba(37,218,197,0.4),0_0_15px_rgba(37,218,197,0.3)] relative"
          >
            <div className="size-8 grid place-items-center rounded-lg bg-[#1e0e623b]">
              <FiLayout className="text-accent" />
            </div>
            <div className="text-sm">
              <p className="font-semibold">Professional templates</p>
              <span>Choose from a variety of fully designed templates</span>
            </div>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="rounded-[10px] bg-white px-4 py-3 w-fit flex items-center gap-4 md:ml-auto shadow-[0_0_35px_rgba(37,218,197,0.6),0_0_25px_rgba(37,218,197,0.4),0_0_15px_rgba(37,218,197,0.3)] relative"
          >
            <div className="size-8 grid place-items-center rounded-lg bg-[#1e0e623b]">
              <IoDocumentTextOutline className="text-accent" />
            </div>
            <div className="text-sm">
              <p className="font-semibold">AI-powered content curation</p>
              <span>Let AI help you find and summarize most recent content</span>
            </div>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="rounded-[10px] bg-white px-4 py-3 w-fit flex items-center gap-4 shadow-[0_0_35px_rgba(37,218,197,0.6),0_0_25px_rgba(37,218,197,0.4),0_0_15px_rgba(37,218,197,0.3)] relative"
          >
            <div className="size-8 grid place-items-center rounded-lg bg-[#1e0e623b]">
              <BsStars className="text-accent" />
            </div>
            <div className="text-sm">
              <p className="font-semibold">Easy customization</p>
              <span>Customize every aspect of your newsletter with our intuitive editor</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Product Hunt Embeds */}
        <div className="flex flex-col items-end gap-6 mt-8 mr-5">
          <a 
            href="https://www.producthunt.com/posts/newsletterly?embed=true&utm_source=badge-featured&utm_medium=badge&utm_souce=badge-newsletterly" 
            target="_blank"
            rel="noopener noreferrer"
          >
            <img 
              src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=799268&theme=light&t=1737482155694" 
              alt="Newsletterly - Automate, Innovate, Communicate: Newsletters Made Easy!" 
              style={{ width: '250px', height: '54px' }} 
              width="250" 
              height="54"
              loading="lazy"
              decoding="async"
            />
          </a>
        </div>
      </div>
    </div>
  );
};

export default Hero;
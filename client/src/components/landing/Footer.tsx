import { FaInstagram, FaLinkedin, FaYoutube } from "react-icons/fa";
import { FaSquareXTwitter } from "react-icons/fa6";
import logoDark from "../../assets/logo-2-dark.png";
import logo from "../../assets/logo-2.png";
import { Link } from "wouter";
import { useTheme } from "../../components/theme-provider";

const Footer = () => {
  const { theme } = useTheme();
  const socialLinks = [
    { icon: <FaInstagram />, href: "https://www.instagram.com/michael_coppola_/" },
    { icon: <FaSquareXTwitter />, href: "#" },
    { icon: <FaLinkedin />, href: "https://www.linkedin.com/company/futurzy/" },
    { icon: <FaYoutube />, href: "https://www.youtube.com/@themichaelcoppola" },
  ];

  return (
    <footer className="w-full bg-white dark:bg-[#0A0A0A] py-8">
      <div className="max-w-[1240px] mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-2">
          <Link
            href="/"
            className="transform hover:scale-105 transition-transform"
          >
            <img
              src={theme === "dark" ? logo : logoDark}
              className="w-[100px] md:w-[120px]"
              alt="logo"
            />
          </Link>

          <div className="flex items-center gap-7 text-sm text-gray-600 dark:text-gray-400">
            <Link
              href="/privacy-policy"
              className="hover:text-accent transition-colors"
            >
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-accent transition-colors">
              Terms of Service
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {socialLinks.map((social, index) => (
              <a
                key={index}
                href={social.href}
                className="grid place-items-center w-10 h-10 bg-accent hover:bg-accent/90 text-white rounded-full transform hover:scale-110 transition-all"
                aria-label={`Social media link ${index + 1}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {social.icon}
              </a>
            ))}
          </div>
        </div>
        <div className="text-center text-sm text-gray-600 dark:text-gray-400 pb-2">
          © {new Date().getFullYear()} Newsletterly. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;

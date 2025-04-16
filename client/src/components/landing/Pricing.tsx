import { TiTick } from "react-icons/ti";
import Button from "./Button";
import { useState } from "react";
import { useTheme } from "../../components/theme-provider";

const data = [
  {
    title: "Free Plan",
    price: 0,
    desc: "",
    features: [
      "500 contacts",
      "Up to 2,000 emails/month",
      "Basic templates with Newsletterly branding",
      "AI curation limited to summaries.",
    ],
  },
  {
    title: "Standard Plan",
    price: 15,
    desc: "$12/month if billed annually",
    features: [
      "5,000 contacts",
      "Up to 10,000 emails/month",
      "Access to all standard templates and AI curation tools.",
      "Email automation and basic analytics.",
    ],
  },
  {
    title: "Pro Plan",
    price: 49,
    desc: "or $39/month if billed annually",
    features: [
      "15,000 contacts",
      "Unlimited emails",
      "White-labeled branding.",
      "Advanced templates and AI tools for content variation.",
    ],
  },
];

const Price = () => {
  const { theme } = useTheme();
  const [activeIndex, setActiveIndex] = useState(1);

  return (
    <div
      className={`py-16 md:py-20 relative ${theme === "dark" ? "bg-black [&_*]:text-white" : ""}`}
    >
      <div className="w-full max-w-[1240px] 2xl:max-w-[1280px] mx-auto px-6 xl:px-6 relative z-30">
        <h1 className="text-3xl lg:text-5xl text-center font-medium mb-4">
          Simple & flexible pricing built for everyone
        </h1>
        <p className="text-gray-600 text-center">
          Start with 14-day free trial. No credit card needed. Cancel at anytime.
        </p>
        <br />
        <br />
        <br />
        <div className="grid lg:grid-cols-3 gap-6 lg:gap-10">
          {data?.map((itm, idx) => (
            <div
              key={idx}
              className={`transition-all [&_*]:transition-all border border-[#EBEAED] rounded-[10px] p-4 flex flex-col justify-between gap-4 ${theme === "dark" ? "bg-accent" : ""} ${activeIndex === idx ? `lg:scale-110 ${theme === "dark" ? "!bg-primary" : ""}` : ""}`}
            >
              <div>
                <div
                  className={`h-[180px] text-center grid place-items-center border ${theme === "dark" ? "border-gray-300" : "border-[#15143966]"} rounded-lg ${activeIndex === idx ? "bg-accent [&_*]:text-white" : ""}`}
                >
                  <div className="space-y-4">
                    <p className="text-accent font-medium">{itm.title}</p>
                    <p className="text-3xl md:text-5xl font-semibold">${itm.price}/month</p>
                  </div>
                </div>
                <div className="space-y-2 mt-4">
                  {itm.features.map(feat => (
                    <div
                      key={feat}
                      className="flex items-center gap-1.5"
                    >
                      <TiTick className="!text-[#25DAC5]" />
                      <span className="text-[#6c6c6c]">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
              <br />
              <br />
              <Button
                onClick={() => setActiveIndex(idx)}
                className={`w-full justify-center ${activeIndex === idx ? (theme === "dark" ? "bg-white !text-primary" : "") : `bg-transparent !text-[#15143997] !border-[#15143997] ${theme === "dark" ? "!border-gray-300 !text-white" : ""}`}`}
              >
                Start Free Trial
              </Button>
            </div>
          ))}
        </div>
        <div className="max-lg:hidden">
          <br />
          <br />
          <div className="flex items-center justify-center gap-3">
            {Array(3)
              .fill()
              .map((_, idx) => (
                <div
                  key={idx}
                  onClick={() => setActiveIndex(idx)}
                  className={`size-3 cursor-pointer rounded-full ${activeIndex === idx ? "bg-[#F13C84] !size-4" : "bg-[#EBEAED]"}`}
                ></div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Price;

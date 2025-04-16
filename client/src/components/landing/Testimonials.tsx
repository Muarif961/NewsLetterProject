import { useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "../../components/theme-provider";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { FaStar } from "react-icons/fa";

const testimonials = [
  {
    name: "Giovanni Tocco",
    role: "UI/UX Designer",
    company: "Tricentis",
    text: "Newsletterly is really intuitive and easy to use, no onboarding time needed and makes me save a lot of time.",
    avatar: "/assets/giovanni-avatar.jpeg",
    rating: 5
  }
];

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex gap-1 mb-4">
    {[...Array(5)].map((_, index) => (
      <FaStar
        key={index}
        className={index < rating ? "text-yellow-400" : "text-gray-300"}
        size={20}
      />
    ))}
  </div>
);

export function Testimonials() {
  const { theme } = useTheme();
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  return (
    <div className={`py-32 md:py-40 px-4 ${theme === "light" ? "bg-white" : "bg-[#0A0A0A]"}`}>
      <div className="max-w-[1240px] 2xl:max-w-[1280px] mx-auto">
        <h2 className={`text-5xl md:text-6xl font-semibold text-center mb-20 ${theme === "light" ? "text-gray-900" : "text-white"}`}>
          What Our Users Say
        </h2>

        <div className="relative">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex">
              {testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className="flex-[0_0_100%] min-w-0 pl-4 md:flex-[0_0_50%] lg:flex-[0_0_33.33%]"
                >
                  <div className={`p-8 rounded-xl h-full ${
                    theme === "light" 
                      ? "bg-gray-50 border border-gray-200" 
                      : "bg-white/5 border border-white/10"
                  }`}>
                    <div className="flex items-start gap-4 mb-4">
                      <img
                        src={testimonial.avatar}
                        alt={testimonial.name}
                        className="w-16 h-16 rounded-full"
                      />
                      <div>
                        <h4 className={`text-xl font-semibold ${theme === "light" ? "text-gray-900" : "text-white"}`}>
                          {testimonial.name}
                        </h4>
                        <p className="text-base text-muted-foreground">
                          {testimonial.role} at {testimonial.company}
                        </p>
                      </div>
                    </div>
                    <StarRating rating={testimonial.rating} />
                    <p className="text-lg text-muted-foreground leading-relaxed">{testimonial.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-center items-center gap-4 mt-12">
          <Button
            variant="ghost"
            size="icon"
            className={`rounded-full size-12 transition-colors ${
              theme === "light"
                ? "bg-gray-100 hover:bg-gray-200 text-gray-900"
                : "bg-white/5 hover:bg-white/10 text-white"
            }`}
            onClick={scrollPrev}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`rounded-full size-12 transition-colors ${
              theme === "light"
                ? "bg-gray-100 hover:bg-gray-200 text-gray-900"
                : "bg-white/5 hover:bg-white/10 text-white"
            }`}
            onClick={scrollNext}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default Testimonials;
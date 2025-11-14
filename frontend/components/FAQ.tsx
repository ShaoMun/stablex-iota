import { useState } from "react";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQProps {
  items?: FAQItem[];
}

export default function FAQ({ items = [] }: FAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="mt-8 mb-12 space-y-3">
      <h3 className="text-lg font-semibold text-white mb-4">Frequently Asked Questions</h3>
      {items.map((item, index) => (
        <div
          key={index}
          className="bg-white/5 rounded-xl border border-white/10 ring-1 ring-white/10 backdrop-blur-xl overflow-hidden"
        >
          <button
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            className="w-full px-5 py-4 text-left flex items-center justify-between transition-colors cursor-pointer group"
          >
            <span className="text-white font-medium text-sm pr-4 group-hover:underline transition-all">{item.question}</span>
            <svg
              className={`w-5 h-5 text-zinc-400 flex-shrink-0 transition-transform duration-300 ease-in-out ${
                openIndex === index ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              openIndex === index ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <div className="px-5 pb-4">
              <p className="text-zinc-400 text-sm leading-relaxed">{item.answer}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}


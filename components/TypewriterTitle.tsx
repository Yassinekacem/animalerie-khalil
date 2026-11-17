"use client";

import { useEffect, useState } from "react";

export default function TypewriterTitle({ text }: { text: string }) {
  const [length, setLength] = useState(0);
  const body = text.endsWith(".") ? text.slice(0, -1) : text;
  const punctuation = text.slice(body.length);
  const cursorClass = "typewriter-cursor ml-0.5 inline-block h-[0.8em] w-[2px] translate-y-[0.06em] bg-[#65D900] motion-reduce:hidden";

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let position = 0;
    const timer = window.setInterval(() => {
      position += 1;
      setLength(position);
      if (position >= text.length) window.clearInterval(timer);
    }, 65);
    return () => window.clearInterval(timer);
  }, [text]);

  return <>
    <span className="sr-only">{text}</span>
    <span aria-hidden="true" className="relative inline-block max-w-full align-top">
      {/* Reserve the complete title's space, including when it wraps on mobile. */}
      <span className="invisible motion-reduce:visible">
        {body}<span className="text-[#65D900]">{punctuation}</span><span className={cursorClass} />
      </span>
      <span className="absolute inset-0 motion-reduce:hidden">
        {body.slice(0, length)}{length > body.length && <span className="text-[#65D900]">{punctuation}</span>}<span className={cursorClass} />
      </span>
    </span>
    <style jsx>{`
      .typewriter-cursor {
        animation: typewriter-blink 900ms step-end infinite;
      }
      @keyframes typewriter-blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0; }
      }
    `}</style>
  </>;
}

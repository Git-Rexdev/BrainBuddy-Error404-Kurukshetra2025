import Image from "next/image";

export default function SiteLogo({ size = 40 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <Image
        src="/brainbuddy.png"
        alt="BrainBuddy"
        width={size}
        height={size}
        priority
      />
      <div className="leading-tight">
        <div className="font-extrabold tracking-wider text-primary">BRAINBUDDY</div>
        <div className="text-xs opacity-80 -mt-1">Enhancing Learning with AI</div>
      </div>
    </div>
  );
}

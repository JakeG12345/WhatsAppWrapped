import { motion } from "framer-motion";

interface GameAvatarProps {
  moving: boolean;
  facing: 1 | -1;
}

export default function GameAvatar({ moving, facing }: GameAvatarProps) {
  return (
    <div className="relative h-11 w-11">
      <div className="absolute left-1/2 top-9 h-2 w-7 -translate-x-1/2 rounded-full bg-black/50 blur-[2px]" />
      <motion.div
        className="relative mx-auto flex h-[34px] w-[34px] items-center justify-center rounded-full border-2 border-[#D9FDD3] bg-[#00A884] shadow-[0_0_44px_rgba(0,168,132,0.55)]"
        style={{ scaleX: facing }}
        animate={moving ? { y: [0, -3, 0] } : { y: 0 }}
        transition={
          moving
            ? { duration: 0.34, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }
            : { duration: 0.15 }
        }
      >
        <div className="flex gap-1.5">
          <span className="h-2 w-1.5 rounded-full bg-[#06130D]" />
          <span className="h-2 w-1.5 rounded-full bg-[#06130D]" />
        </div>
        <span className="absolute -top-1.5 left-1/2 h-1.5 w-5 -translate-x-1/2 rounded-full bg-[#06130D]" />
      </motion.div>
    </div>
  );
}

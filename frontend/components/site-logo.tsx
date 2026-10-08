import Image from "next/image";
import logo from "../public/assets/logo-mark.webp";

/** One small, content-hashed image reused by every page header. */
export function SiteLogo({ size = 48 }: { size?: 48 | 64 }) {
  return <Image src={logo} alt="Ambangeg logo" width={size} height={size} preload className={(size === 64 ? "size-16 mx-auto" : "size-12") + " rounded-full object-contain"} />;
}

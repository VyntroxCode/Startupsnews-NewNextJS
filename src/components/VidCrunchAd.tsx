import Image from "next/image";
import Link from "next/link";

interface VidCrunchAdProps {
  className?: string;
}

export function VidCrunchAd({ className }: VidCrunchAdProps) {
  return (
    <div className={className}>
      <Link
        href="https://www.hostinger.com/in?REFERRALCODE=JXNSTARTUPGK"
        target="_blank"
        rel="noopener noreferrer sponsored"
        aria-label="Visit Hostinger advertisement"
      >
        <Image
          src="/images/ads/Hostinger_Ads.jpeg"
          alt="Hostinger advertisement"
          width={800}
          height={800}
          style={{ width: "100%", height: "auto" }}
          priority={false}
        />
      </Link>
    </div>
  );
}

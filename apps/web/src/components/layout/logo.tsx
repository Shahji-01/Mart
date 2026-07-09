interface NTCLogoProps {
  size?: number;
  className?: string;
}

export function NTCLogoIcon({ size = 36, className = "" }: NTCLogoProps) {
  return (
    <img
      src="/ntcmart-logo.png"
      alt="NTC Mart"
      width={size}
      height={size}
      className={`object-contain rounded-lg ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

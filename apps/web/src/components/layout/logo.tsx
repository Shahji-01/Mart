interface NTCLogoProps {
  size?: number;
  className?: string;
}

export function NTCLogoIcon({ size = 36, className = "" }: NTCLogoProps) {
  return (
    <img
      src="/shankeshwar-logo.png"
      alt="Shankeshwar Traders"
      width={size}
      height={size}
      className={`object-contain rounded-lg ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

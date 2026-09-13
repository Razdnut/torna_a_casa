import type { SVGProps } from "react";

type TornaACasaLogoProps = SVGProps<SVGSVGElement> & {
  title?: string;
};

export function TornaACasaLogo({
  title = "Torna a Casa",
  className,
  ...props
}: TornaACasaLogoProps) {
  return (
    <svg
      viewBox="0 0 196 40"
      role="img"
      aria-label={title}
      className={className}
      {...props}
    >
      <path
        d="M6 19.5 20 7l14 12.5v13.25a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V19.5Z"
        fill="currentColor"
        opacity=".18"
      />
      <path
        d="m5 19.5 15-13 15 13M9 17v15.5a3 3 0 0 0 3 3h16a3 3 0 0 0 3-3V17M16 35.5V25h8v10.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
      <circle cx="31" cy="12" r="7" fill="hsl(var(--accent))" />
      <path
        d="M31 8.6v3.8l2.5 1.5"
        fill="none"
        stroke="hsl(var(--accent-foreground))"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <text
        x="45"
        y="27"
        fill="currentColor"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontSize="20"
        fontWeight="800"
        letterSpacing="-.7"
      >
        Torna a Casa
      </text>
    </svg>
  );
}

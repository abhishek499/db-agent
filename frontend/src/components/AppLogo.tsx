interface Props {
  /** Icon size in pixels (default 32) */
  size?: number
  /** Show "DB Agent" wordmark beside the icon (default true) */
  showText?: boolean
  /** Extra classes on the text span */
  textClassName?: string
}

/**
 * DB Agent brand logo — gradient rounded icon + optional wordmark.
 * Matches the favicon design exactly.
 */
export default function AppLogo({ size = 32, showText = true, textClassName = '' }: Props) {
  // Use size-derived unique suffix so multiple instances on the same page
  // don't fight over the gradient id.
  const id = `logo-bg-${size}`

  return (
    <span className="inline-flex items-center gap-2.5">
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4f46e5" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect width="32" height="32" rx="7" fill={`url(#${id})`} />

        {/* Cylinder body */}
        <rect x="8" y="12" width="16" height="12" fill="rgba(255,255,255,0.72)" />

        {/* Top cap */}
        <ellipse cx="16" cy="12" rx="8" ry="2.6" fill="white" />

        {/* Middle ring */}
        <ellipse
          cx="16" cy="18" rx="8" ry="2.6"
          fill="rgba(255,255,255,0.08)"
          stroke="rgba(255,255,255,0.45)"
          strokeWidth="0.7"
        />

        {/* Bottom cap */}
        <ellipse cx="16" cy="24" rx="8" ry="2.6" fill="rgba(255,255,255,0.88)" />

        {/* AI sparkle */}
        <path
          d="M25.5 5.2 L26.1 6.5 L27.4 7 L26.1 7.5 L25.5 8.8 L24.9 7.5 L23.6 7 L24.9 6.5 Z"
          fill="rgba(255,255,255,0.92)"
        />
      </svg>

      {showText && (
        <span className={`font-bold tracking-tight ${textClassName}`}>
          DB Agent
        </span>
      )}
    </span>
  )
}

import type { SVGProps } from 'react';

export function SupabaseLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 3L2 7V17L12 21L22 17V7L12 3Z" />
      <path d="M2 7L12 12M12 12L22 7M12 12V21" />
      <path d="M12 3C12 3 10 5.66667 10 7C10 8.33333 12 12 12 12" />
      <path d="M12 3C12 3 14 5.66667 14 7C14 8.33333 12 12 12 12" />
      <path d="M2 17L6.5 14.5" />
      <path d="M22 17L17.5 14.5" />
    </svg>
  );
}

// The /login page is styled with Tailwind utilities only; they live in the shared isolated sheet,
// which is loaded per route layout (like about-us, careers, events) rather than globally.
import "../isolated-tailwind.css";

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}

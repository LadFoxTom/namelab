import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 transition-all duration-300">
      <div className="max-w-[1440px] mx-auto px-6 md:px-12 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
            N
          </div>
          <span className="font-medium text-lg tracking-tight">Namer.ai</span>
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-500">
          <Link href="#" className="hover:text-black transition-colors">
            Pricing
          </Link>
          <Link href="#" className="hover:text-black transition-colors">
            API
          </Link>
          <Link href="#" className="hover:text-black transition-colors">
            About
          </Link>
          <Link
            href="#"
            className="text-black hover:opacity-70 transition-opacity"
          >
            Login
          </Link>
        </div>
      </div>
    </nav>
  );
}

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-50 py-12 sm:py-24 border-t border-gray-200">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-12 flex flex-col md:flex-row justify-between items-start gap-8 md:gap-12">
        <div>
          <div className="flex items-center gap-2 mb-6">
            <div className="w-6 h-6 rounded bg-black text-white flex items-center justify-center text-xs font-bold">
              S
            </div>
            <span className="font-bold text-gray-900">Sparkdomain</span>
          </div>
          <p className="text-gray-500 font-light text-sm max-w-xs">
            Design is intelligence made visible. We bring that philosophy to
            naming your next big thing.
          </p>
        </div>
        <div className="flex gap-8 sm:gap-16 text-sm">
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Product</h4>
            <ul className="space-y-2 text-gray-500 font-light">
              <li>
                <Link href="#" className="hover:text-black">
                  Features
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-black">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-black">
                  API
                </Link>
              </li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Company</h4>
            <ul className="space-y-2 text-gray-500 font-light">
              <li>
                <Link href="#" className="hover:text-black">
                  About
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-black">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-black">
                  Careers
                </Link>
              </li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Legal</h4>
            <ul className="space-y-2 text-gray-500 font-light">
              <li>
                <Link href="#" className="hover:text-black">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-black">
                  Terms
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}

import Link from "next/link";
import Image from "next/image";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-black/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center shrink-0 h-12">
            <Image
              src="/header_logo.png"
              alt="投資のiPSマーケット.com"
              width={200}
              height={40}
              className="h-10 w-auto object-contain object-left"
              priority
            />
          </Link>

          <a
            href="https://kawaraban.co.jp/form/contactall/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-c"
          >
            お問合わせ
            <span className="btn-c-icon" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" width="1.6rem" height="1.6rem" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </span>
          </a>
        </div>
      </div>
    </header>
  );
}

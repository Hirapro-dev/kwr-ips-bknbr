import Link from "next/link";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-black/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center shrink-0">
            <span className="font-black text-lg tracking-tight text-black">
              投資のiPSマーケット.com
            </span>
          </Link>

          <a
            href="https://kawaraban.co.jp/form/contactall/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-black hover:opacity-60 transition-opacity"
          >
            お問合わせ
          </a>
        </div>
      </div>
    </header>
  );
}

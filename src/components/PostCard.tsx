import Link from "next/link";
import Image from "next/image";
import { formatDate } from "@/lib/utils";

type PostCardProps = {
  post: {
    slug: string;
    title: string;
    excerpt?: string | null;
    eyecatch?: string | null;
    createdAt: string | Date;
  };
  variant?: "list" | "grid";
};

export default function PostCard({ post, variant = "grid" }: PostCardProps) {
  if (variant === "list") {
    // Desktop: 横並びリスト型（LIG PC版風）
    return (
      <Link href={`/posts/${post.slug}`} className="group block">
        <article className="flex gap-6 py-8 border-b border-black/10">
          <div className="w-[360px] shrink-0 aspect-[16/10] relative rounded-sm overflow-hidden bg-black/5">
            {post.eyecatch ? (
              <Image
                src={post.eyecatch}
                alt={post.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                sizes="360px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-black/5">
                <span className="font-black text-3xl text-black/20">iPS</span>
              </div>
            )}
          </div>
          <div className="flex flex-col justify-center flex-1 min-w-0">
            <h2 className="text-xl font-bold text-black leading-snug line-clamp-2 group-hover:opacity-60 transition-opacity">
              {post.title}
            </h2>
            <time className="mt-3 text-sm text-black/40 block">
              {formatDate(post.createdAt)}
            </time>
          </div>
        </article>
      </Link>
    );
  }

  // Mobile: グリッドカード型（LIG SP版風）
  return (
    <Link href={`/posts/${post.slug}`} className="group block">
      <article>
        <div className="aspect-[16/10] relative rounded-sm overflow-hidden bg-black/5">
          {post.eyecatch ? (
            <Image
              src={post.eyecatch}
              alt={post.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 768px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-black/5">
              <span className="font-black text-2xl text-black/20">iPS</span>
            </div>
          )}
        </div>
        <div className="mt-3">
          <h2 className="text-sm font-bold text-black leading-snug line-clamp-3 group-hover:opacity-60 transition-opacity">
            {post.title}
          </h2>
          <time className="mt-2 text-xs text-black/40 block">
            {formatDate(post.createdAt)}
          </time>
        </div>
      </article>
    </Link>
  );
}

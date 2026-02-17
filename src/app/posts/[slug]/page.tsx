import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PostCard from "@/components/PostCard";
import ClickTracker from "@/components/ClickTracker";
import { formatDate } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { FiArrowLeft, FiCalendar } from "react-icons/fi";

type Post = {
  id: number;
  slug: string;
  title: string;
  content: string;
  excerpt: string | null;
  eyecatch: string | null;
  published: boolean;
  createdAt: string;
};

async function getPost(slug: string): Promise<Post | null> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/posts/${slug}`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

/** 表示中の記事に似た「おすすめ記事」を取得（タイトル類似度で算出） */
async function getRecommendedPosts(slug: string): Promise<Post[]> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/posts/recommended?slug=${encodeURIComponent(slug)}`, { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return data.posts ?? [];
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post || !post.published) notFound();

  const recommendedPosts = await getRecommendedPosts(post.slug);
  const isHtml = post.content.includes("<") && post.content.includes(">");

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <ClickTracker postId={post.id} />

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-10 w-full">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-black/40 hover:text-black transition-colors mb-8"
        >
          <FiArrowLeft size={14} />
          記事一覧に戻る
        </Link>

        <article>
          <div className="flex items-center gap-2 text-sm text-black/40 mb-4">
            <FiCalendar size={14} />
            <time>{formatDate(post.createdAt)}</time>
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-black mb-8 leading-tight">
            {post.title}
          </h1>

          {post.eyecatch && (
            <div className="aspect-[16/9] relative rounded-sm overflow-hidden mb-10">
              <Image
                src={post.eyecatch}
                alt={post.title}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, 720px"
              />
            </div>
          )}

          <div className="prose max-w-none" data-article-content>
            {isHtml ? (
              <div dangerouslySetInnerHTML={{ __html: post.content }} />
            ) : (
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                {post.content}
              </ReactMarkdown>
            )}
          </div>
        </article>

        {recommendedPosts.length > 0 && (
          <section className="mt-16 pt-10 border-t border-black/10">
            <h2 className="text-xl font-black text-black mb-6">あなたにおすすめの記事</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {recommendedPosts.map((p) => (
                <PostCard key={p.id} post={p} variant="grid" />
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}

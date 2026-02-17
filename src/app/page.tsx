import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PostCard from "@/components/PostCard";
import Pagination from "@/components/Pagination";

type Post = {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  eyecatch: string | null;
  published: boolean;
  views: number;
  createdAt: string;
};

async function getPosts(page: number) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/posts?page=${page}&limit=12`, {
    cache: "no-store",
  });
  if (!res.ok) return { posts: [], total: 0, page: 1, totalPages: 1 };
  return res.json();
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const data = await getPosts(page);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Section title */}
          <div className="pt-10 pb-6 border-b border-black/10">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-black">
              Latest
            </h1>
            <p className="text-sm text-black/40 mt-1">新着記事</p>
          </div>

          {data.posts.length > 0 ? (
            <>
              {/* Desktop: list layout */}
              <div className="hidden md:block">
                {data.posts.map((post: Post) => (
                  <PostCard key={post.id} post={post} variant="list" />
                ))}
              </div>

              {/* Mobile: 2-column grid */}
              <div className="md:hidden grid grid-cols-2 gap-x-4 gap-y-6 pt-6">
                {data.posts.map((post: Post) => (
                  <PostCard key={post.id} post={post} variant="grid" />
                ))}
              </div>

              <Pagination currentPage={data.page} totalPages={data.totalPages} />
            </>
          ) : (
            <div className="text-center py-20">
              <span className="font-black text-5xl text-black/10">iPS</span>
              <h2 className="text-lg font-bold text-black mt-4">記事はまだありません</h2>
              <p className="text-black/40 text-sm mt-1">管理画面から記事を投稿してください</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

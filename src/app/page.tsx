import Link from "next/link";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PostCard from "@/components/PostCard";
import Pagination from "@/components/Pagination";
import { formatDate } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

type Post = {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  eyecatch: string | null;
  published: boolean;
  views: number;
  createdAt: Date;
  writer?: { name: string; avatarUrl: string | null } | null;
};

type Banner = { id: number; label: string; url: string; imageUrl: string | null; order: number };

async function getPosts(page: number) {
  const limit = 12;
  const skip = (page - 1) * limit;

  // 予約投稿の自動公開チェック
  const now = new Date();
  await prisma.post.updateMany({
    where: { published: false, scheduledAt: { lte: now, not: null } },
    data: { published: true },
  });

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true, title: true, slug: true, excerpt: true,
        eyecatch: true, published: true, views: true, createdAt: true,
        writer: { select: { name: true, avatarUrl: true } },
      },
    }),
    prisma.post.count({ where: { published: true } }),
  ]);

  return { posts, total, page, totalPages: Math.ceil(total / limit) };
}

/** トップ用：おすすめ記事5件（閲覧数順） */
async function getRecommendedForTop(): Promise<Post[]> {
  return prisma.post.findMany({
    where: { published: true },
    orderBy: { views: "desc" },
    take: 5,
    select: {
      id: true, title: true, slug: true, excerpt: true,
      eyecatch: true, published: true, views: true, createdAt: true,
    },
  });
}

/** 管理画面で設定されたバナーのみ取得 */
async function getBanners(): Promise<Banner[]> {
  return prisma.banner.findMany({
    orderBy: { order: "asc" },
    select: { id: true, label: true, url: true, imageUrl: true, order: true },
  });
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const [data, recommended, banners] = await Promise.all([
    getPosts(page),
    getRecommendedForTop(),
    getBanners(),
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="pt-10 pb-6 border-b border-black/10 flex flex-col lg:flex-row lg:gap-10">
            {/* メイン */}
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-black">Latest</h1>
              <p className="text-sm text-black/40 mt-1">新着記事</p>
            </div>
          </div>

          <div className="lg:flex lg:gap-10">
            {/* メインコンテンツ */}
            <div className="flex-1 min-w-0">
              {data.posts.length > 0 ? (
                <>
                  <div className="hidden md:block">
                    {data.posts.map((post: Post) => (
                      <PostCard key={post.id} post={post} variant="list" />
                    ))}
                  </div>
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

            {/* サイドバー: おすすめ＋バナー（デスクトップのみ表示） */}
            <aside className="hidden lg:block w-[320px] shrink-0 pt-10">
              {recommended.length > 0 && (
                <section className="mb-8">
                  <h2 className="text-lg font-black text-black mb-4">あなたにおすすめの記事</h2>
                  <ul className="space-y-4">
                    {recommended.map((post) => (
                      <li key={post.id} className="border-b border-black/5 last:border-0 pb-4 last:pb-0">
                        <Link href={`/posts/${post.slug}`} className="group flex gap-3">
                          <div className="w-28 h-20 shrink-0 rounded-sm overflow-hidden bg-black/5">
                            {post.eyecatch ? (
                              <Image
                                src={post.eyecatch}
                                alt={post.title}
                                width={112}
                                height={80}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="font-black text-lg text-black/20">iPS</span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-black leading-snug line-clamp-2 group-hover:opacity-60">{post.title}</p>
                            <time className="text-xs text-black/40 mt-1 block">{formatDate(post.createdAt)}</time>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {banners.length > 0 && (
                <section>
                  <h2 className="text-lg font-black text-black mb-4">バナー</h2>
                  <ul className="space-y-3">
                    {banners.map((b) => (
                      <li key={b.id}>
                        <a href={b.url} target="_blank" rel="noopener noreferrer" className="block border border-black/10 rounded-sm overflow-hidden hover:opacity-90 transition-opacity">
                          {b.imageUrl ? (
                            <div className="aspect-[2/1] relative bg-black/5">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={b.imageUrl} alt={b.label} className="w-full h-full object-cover" />
                            </div>
                          ) : null}
                          <p className={`font-medium text-sm text-black text-center ${b.imageUrl ? "py-2" : "py-3 px-3"} bg-white`}>
                            {b.label}
                          </p>
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

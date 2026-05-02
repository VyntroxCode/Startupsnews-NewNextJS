import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AuthorPostCardImage } from "@/components/AuthorPostCardImage";
import { AuthorProfileAvatar } from "@/components/AuthorProfileAvatar";
import { getAuthorPostsPageData } from "@/lib/data-adapter";
import { getPostPath } from "@/lib/post-utils";

export const revalidate = 60;

function readParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export async function generateMetadata(
  { params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }
): Promise<Metadata> {
  const { slug } = await params;
  const query = await searchParams;

  const data = await getAuthorPostsPageData({
    slug,
    type: readParam(query.type),
    id: readParam(query.id),
    name: readParam(query.name),
    limit: 1,
  });

  if (!data) return { title: "Author not found" };

  return {
    title: `${data.name} - Author | StartupNews.fyi`,
    description: `Latest stories by ${data.name} on StartupNews.fyi`,
  };
}

export default async function AuthorPage(
  { params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }
) {
  const { slug } = await params;
  const query = await searchParams;

  const data = await getAuthorPostsPageData({
    slug,
    type: readParam(query.type),
    id: readParam(query.id),
    name: readParam(query.name),
    limit: 20,
  });

  if (!data || data.posts.length === 0) {
    notFound();
  }

  const bio = data.description?.trim();

  return (
    <div className="author-page-wrap">
      {/* Header Section */}
      <header className="author-page-header">
        <div className="mvp-main-box">
          <div className="author-header-inner">
            <AuthorProfileAvatar name={data.name} avatarUrl={data.avatarUrl} />
            <div className="author-page-info">
              <h2 style={{ fontSize: '2em' }}>{data.name}</h2>
              {bio && (
                <p className="author-page-bio">
                  {bio}
                </p>
              )}
              {/* Social media icons can be added here if available */}
            </div>
          </div>
        </div>
      </header>

      {/* Posts Grid Section */}
      <div className="mvp-main-box">
        <section className="author-posts-grid">
          {data.posts.map((post) => (
            <article key={post.id} className="author-grid-post">
              <Link href={getPostPath(post)} rel="bookmark">
                <div className="author-grid-image">
                  <div
                    className="author-grid-image-bg"
                    style={{ backgroundImage: `url(${post.image})` }}
                    aria-hidden
                  />
                  <AuthorPostCardImage src={post.image} alt={post.title} />
                  <span className="author-grid-cat">{post.category}</span>
                </div>
                <div className="author-grid-content">
                  <h2 className="post-heading-max-3-lines">{post.title}</h2>
                  <p className="author-grid-byline">By {data.name}</p>
                </div>
              </Link>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}

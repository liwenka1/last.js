interface BlogPostProps {
  slug: string;
}

export default function BlogPost({ slug }: BlogPostProps) {
  return (
    <div>
      <h1>Blog Post: {slug}</h1>
      <p>This is a dynamic route example.</p>
    </div>
  );
}

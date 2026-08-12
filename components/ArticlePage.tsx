export default function ArticlePage({ children }: { children: React.ReactNode }) {
  return (
    <div className="thin-scroll absolute inset-0 overflow-y-auto bg-page px-5 py-10">
      <article className="prose-id mx-auto max-w-[760px]">{children}</article>
    </div>
  );
}

export default function PageHeader({ eyebrow, title, subtitle }) {
  return (
    <div className="fade-up mb-14 text-center">
      {eyebrow && (
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2">
          <span className="h-2 w-2 rounded-full bg-blue-400" />
          <span className="text-xs font-medium tracking-[0.15em] uppercase text-blue-300">
            {eyebrow}
          </span>
        </div>
      )}

      <h1 className="mt-6 text-3xl font-bold tracking-tight text-white lg:text-4xl">
        {title}
      </h1>

      {subtitle && (
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-400">
          {subtitle}
        </p>
      )}
    </div>
  );
}

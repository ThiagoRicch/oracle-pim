const TEAM_INFO = {
  project: 'Oracle Server Management System',
  course: 'Projeto Interdisciplinar de Modelos (PIM)',
  year: '2026',
  stack: ['React 19', 'TypeScript', 'Vite', 'TailwindCSS', 'FastAPI', 'Supabase'],
}

export function AboutPage() {
  return (
    <div className="flex flex-1 flex-col p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[--color-text-primary]">
          Sobre
        </h1>
        <p className="mt-1 text-sm text-[--color-text-secondary]">
          Informações sobre o projeto.
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        <div className="rounded-xl border border-[--color-border] bg-[--color-card-bg] p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[--color-text-secondary]">
            Projeto
          </h2>
          <p className="mt-2 text-lg font-semibold text-[--color-text-primary]">
            {TEAM_INFO.project}
          </p>
          <p className="mt-1 text-sm text-[--color-text-secondary]">
            {TEAM_INFO.course} — {TEAM_INFO.year}
          </p>
        </div>

        <div className="rounded-xl border border-[--color-border] bg-[--color-card-bg] p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[--color-text-secondary]">
            Stack
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {TEAM_INFO.stack.map(tech => (
              <span
                key={tech}
                className="rounded-full bg-[--color-accent]/10 px-3 py-1 text-xs font-medium text-[--color-accent]"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

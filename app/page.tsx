'use client';

import { useEffect, useMemo, useState } from 'react';

const sections = ['Reading', 'Listening', 'Speaking', 'Writing'] as const;
type Section = (typeof sections)[number];

type TemplateItem = {
  id: string;
  label: string;
  route: 'Router' | 'Upper' | 'Task';
  section: Section;
  max: number;
  sampleScore: number;
};

type Attempt = {
  id: string;
  title: string;
  date: string;
  path: 'Router + Upper' | 'Router + Lower' | 'Mixed practice';
  values: Record<string, number | ''>;
  official: Partial<Record<Section, number | ''>>;
  notes: string;
};

type SectionSummary = {
  section: Section;
  earned: number;
  max: number;
  allMax: number;
  completion: number;
  percent: number;
  estimated30: number;
  band: number;
  official: number | '';
};

const itemMax = 30;

const templateItems: TemplateItem[] = [
  { id: 'upper-listen-response', label: 'Upper Listen and Choose a Response', route: 'Upper', section: 'Listening', sampleScore: 30 },
  { id: 'upper-academic-talk-1', label: 'Upper Listen to an Academic Talk', route: 'Upper', section: 'Listening', sampleScore: 30 },
  { id: 'upper-academic-talk-2', label: 'Upper Listen to an Academic Talk / 2', route: 'Upper', section: 'Listening', sampleScore: 30 },
  { id: 'upper-conversation-1', label: 'Upper Listen to a Conversation', route: 'Upper', section: 'Listening', sampleScore: 30 },
  { id: 'upper-conversation-2', label: 'Upper Listen to a Conversation / 2', route: 'Upper', section: 'Listening', sampleScore: 15 },
  { id: 'upper-read-academic', label: 'Upper Read an Academic Passage', route: 'Upper', section: 'Reading', sampleScore: 24 },
  { id: 'upper-complete-words', label: 'Upper Complete the Words', route: 'Upper', section: 'Reading', sampleScore: 18 },
  { id: 'router-listen-response', label: 'Router Listen and Choose a Response', route: 'Router', section: 'Listening', sampleScore: 19 },
  { id: 'router-academic-talk-1', label: 'Router Listen to an Academic Talk', route: 'Router', section: 'Listening', sampleScore: 30 },
  { id: 'router-academic-talk-2', label: 'Router Listen to an Academic Talk / 2', route: 'Router', section: 'Listening', sampleScore: 21 },
  { id: 'router-announcement-1', label: 'Router Listen to an Announcement', route: 'Router', section: 'Listening', sampleScore: 30 },
  { id: 'router-announcement-2', label: 'Router Listen to an Announcement / 2', route: 'Router', section: 'Listening', sampleScore: 15 },
  { id: 'router-announcement-3', label: 'Router Listen to an Announcement / 3', route: 'Router', section: 'Listening', sampleScore: 15 },
  { id: 'router-conversation-1', label: 'Router Listen to a Conversation', route: 'Router', section: 'Listening', sampleScore: 30 },
  { id: 'router-conversation-2', label: 'Router Listen to a Conversation / 2', route: 'Router', section: 'Listening', sampleScore: 30 },
  { id: 'router-conversation-3', label: 'Router Listen to a Conversation / 3', route: 'Router', section: 'Listening', sampleScore: 30 },
  { id: 'router-read-academic-1', label: 'Router Read an Academic Passage', route: 'Router', section: 'Reading', sampleScore: 24 },
  { id: 'router-read-academic-2', label: 'Router Read an Academic Passage / 2', route: 'Router', section: 'Reading', sampleScore: 18 },
  { id: 'router-read-daily-1', label: 'Router Read in Daily Life', route: 'Router', section: 'Reading', sampleScore: 30 },
  { id: 'router-read-daily-2', label: 'Router Read in Daily Life / 2', route: 'Router', section: 'Reading', sampleScore: 20 },
  { id: 'router-complete-words', label: 'Router Complete the Words', route: 'Router', section: 'Reading', sampleScore: 18 },
  { id: 'speaking-repeat', label: 'Listen and Repeat', route: 'Task', section: 'Speaking', sampleScore: 25 },
  { id: 'speaking-interview', label: 'Take an Interview', route: 'Task', section: 'Speaking', sampleScore: 20 },
  { id: 'writing-discussion', label: 'Write for an Academic Discussion', route: 'Task', section: 'Writing', sampleScore: 15 },
  { id: 'writing-email', label: 'Write an Email', route: 'Task', section: 'Writing', sampleScore: 15 },
  { id: 'writing-sentence', label: 'Build a Sentence', route: 'Task', section: 'Writing', sampleScore: 27 },
].map((item) => ({ ...item, max: itemMax }));

const bandLookup: Record<Section, number[]> = {
  Reading: [1, 1, 1.5, 2, 2.5, 2.5, 3, 3, 3, 3, 3, 3, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 4, 4, 4, 4, 4.5, 4.5, 5, 5, 5, 5.5, 5.5, 6, 6],
  Listening: [1, 1, 1.5, 1.5, 2, 2, 2.5, 2.5, 2.5, 3, 3, 3, 3, 3.5, 3.5, 3.5, 3.5, 4, 4, 4, 4.5, 4.5, 5, 5, 5, 5, 5.5, 5.5, 6, 6, 6],
  Speaking: [1, 1, 1, 1, 1, 1.5, 1.5, 1.5, 1.5, 1.5, 2, 2, 2, 2.5, 2.5, 2.5, 3, 3, 3.5, 3.5, 4, 4, 4, 4.5, 4.5, 5, 5, 5.5, 6, 6, 6],
  Writing: [1, 1, 1, 1.5, 1.5, 1.5, 1.5, 2, 2, 2, 2, 2.5, 2.5, 3, 3, 3.5, 3.5, 4, 4, 4, 4, 4.5, 4.5, 4.5, 5, 5, 5, 5.5, 5.5, 6, 6],
};

const sectionColors: Record<Section, string> = {
  Reading: 'bg-emerald-500',
  Listening: 'bg-sky-500',
  Speaking: 'bg-rose-500',
  Writing: 'bg-amber-500',
};

const sectionNames: Record<Section, string> = {
  Reading: '阅读',
  Listening: '听力',
  Speaking: '口语',
  Writing: '写作',
};

const storageKey = 'toefl-tracker-attempts-v1';

function today() {
  return new Date().toISOString().slice(0, 10);
}

function makeEmptyAttempt(title = '2026年1月第10套', fillSample = false) {
  return {
    id: crypto.randomUUID(),
    title,
    date: today(),
    path: 'Router + Upper',
    values: Object.fromEntries(templateItems.map((item) => [item.id, fillSample ? item.sampleScore : ''])),
    official: Object.fromEntries(sections.map((section) => [section, ''])),
    notes: '',
  } as Attempt;
}

function scoreToBand(section: Section, estimated30: number) {
  const rounded = Math.max(0, Math.min(30, Math.round(estimated30)));
  return bandLookup[section][rounded] ?? 1;
}

function roundHalf(value: number) {
  return Math.round(value * 2) / 2;
}

function formatScore(value: number | '') {
  return value === '' || Number.isNaN(value) ? '-' : value.toFixed(value % 1 === 0 ? 0 : 1);
}

function summarizeAttempt(attempt: Attempt): SectionSummary[] {
  return sections.map((section) => {
    const items = templateItems.filter((item) => item.section === section);
    const filled = items.filter((item) => attempt.values[item.id] !== '' && attempt.values[item.id] !== undefined);
    const earned = filled.reduce((sum, item) => sum + Number(attempt.values[item.id] || 0), 0);
    const max = filled.reduce((sum, item) => sum + item.max, 0);
    const allMax = items.reduce((sum, item) => sum + item.max, 0);
    const percent = max > 0 ? earned / max : 0;
    const estimated30 = Math.round(percent * 300) / 10;
    return {
      section,
      earned,
      max,
      allMax,
      completion: allMax > 0 ? max / allMax : 0,
      percent,
      estimated30,
      band: scoreToBand(section, estimated30),
      official: attempt.official[section] ?? '',
    };
  });
}

function getOverall(summary: SectionSummary[]) {
  const available = summary.filter((item) => item.max > 0);
  if (!available.length) return { band: 0, oldTotal: 0 };
  return {
    band: roundHalf(available.reduce((sum, item) => sum + item.band, 0) / available.length),
    oldTotal: Math.round(available.reduce((sum, item) => sum + item.estimated30, 0)),
  };
}

export default function Home() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [activeId, setActiveId] = useState('');
  const [tab, setTab] = useState('dashboard');

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Attempt[];
        if (parsed.length) {
          setAttempts(parsed);
          setActiveId(parsed[0].id);
          return;
        }
      } catch {
        localStorage.removeItem(storageKey);
      }
    }
    const first = makeEmptyAttempt('2026年1月第10套', true);
    setAttempts([first]);
    setActiveId(first.id);
  }, []);

  useEffect(() => {
    if (attempts.length) {
      localStorage.setItem(storageKey, JSON.stringify(attempts));
    }
  }, [attempts]);

  const activeAttempt = attempts.find((attempt) => attempt.id === activeId) ?? attempts[0];
  const activeSummary = useMemo(() => (activeAttempt ? summarizeAttempt(activeAttempt) : []), [activeAttempt]);
  const overall = useMemo(() => getOverall(activeSummary), [activeSummary]);
  const history = useMemo(
    () =>
      attempts
        .map((attempt) => ({ attempt, summary: summarizeAttempt(attempt) }))
        .sort((a, b) => a.attempt.date.localeCompare(b.attempt.date)),
    [attempts],
  );

  function updateAttempt(next: Attempt) {
    setAttempts((current) => current.map((attempt) => (attempt.id === next.id ? next : attempt)));
  }

  function setValue(item: TemplateItem, raw: string) {
    if (!activeAttempt) return;
    const value = raw === '' ? '' : Math.max(0, Math.min(item.max, Number(raw)));
    updateAttempt({
      ...activeAttempt,
      values: { ...activeAttempt.values, [item.id]: Number.isNaN(value as number) ? '' : value },
    });
  }

  function setOfficial(section: Section, raw: string) {
    if (!activeAttempt) return;
    const value = raw === '' ? '' : Math.max(0, Math.min(30, Number(raw)));
    updateAttempt({
      ...activeAttempt,
      official: { ...activeAttempt.official, [section]: Number.isNaN(value as number) ? '' : value },
    });
  }

  function addAttempt() {
    const next = makeEmptyAttempt(`模拟卷 ${attempts.length + 1}`);
    setAttempts((current) => [next, ...current]);
    setActiveId(next.id);
    setTab('entry');
  }

  function duplicateAttempt() {
    if (!activeAttempt) return;
    const next = {
      ...activeAttempt,
      id: crypto.randomUUID(),
      title: `${activeAttempt.title} 复盘`,
      date: today(),
    };
    setAttempts((current) => [next, ...current]);
    setActiveId(next.id);
    setTab('entry');
  }

  function resetCurrent() {
    if (!activeAttempt) return;
    updateAttempt({
      ...activeAttempt,
      values: Object.fromEntries(templateItems.map((item) => [item.id, ''])),
      official: Object.fromEntries(sections.map((section) => [section, ''])),
      notes: '',
    });
  }

  function deleteCurrent() {
    if (!activeAttempt) return;
    const confirmed = window.confirm(`确定删除「${activeAttempt.title}」这条模考记录吗？`);
    if (!confirmed) return;

    const remaining = attempts.filter((attempt) => attempt.id !== activeAttempt.id);
    if (remaining.length) {
      setAttempts(remaining);
      setActiveId(remaining[0].id);
      return;
    }

    const next = makeEmptyAttempt('模拟卷 1');
    setAttempts([next]);
    setActiveId(next.id);
    setTab('entry');
  }

  const weakItems = useMemo(() => {
    if (!activeAttempt) return [];
    return templateItems
      .filter((item) => activeAttempt.values[item.id] !== '')
      .map((item) => ({ item, rate: Number(activeAttempt.values[item.id]) / item.max }))
      .sort((a, b) => a.rate - b.rate)
      .slice(0, 5);
  }, [activeAttempt]);

  if (!activeAttempt) {
    return <main className="min-h-screen bg-[#f7f4ee]" />;
  }

  return (
    <main className="min-h-screen bg-[#f6f3ed] text-stone-950">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">TOEFL iBT 2026 tracker</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">新托福模拟卷成长追踪</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button className="action-button primary" onClick={addAttempt}>新增模考</button>
              <button className="action-button" onClick={duplicateAttempt}>复制当前</button>
              <button className="action-button danger" onClick={deleteCurrent}>删除当前</button>
              <button className="icon-button" aria-label="清空当前模考" title="清空当前模考" onClick={resetCurrent}>×</button>
            </div>
          </div>
          <nav className="flex gap-2 overflow-x-auto" aria-label="页面导航">
            {[
              ['dashboard', '总览'],
              ['entry', '录分'],
              ['analytics', '成长分析'],
              ['rules', '计分规则'],
            ].map(([id, label]) => (
              <button key={id} className={`tab-button ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-8">
        <aside className="space-y-4">
          <section className="panel">
            <label className="field-label" htmlFor="attempt-select">当前模考</label>
            <select id="attempt-select" className="field" value={activeId} onChange={(event) => setActiveId(event.target.value)}>
              {attempts.map((attempt) => (
                <option value={attempt.id} key={attempt.id}>{attempt.date} · {attempt.title}</option>
              ))}
            </select>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="metric-tile">
                <span>新制总分</span>
                <strong>{overall.band ? overall.band.toFixed(1) : '-'}</strong>
              </div>
              <div className="metric-tile">
                <span>旧制估算</span>
                <strong>{overall.oldTotal || '-'}</strong>
              </div>
            </div>
          </section>

          <section className="panel">
            <h2 className="panel-title">四科估算</h2>
            <div className="space-y-3">
              {activeSummary.map((summary) => (
                <div key={summary.section}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span>{sectionNames[summary.section]}</span>
                    <span className="font-semibold">{formatScore(summary.band)} / 6</span>
                  </div>
                  <div className="track">
                    <span className={`${sectionColors[summary.section]} block h-full rounded-full`} style={{ width: `${Math.max(4, summary.band / 6 * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <h2 className="panel-title">需要优先复盘</h2>
            <div className="space-y-2">
              {weakItems.length ? weakItems.map(({ item, rate }) => (
                <div className="weak-row" key={item.id}>
                  <span>{item.label.replace('Router ', '').replace('Upper ', '')}</span>
                  <strong>{Math.round(rate * 100)}%</strong>
                </div>
              )) : <p className="empty-text">录入成绩后会自动显示低分题型。</p>}
            </div>
          </section>
        </aside>

        <div className="min-w-0">
          {tab === 'dashboard' && (
            <div className="space-y-5">
              <section className="hero-band">
                <div>
                  <p className="text-sm font-medium text-sky-900">当前卷：{activeAttempt.title}</p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-tight">把每次模考拆成可追踪的题型数据</h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-700">
                    页面已按每题满分 30 分设置录入上限，并预填了 toefl.txt 中这次样例成绩。Reading 与 Listening 的官方换算包含自适应路径和等值处理，这里给出练习估算，同时支持手动填入官方或平台分数。
                  </p>
                </div>
                <div className="score-dial">
                  <span>Overall</span>
                  <strong>{overall.band ? overall.band.toFixed(1) : '-'}</strong>
                  <small>estimated band</small>
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-4">
                {activeSummary.map((summary) => (
                  <article className="panel section-card" key={summary.section}>
                    <span className={`section-dot ${sectionColors[summary.section]}`} />
                    <h3>{sectionNames[summary.section]}</h3>
                    <div className="mt-4 text-3xl font-semibold">{formatScore(summary.estimated30)}</div>
                    <p className="text-sm text-stone-500">旧 0-30 估算</p>
                    <div className="mt-4 text-sm text-stone-700">
                      {formatScore(summary.earned)} / {summary.max || summary.allMax} · {Math.round(summary.percent * 100)}%
                    </div>
                  </article>
                ))}
              </section>

              <section className="panel">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="panel-title">趋势快照</h2>
                  <span className="text-xs text-stone-500">按保存的模考日期排序</span>
                </div>
                <div className="trend-grid">
                  {sections.map((section) => (
                    <div key={section} className="trend-lane">
                      <span>{sectionNames[section]}</span>
                      <div className="trend-bars">
                        {history.map(({ attempt, summary }) => {
                          const sectionSummary = summary.find((item) => item.section === section);
                          const height = sectionSummary ? Math.max(8, sectionSummary.band / 6 * 100) : 8;
                          return <i key={attempt.id} title={`${attempt.title}: ${formatScore(sectionSummary?.band ?? '')}`} style={{ height: `${height}%` }} />;
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {tab === 'entry' && (
            <div className="space-y-5">
              <section className="panel">
                <div className="grid gap-4 md:grid-cols-3">
                  <label className="field-group">
                    <span>套卷名称</span>
                    <input className="field" value={activeAttempt.title} onChange={(event) => updateAttempt({ ...activeAttempt, title: event.target.value })} />
                  </label>
                  <label className="field-group">
                    <span>日期</span>
                    <input className="field" type="date" value={activeAttempt.date} onChange={(event) => updateAttempt({ ...activeAttempt, date: event.target.value })} />
                  </label>
                  <label className="field-group">
                    <span>路径</span>
                    <select className="field" value={activeAttempt.path} onChange={(event) => updateAttempt({ ...activeAttempt, path: event.target.value as Attempt['path'] })}>
                      <option>Router + Upper</option>
                      <option>Router + Lower</option>
                      <option>Mixed practice</option>
                    </select>
                  </label>
                </div>
              </section>

              {sections.map((section) => (
                <section className="panel" key={section}>
                  <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                    <div>
                      <h2 className="panel-title">{sectionNames[section]}录分</h2>
                      <p className="text-sm text-stone-500">每项满分 30 分；空白项不会计入本次估算，适合分阶段练习。</p>
                    </div>
                    <label className="official-field">
                      <span>官方/平台 0-30</span>
                      <input type="number" min="0" max="30" step="0.5" value={activeAttempt.official[section] ?? ''} onChange={(event) => setOfficial(section, event.target.value)} />
                    </label>
                  </div>
                  <div className="score-table">
                    {templateItems.filter((item) => item.section === section).map((item) => (
                      <div className="score-row" key={item.id}>
                        <div>
                          <span className="route-chip">{item.route}</span>
                          <strong>{item.label}</strong>
                        </div>
                        <div className="score-input-wrap">
                          <input
                            aria-label={`${item.label} 得分`}
                            type="number"
                            min="0"
                            max={item.max}
                            step="0.5"
                            value={activeAttempt.values[item.id] ?? ''}
                            onChange={(event) => setValue(item, event.target.value)}
                          />
                          <span>/ {item.max}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}

              <section className="panel">
                <label className="field-group">
                  <span>复盘备注</span>
                  <textarea className="field min-h-28 resize-y" value={activeAttempt.notes} onChange={(event) => updateAttempt({ ...activeAttempt, notes: event.target.value })} />
                </label>
              </section>
            </div>
          )}

          {tab === 'analytics' && (
            <div className="space-y-5">
              <section className="panel">
                <h2 className="panel-title">题型热力图</h2>
                <div className="heatmap">
                  {templateItems.map((item) => (
                    <div className="heat-row" key={item.id}>
                      <span>{item.label}</span>
                      <div>
                        {history.map(({ attempt }) => {
                          const raw = attempt.values[item.id];
                          const rate = raw === '' ? 0 : Number(raw) / item.max;
                          return <i key={attempt.id} title={`${attempt.title}: ${raw === '' ? '-' : Math.round(rate * 100) + '%'}`} style={{ opacity: raw === '' ? 0.14 : 0.25 + rate * 0.75 }} />;
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="panel">
                <h2 className="panel-title">历史记录</h2>
                <div className="history-table">
                  <div className="history-head">
                    <span>日期</span><span>套卷</span><span>R</span><span>L</span><span>S</span><span>W</span><span>Overall</span>
                  </div>
                  {history.map(({ attempt, summary }) => {
                    const itemOverall = getOverall(summary);
                    return (
                      <div className="history-row" key={attempt.id}>
                        <span>{attempt.date}</span>
                        <span>{attempt.title}</span>
                        {sections.map((section) => <span key={section}>{formatScore(summary.find((item) => item.section === section)?.band ?? '')}</span>)}
                        <strong>{itemOverall.band ? itemOverall.band.toFixed(1) : '-'}</strong>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          )}

          {tab === 'rules' && (
            <div className="space-y-5">
              <section className="panel prose-panel">
                <h2>新版 TOEFL iBT 计分规则</h2>
                <p>2026 年新版 TOEFL iBT 报告 Reading、Listening、Speaking、Writing 四个 section band，每科为 1-6 分，按 0.5 递增。Overall 为四科 band 平均后四舍五入到最近 0.5。</p>
                <p>Reading 与 Listening 使用 Router 后进入 Upper 或 Lower 的自适应路径。ETS 不公开每套卷的原始分到报告分完整换算，因此本工具使用你的练习得分率生成 0-30 与 1-6 的估算值。</p>
                <p>本工具里的每个练习条目都按 30 分满分录入，再汇总为各科练习估算。只要你拿到模考平台或 ETS 的结果，应优先录入官方/平台分，用它校准自己的趋势。</p>
              </section>

              <section className="panel">
                <h2 className="panel-title">0-30 到 1-6 参考映射</h2>
                <div className="mapping-grid">
                  {sections.map((section) => (
                    <div key={section}>
                      <h3>{sectionNames[section]}</h3>
                      <div className="mapping-list">
                        {[6, 5.5, 5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1].map((band) => {
                          const scores = bandLookup[section]
                            .map((value, score) => ({ value, score }))
                            .filter((row) => row.value === band)
                            .map((row) => row.score);
                          if (!scores.length) return null;
                          return <p key={band}><span>{band}</span><strong>{Math.min(...scores)}-{Math.max(...scores)}</strong></p>;
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

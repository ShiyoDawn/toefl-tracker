'use client';

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';

const sections = ['Reading', 'Listening', 'Speaking', 'Writing'] as const;
type Section = (typeof sections)[number];

type TemplateItem = {
  id: string;
  label: string;
  route: 'Router' | 'Upper' | 'Task';
  section: Section;
  max: number;
  sampleScore: number;
  typeKey?: string;
  scoringKey: string;
};

type Attempt = {
  id: string;
  title: string;
  date: string;
  path: 'Router + Upper' | 'Router + Lower' | 'Mixed practice';
  values: Record<string, number | ''>;
  readingCounts?: Record<string, number>;
  official: Partial<Record<Section, number | ''>>;
  notes: string;
};

type UserAccount = {
  id: string;
  username: string;
  passwordHash: string;
  avatar: string;
  createdAt: string;
};

type TrackerState = {
  attempts: Attempt[];
  activeId: string;
};

type AppState = {
  accounts: UserAccount[];
  sessionUserId: string;
  tracker: TrackerState;
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

function getScoringKey(label: string) {
  return label.replace(/^(Router|Upper) /, '').replace(/ \/ \d+$/, '');
}

const rawTemplateItems = [
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
  { id: 'router-read-daily-1', label: 'Router Read in Daily Life', route: 'Router', section: 'Reading', sampleScore: 30 },
  { id: 'router-complete-words', label: 'Router Complete the Words', route: 'Router', section: 'Reading', sampleScore: 18 },
  { id: 'speaking-repeat', label: 'Listen and Repeat', route: 'Task', section: 'Speaking', sampleScore: 25 },
  { id: 'speaking-interview', label: 'Take an Interview', route: 'Task', section: 'Speaking', sampleScore: 20 },
  { id: 'writing-discussion', label: 'Write for an Academic Discussion', route: 'Task', section: 'Writing', sampleScore: 15 },
  { id: 'writing-email', label: 'Write an Email', route: 'Task', section: 'Writing', sampleScore: 15 },
  { id: 'writing-sentence', label: 'Build a Sentence', route: 'Task', section: 'Writing', sampleScore: 27 },
] satisfies Omit<TemplateItem, 'max' | 'typeKey' | 'scoringKey'>[];

const templateItems: TemplateItem[] = rawTemplateItems.map((item) => ({
  ...item,
  max: itemMax,
  typeKey: getScoringKey(item.label),
  scoringKey: getScoringKey(item.label),
}));

const readingBaseItems = templateItems.filter((item) => item.section === 'Reading');
const templateItemById = Object.fromEntries(templateItems.map((item) => [item.id, item]));
const legacyReadingItemMigration: Record<string, { baseId: string; index: number }> = {
  'router-read-academic-2': { baseId: 'router-read-academic-1', index: 2 },
  'router-read-daily-2': { baseId: 'router-read-daily-1', index: 2 },
  'router-complete-words-2': { baseId: 'router-complete-words', index: 2 },
};

const bandLookup: Record<Section, number[]> = {
  Reading: [1, 1, 1.5, 2, 2.5, 2.5, 3, 3, 3, 3, 3, 3, 3.5, 3.5, 3.5, 3.5, 3.5, 3.5, 4, 4, 4, 4, 4.5, 4.5, 5, 5, 5, 5.5, 5.5, 6, 6],
  Listening: [1, 1, 1.5, 1.5, 2, 2, 2.5, 2.5, 2.5, 3, 3, 3, 3, 3.5, 3.5, 3.5, 3.5, 4, 4, 4, 4.5, 4.5, 5, 5, 5, 5, 5.5, 5.5, 6, 6, 6],
  Speaking: [1, 1, 1, 1, 1, 1.5, 1.5, 1.5, 1.5, 1.5, 2, 2, 2, 2.5, 2.5, 2.5, 3, 3, 3.5, 3.5, 4, 4, 4, 4.5, 4.5, 5, 5, 5.5, 6, 6, 6],
  Writing: [1, 1, 1, 1.5, 1.5, 1.5, 1.5, 2, 2, 2, 2, 2.5, 2.5, 3, 3, 3.5, 3.5, 4, 4, 4, 4, 4.5, 4.5, 4.5, 5, 5, 5, 5.5, 5.5, 6, 6],
};

type ScoreWeights = Record<string, number>;

const readingWeightsByPath: Record<Attempt['path'], ScoreWeights> = {
  'Router + Upper': {
    'Complete the Words': 20,
    'Read in Daily Life': 5,
    'Read an Academic Passage': 10,
  },
  'Router + Lower': {
    'Complete the Words': 20,
    'Read in Daily Life': 10,
    'Read an Academic Passage': 5,
  },
  'Mixed practice': {
    'Complete the Words': 20,
    'Read in Daily Life': 7.5,
    'Read an Academic Passage': 7.5,
  },
};

const listeningWeightsByPath: Record<Attempt['path'], ScoreWeights> = {
  'Router + Upper': {
    'Listen and Choose a Response': 11,
    'Listen to a Conversation': 8,
    'Listen to an Announcement': 4,
    'Listen to an Academic Talk': 12,
  },
  'Router + Lower': {
    'Listen and Choose a Response': 15,
    'Listen to a Conversation': 8,
    'Listen to an Announcement': 8,
    'Listen to an Academic Talk': 4,
  },
  'Mixed practice': {
    'Listen and Choose a Response': 13,
    'Listen to a Conversation': 8,
    'Listen to an Announcement': 6,
    'Listen to an Academic Talk': 8,
  },
};

const fixedSectionWeights: Record<'Speaking' | 'Writing', ScoreWeights> = {
  Speaking: {
    'Listen and Repeat': 35,
    'Take an Interview': 20,
  },
  Writing: {
    'Build a Sentence': 10,
    'Write an Email': 5,
    'Write for an Academic Discussion': 5,
  },
};

const scoringTypeRows: { id: string; section: Section; label: string }[] = [
  ...Object.keys(readingWeightsByPath['Router + Upper']).map((label) => ({ id: `Reading:${label}`, section: 'Reading' as const, label })),
  ...Object.keys(listeningWeightsByPath['Router + Upper']).map((label) => ({ id: `Listening:${label}`, section: 'Listening' as const, label })),
  ...Object.keys(fixedSectionWeights.Speaking).map((label) => ({ id: `Speaking:${label}`, section: 'Speaking' as const, label })),
  ...Object.keys(fixedSectionWeights.Writing).map((label) => ({ id: `Writing:${label}`, section: 'Writing' as const, label })),
];

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

const legacyAttemptsStorageKey = 'toefl-tracker-attempts-v1';
const accountsStorageKey = 'toefl-tracker-users-v1';
const sessionStorageKey = 'toefl-tracker-session-v1';

function today() {
  return new Date().toISOString().slice(0, 10);
}

function createId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `attempt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function userAttemptsStorageKey(userId: string) {
  return `toefl-tracker-attempts-v2:${userId}`;
}

function readingInstanceId(baseId: string, index: number) {
  return index === 1 ? baseId : `${baseId}__${index}`;
}

function clampScore(value: unknown, max = itemMax) {
  if (value === '' || value === undefined || value === null || Number.isNaN(Number(value))) {
    return '';
  }

  return Math.max(0, Math.min(max, Number(value)));
}

function getReadingCountFromMap(readingCounts: Partial<Record<string, number>> | undefined, baseId: string) {
  const count = Number(readingCounts?.[baseId]);
  return Math.max(1, Number.isFinite(count) ? Math.floor(count) : 1);
}

function getReadingInstances(baseItem: TemplateItem, readingCounts?: Partial<Record<string, number>>) {
  const count = getReadingCountFromMap(readingCounts, baseItem.id);
  return Array.from({ length: count }, (_, index) => {
    const itemIndex = index + 1;
    return {
      ...baseItem,
      id: readingInstanceId(baseItem.id, itemIndex),
      label: itemIndex === 1 ? baseItem.label : `${baseItem.typeKey ?? baseItem.label} / ${itemIndex}`,
    };
  });
}

function getAttemptItems(attempt: Pick<Attempt, 'readingCounts'>) {
  return templateItems.flatMap((item) => {
    return item.section === 'Reading' ? getReadingInstances(item, attempt.readingCounts) : [item];
  });
}

function getFilledReadingGroup(attempt: Attempt, baseItem: TemplateItem) {
  return getReadingInstances(baseItem, attempt.readingCounts)
    .map((item) => clampScore(attempt.values[item.id], item.max))
    .filter((value): value is number => value !== '');
}

function getAverageReadingScore(attempt: Attempt, baseItem: TemplateItem) {
  const scores = getFilledReadingGroup(attempt, baseItem);
  if (!scores.length) return '';
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

function getInitials(username: string) {
  const clean = username.trim();
  return clean ? clean.slice(0, 2).toUpperCase() : 'U';
}

function fallbackHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

async function hashPassword(username: string, password: string) {
  const normalized = `toefl-tracker:${username.trim().toLowerCase()}:${password}`;
  if (globalThis.crypto?.subtle) {
    try {
      const encoded = new TextEncoder().encode(normalized);
      const digest = await globalThis.crypto.subtle.digest('SHA-256', encoded);
      return `sha256:${Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('')}`;
    } catch {
      // Some HTTP contexts expose crypto but block SubtleCrypto; use fallback.
    }
  }

  return `fallback:${fallbackHash(normalized)}`;
}

function readAccounts() {
  try {
    const saved = localStorage.getItem(accountsStorageKey);
    const parsed = saved ? JSON.parse(saved) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((account): account is UserAccount => {
        return Boolean(
          account &&
            typeof account.id === 'string' &&
            typeof account.username === 'string' &&
            typeof account.passwordHash === 'string',
        );
      })
      .map((account) => ({
        id: account.id,
        username: account.username,
        passwordHash: account.passwordHash,
        avatar: typeof account.avatar === 'string' ? account.avatar : '',
        createdAt: typeof account.createdAt === 'string' ? account.createdAt : today(),
      }));
  } catch {
    return [];
  }
}

function saveAccounts(accounts: UserAccount[]) {
  localStorage.setItem(accountsStorageKey, JSON.stringify(accounts));
}

function readSessionUserId(accounts: UserAccount[]) {
  try {
    const saved = localStorage.getItem(sessionStorageKey);
    return accounts.some((account) => account.id === saved) ? saved ?? '' : '';
  } catch {
    return '';
  }
}

function makeEmptyAttempt(title = '2026年1月第10套', fillSample = false) {
  return {
    id: createId(),
    title,
    date: today(),
    path: 'Router + Upper',
    values: Object.fromEntries(templateItems.map((item) => [item.id, fillSample ? item.sampleScore : ''])),
    readingCounts: Object.fromEntries(readingBaseItems.map((item) => [item.id, 1])),
    official: Object.fromEntries(sections.map((section) => [section, ''])),
    notes: '',
  } as Attempt;
}

function normalizeAttempt(value: unknown, index: number) {
  if (!value || typeof value !== 'object') return null;

  const raw = value as Partial<Attempt>;
  const validPaths: Attempt['path'][] = ['Router + Upper', 'Router + Lower', 'Mixed practice'];
  const rawValues = raw.values ?? {};
  const readingCounts = Object.fromEntries(readingBaseItems.map((item) => [item.id, 1]));

  if (raw.readingCounts && typeof raw.readingCounts === 'object') {
    for (const item of readingBaseItems) {
      readingCounts[item.id] = getReadingCountFromMap(raw.readingCounts, item.id);
    }
  }

  for (const key of Object.keys(rawValues)) {
    const match = key.match(/^(.*)__(\d+)$/);
    if (!match) continue;
    const [, baseId, indexText] = match;
    if (templateItemById[baseId]?.section === 'Reading') {
      readingCounts[baseId] = Math.max(readingCounts[baseId], Number(indexText) || 1);
    }
  }

  for (const [legacyId, migration] of Object.entries(legacyReadingItemMigration)) {
    if (rawValues[legacyId] !== undefined) {
      readingCounts[migration.baseId] = Math.max(readingCounts[migration.baseId], migration.index);
    }
  }

  const values = Object.fromEntries(
    getAttemptItems({ readingCounts }).map((item) => {
      const rawValue = rawValues[item.id];
      return [item.id, clampScore(rawValue, item.max)];
    }),
  );

  for (const [legacyId, migration] of Object.entries(legacyReadingItemMigration)) {
    const migratedId = readingInstanceId(migration.baseId, migration.index);
    if (rawValues[legacyId] !== undefined && values[migratedId] === '') {
      values[migratedId] = clampScore(rawValues[legacyId]);
    }
  }

  const official = Object.fromEntries(
    sections.map((section) => {
      return [section, clampScore(raw.official?.[section], 30)];
    }),
  );

  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : createId(),
    title: typeof raw.title === 'string' && raw.title ? raw.title : `模拟卷 ${index + 1}`,
    date: typeof raw.date === 'string' && raw.date ? raw.date : today(),
    path: validPaths.includes(raw.path as Attempt['path']) ? (raw.path as Attempt['path']) : 'Router + Upper',
    values,
    readingCounts,
    official,
    notes: typeof raw.notes === 'string' ? raw.notes : '',
  } as Attempt;
}

function emptyTracker(): TrackerState {
  return { attempts: [], activeId: '' };
}

function loadAttemptsFromKey(key: string) {
  try {
    const saved = localStorage.getItem(key);
    const parsed = saved ? JSON.parse(saved) : null;
    if (Array.isArray(parsed)) {
      const attempts = parsed
        .map((attempt, index) => normalizeAttempt(attempt, index))
        .filter((attempt): attempt is Attempt => Boolean(attempt));
      if (attempts.length) return attempts;
    }
  } catch {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore storage errors so rendering can continue.
    }
  }

  return [];
}

function loadInitialTracker(userId: string, allowLegacyMigration = false): TrackerState {
  const userAttempts = loadAttemptsFromKey(userAttemptsStorageKey(userId));
  if (userAttempts.length) return { attempts: userAttempts, activeId: userAttempts[0].id };

  if (allowLegacyMigration) {
    const legacyAttempts = loadAttemptsFromKey(legacyAttemptsStorageKey);
    if (legacyAttempts.length) return { attempts: legacyAttempts, activeId: legacyAttempts[0].id };
  }

  const first = makeEmptyAttempt('2026年1月第10套', true);
  return { attempts: [first], activeId: first.id };
}

function loadInitialAppState(): AppState {
  const accounts = readAccounts();
  const sessionUserId = readSessionUserId(accounts);

  return {
    accounts,
    sessionUserId,
    tracker: sessionUserId ? loadInitialTracker(sessionUserId, true) : emptyTracker(),
  };
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

function getWeightsForSection(section: Section, path: Attempt['path']) {
  if (section === 'Reading') return readingWeightsByPath[path];
  if (section === 'Listening') return listeningWeightsByPath[path];
  if (section === 'Speaking') return fixedSectionWeights.Speaking;
  return fixedSectionWeights.Writing;
}

function getSectionTypeAverages(attempt: Attempt, section: Section) {
  const groups = new Map<string, { label: string; scores: number[] }>();
  const items = section === 'Reading' ? readingBaseItems : templateItems.filter((item) => item.section === section);

  for (const item of items) {
    const target = groups.get(item.scoringKey) ?? { label: item.typeKey ?? item.label, scores: [] };
    const rawScores =
      item.section === 'Reading'
        ? getFilledReadingGroup(attempt, item)
        : [clampScore(attempt.values[item.id], item.max)].filter((score): score is number => score !== '');

    target.scores.push(...rawScores);
    groups.set(item.scoringKey, target);
  }

  return new Map(
    [...groups.entries()].map(([key, value]) => [
      key,
      {
        label: value.label,
        average: value.scores.length ? value.scores.reduce((sum, score) => sum + score, 0) / value.scores.length : '',
      },
    ]),
  );
}

function summarizeAttempt(attempt: Attempt): SectionSummary[] {
  return sections.map((section) => {
    const weights = getWeightsForSection(section, attempt.path);
    const typeAverages = getSectionTypeAverages(attempt, section);
    const allMax = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    const { earned, max } = Object.entries(weights).reduce(
      (totals, [scoringKey, rawWeight]) => {
        const average = typeAverages.get(scoringKey)?.average;
        if (average === '' || average === undefined) return totals;
        return {
          earned: totals.earned + (Number(average) / itemMax) * rawWeight,
          max: totals.max + rawWeight,
        };
      },
      { earned: 0, max: 0 },
    );
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

function AvatarMark({ user, size = 'normal' }: { user: Pick<UserAccount, 'username' | 'avatar'>; size?: 'normal' | 'large' }) {
  return (
    <span className={`user-avatar ${size === 'large' ? 'large' : ''}`}>
      {user.avatar ? <img src={user.avatar} alt={`${user.username} 的头像`} /> : <span>{getInitials(user.username)}</span>}
    </span>
  );
}

export default function Home() {
  const [appState, setAppState] = useState(loadInitialAppState);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({
    username: '',
    password: '',
    confirm: '',
    avatar: '',
    error: '',
    isBusy: false,
  });
  const [tab, setTab] = useState('dashboard');

  const { accounts, sessionUserId, tracker } = appState;
  const { attempts, activeId } = tracker;
  const currentUser = accounts.find((account) => account.id === sessionUserId);

  useEffect(() => {
    if (currentUser && attempts.length) {
      localStorage.setItem(userAttemptsStorageKey(currentUser.id), JSON.stringify(attempts));
    }
  }, [attempts, currentUser]);

  function updateAccounts(nextAccounts: UserAccount[]) {
    saveAccounts(nextAccounts);
    setAppState((current) => ({ ...current, accounts: nextAccounts }));
  }

  function clearAuthError() {
    setAuthForm((current) => ({ ...current, error: '' }));
  }

  function updateAuthField(field: 'username' | 'password' | 'confirm', value: string) {
    setAuthForm((current) => ({ ...current, [field]: value, error: '' }));
  }

  function readAvatarFile(file: File) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleAuthAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setAuthForm((current) => ({ ...current, error: '请选择图片文件作为头像。' }));
      return;
    }
    if (file.size > 1_500_000) {
      setAuthForm((current) => ({ ...current, error: '头像图片请控制在 1.5MB 以内。' }));
      return;
    }

    const avatar = await readAvatarFile(file);
    setAuthForm((current) => ({ ...current, avatar, error: '' }));
  }

  async function handleProfileAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    if (!currentUser) return;
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/') || file.size > 1_500_000) return;

    const avatar = await readAvatarFile(file);
    const nextAccounts = accounts.map((account) => (account.id === currentUser.id ? { ...account, avatar } : account));
    updateAccounts(nextAccounts);
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const username = authForm.username.trim();
    const password = authForm.password;

    if (username.length < 2) {
      setAuthForm((current) => ({ ...current, error: '用户名至少需要 2 个字符。' }));
      return;
    }
    if (password.length < 6) {
      setAuthForm((current) => ({ ...current, error: '密码至少需要 6 位。' }));
      return;
    }
    if (password !== authForm.confirm) {
      setAuthForm((current) => ({ ...current, error: '两次输入的密码不一致。' }));
      return;
    }
    if (accounts.some((account) => account.username.toLowerCase() === username.toLowerCase())) {
      setAuthForm((current) => ({ ...current, error: '这个用户名已经被注册。' }));
      return;
    }

    setAuthForm((current) => ({ ...current, isBusy: true, error: '' }));
    const account: UserAccount = {
      id: createId(),
      username,
      passwordHash: await hashPassword(username, password),
      avatar: authForm.avatar,
      createdAt: today(),
    };
    const nextAccounts = [...accounts, account];
    saveAccounts(nextAccounts);
    localStorage.setItem(sessionStorageKey, account.id);
    setAppState({
      accounts: nextAccounts,
      sessionUserId: account.id,
      tracker: loadInitialTracker(account.id, true),
    });
    setAuthForm({ username: '', password: '', confirm: '', avatar: '', error: '', isBusy: false });
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const username = authForm.username.trim();
    const account = accounts.find((item) => item.username.toLowerCase() === username.toLowerCase());
    if (!account) {
      setAuthForm((current) => ({ ...current, error: '用户名或密码错误。' }));
      return;
    }

    setAuthForm((current) => ({ ...current, isBusy: true, error: '' }));
    const passwordHash = await hashPassword(account.username, authForm.password);
    if (passwordHash !== account.passwordHash) {
      setAuthForm((current) => ({ ...current, isBusy: false, error: '用户名或密码错误。' }));
      return;
    }

    localStorage.setItem(sessionStorageKey, account.id);
    setAppState({
      accounts,
      sessionUserId: account.id,
      tracker: loadInitialTracker(account.id, true),
    });
    setAuthForm({ username: '', password: '', confirm: '', avatar: '', error: '', isBusy: false });
  }

  function logout() {
    localStorage.removeItem(sessionStorageKey);
    setAppState((current) => ({ ...current, sessionUserId: '', tracker: emptyTracker() }));
    setAuthMode('login');
    clearAuthError();
  }

  function setAttempts(updater: Attempt[] | ((current: Attempt[]) => Attempt[])) {
    setAppState((current) => {
      const nextAttempts = typeof updater === 'function' ? updater(current.tracker.attempts) : updater;
      const nextActiveId = nextAttempts.some((attempt) => attempt.id === current.tracker.activeId)
        ? current.tracker.activeId
        : nextAttempts[0]?.id ?? '';
      return { ...current, tracker: { attempts: nextAttempts, activeId: nextActiveId } };
    });
  }

  function setActiveId(nextActiveId: string) {
    setAppState((current) => ({ ...current, tracker: { ...current.tracker, activeId: nextActiveId } }));
  }

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
    const value = clampScore(raw, item.max);
    updateAttempt({
      ...activeAttempt,
      values: { ...activeAttempt.values, [item.id]: Number.isNaN(value as number) ? '' : value },
    });
  }

  function setOfficial(section: Section, raw: string) {
    if (!activeAttempt) return;
    const value = clampScore(raw, 30);
    updateAttempt({
      ...activeAttempt,
      official: { ...activeAttempt.official, [section]: Number.isNaN(value as number) ? '' : value },
    });
  }

  function addReadingInstance(baseItem: TemplateItem) {
    if (!activeAttempt) return;
    const nextCount = getReadingCountFromMap(activeAttempt.readingCounts, baseItem.id) + 1;
    updateAttempt({
      ...activeAttempt,
      readingCounts: { ...activeAttempt.readingCounts, [baseItem.id]: nextCount },
      values: { ...activeAttempt.values, [readingInstanceId(baseItem.id, nextCount)]: '' },
    });
  }

  function removeReadingInstance(baseItem: TemplateItem, index: number) {
    if (!activeAttempt || index <= 1) return;
    const currentCount = getReadingCountFromMap(activeAttempt.readingCounts, baseItem.id);
    if (currentCount <= 1) return;

    const values = { ...activeAttempt.values };
    for (let currentIndex = index; currentIndex < currentCount; currentIndex += 1) {
      values[readingInstanceId(baseItem.id, currentIndex)] = values[readingInstanceId(baseItem.id, currentIndex + 1)] ?? '';
    }
    delete values[readingInstanceId(baseItem.id, currentCount)];

    updateAttempt({
      ...activeAttempt,
      readingCounts: {
        ...activeAttempt.readingCounts,
        [baseItem.id]: currentCount - 1,
      },
      values,
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
      id: createId(),
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
      readingCounts: Object.fromEntries(readingBaseItems.map((item) => [item.id, 1])),
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
    return scoringTypeRows
      .map((row) => {
        const average = getSectionTypeAverages(activeAttempt, row.section).get(row.label)?.average;
        return average === '' || average === undefined ? null : { id: row.id, label: row.label, rate: Number(average) / itemMax };
      })
      .filter((item): item is { id: string; label: string; rate: number } => Boolean(item))
      .sort((a, b) => a.rate - b.rate)
      .slice(0, 5);
  }, [activeAttempt]);

  const effectiveAuthMode = accounts.length ? authMode : 'register';
  const authPreview = { username: authForm.username || 'TOEFL', avatar: authForm.avatar };

  if (!currentUser) {
    return (
      <main className="auth-page">
        <section className="auth-shell">
          <div className="auth-copy">
            <p>TOEFL iBT 2026 tracker</p>
            <h1>登录后保存你的专属模考曲线</h1>
            <span>每个账号拥有独立的模考记录、趋势分析和头像资料。</span>
          </div>

          <section className="auth-card">
            <div className="auth-tabs" aria-label="登录与注册">
              <button
                className={effectiveAuthMode === 'login' ? 'active' : ''}
                disabled={!accounts.length}
                onClick={() => {
                  setAuthMode('login');
                  clearAuthError();
                }}
                type="button"
              >
                登录
              </button>
              <button
                className={effectiveAuthMode === 'register' ? 'active' : ''}
                onClick={() => {
                  setAuthMode('register');
                  clearAuthError();
                }}
                type="button"
              >
                注册
              </button>
            </div>

            <form className="auth-form" onSubmit={effectiveAuthMode === 'login' ? handleLogin : handleRegister}>
              {effectiveAuthMode === 'register' && (
                <div className="auth-avatar-row">
                  <AvatarMark user={authPreview} size="large" />
                  <label className="file-button">
                    上传头像
                    <input accept="image/*" type="file" onChange={handleAuthAvatarChange} />
                  </label>
                </div>
              )}

              <label className="field-group">
                <span>用户名</span>
                <input
                  autoComplete="username"
                  className="field"
                  value={authForm.username}
                  onChange={(event) => updateAuthField('username', event.target.value)}
                  placeholder="输入用户名"
                />
              </label>

              <label className="field-group">
                <span>密码</span>
                <input
                  autoComplete={effectiveAuthMode === 'login' ? 'current-password' : 'new-password'}
                  className="field"
                  type="password"
                  value={authForm.password}
                  onChange={(event) => updateAuthField('password', event.target.value)}
                  placeholder="至少 6 位"
                />
              </label>

              {effectiveAuthMode === 'register' && (
                <label className="field-group">
                  <span>确认密码</span>
                  <input
                    autoComplete="new-password"
                    className="field"
                    type="password"
                    value={authForm.confirm}
                    onChange={(event) => updateAuthField('confirm', event.target.value)}
                    placeholder="再次输入密码"
                  />
                </label>
              )}

              {authForm.error && <p className="auth-error">{authForm.error}</p>}
              <button className="action-button primary auth-submit" disabled={authForm.isBusy} type="submit">
                {authForm.isBusy ? '处理中...' : effectiveAuthMode === 'login' ? '登录' : '创建账号'}
              </button>
            </form>
          </section>
        </section>
      </main>
    );
  }

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
              <button className="action-button" onClick={logout}>退出登录</button>
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
          <section className="panel profile-card">
            <div className="profile-head">
              <AvatarMark user={currentUser} size="large" />
              <div>
                <span>当前用户</span>
                <strong>{currentUser.username}</strong>
              </div>
            </div>
            <div className="profile-actions">
              <label className="file-button compact">
                更换头像
                <input accept="image/*" type="file" onChange={handleProfileAvatarChange} />
              </label>
              <button className="action-button" onClick={logout}>退出</button>
            </div>
          </section>

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
              {weakItems.length ? weakItems.map(({ id, label, rate }) => (
                <div className="weak-row" key={id}>
                  <span>{label.replace('Router ', '').replace('Upper ', '')}</span>
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
                    页面把每个练习条目作为 0-30 表现分录入，同题型先取平均，再按官方原始分占比估算各科。Reading 与 Listening 会根据 Router + Upper 或 Router + Lower 路径切换权重。
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
                      加权 {formatScore(summary.earned)} / {formatScore(summary.max || summary.allMax)} · {Math.round(summary.percent * 100)}%
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
                      <p className="text-sm text-stone-500">每项输入 0-30 表现分；同题型先平均，再按官方原始分权重估算。空白题型不会计入本次估算。</p>
                    </div>
                    <label className="official-field">
                      <span>官方/平台 0-30</span>
                      <input type="number" min="0" max="30" step="0.5" value={activeAttempt.official[section] ?? ''} onChange={(event) => setOfficial(section, event.target.value)} />
                    </label>
                  </div>
                  <div className="score-table">
                    {section === 'Reading'
                      ? readingBaseItems.map((baseItem) => {
                          const instances = getReadingInstances(baseItem, activeAttempt.readingCounts);
                          const average = getAverageReadingScore(activeAttempt, baseItem);
                          return (
                            <div className="reading-type-group" key={baseItem.id}>
                              <div className="reading-type-head">
                                <div>
                                  <span className="route-chip">{baseItem.route}</span>
                                  <strong>{baseItem.typeKey ?? baseItem.label}</strong>
                                  <small>{average === '' ? '未录入' : `平均 ${formatScore(average)} / 30`}</small>
                                </div>
                                <button className="action-button small" onClick={() => addReadingInstance(baseItem)} type="button">
                                  添加同类型题目
                                </button>
                              </div>
                              <div className="score-table nested">
                                {instances.map((item, index) => (
                                  <div className="score-row compact" key={item.id}>
                                    <div>
                                      <strong>第 {index + 1} 题</strong>
                                      <span>{item.label}</span>
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
                                      {index > 0 && (
                                        <button
                                          className="mini-danger"
                                          onClick={() => removeReadingInstance(baseItem, index + 1)}
                                          type="button"
                                        >
                                          删除
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })
                      : templateItems.filter((item) => item.section === section).map((item) => (
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
                  {scoringTypeRows.map((row) => (
                    <div className="heat-row" key={row.id}>
                      <span>{sectionNames[row.section]} · {row.label}</span>
                      <div>
                        {history.map(({ attempt }) => {
                          const raw = getSectionTypeAverages(attempt, row.section).get(row.label)?.average ?? '';
                          const rate = raw === '' ? 0 : Number(raw) / itemMax;
                          return <i key={attempt.id} title={`${attempt.title}: ${raw === '' ? '-' : `${formatScore(Number(raw))} / 30`}`} style={{ opacity: raw === '' ? 0.14 : 0.25 + rate * 0.75 }} />;
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
                <p>本工具把每个练习条目作为 0-30 表现分录入，先计算同题型平均分，再乘以该题型在对应科目中的官方原始分权重。Reading 与 Listening 会根据 Router + Upper 或 Router + Lower 路径切换权重。</p>
                <p>ETS 不公开每套卷的 IRT 等值参数和完整原始分到报告分换算，因此这里给出练习估算。只要你拿到模考平台或 ETS 的结果，应优先录入官方/平台分，用它校准自己的趋势。</p>
              </section>

              <section className="panel">
                <h2 className="panel-title">官方原始分权重</h2>
                <div className="weight-grid">
                  {([
                    ['Reading · Router + Upper', readingWeightsByPath['Router + Upper']],
                    ['Reading · Router + Lower', readingWeightsByPath['Router + Lower']],
                    ['Listening · Router + Upper', listeningWeightsByPath['Router + Upper']],
                    ['Listening · Router + Lower', listeningWeightsByPath['Router + Lower']],
                    ['Speaking', fixedSectionWeights.Speaking],
                    ['Writing', fixedSectionWeights.Writing],
                  ] as [string, ScoreWeights][]).map(([title, weights]) => {
                    const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
                    return (
                      <div className="weight-card" key={title}>
                        <h3>{title}</h3>
                        {Object.entries(weights).map(([label, weight]) => (
                          <p key={label}>
                            <span>{label}</span>
                            <strong>{weight} · {Math.round((weight / total) * 1000) / 10}%</strong>
                          </p>
                        ))}
                      </div>
                    );
                  })}
                </div>
                <p className="rule-note">Mixed practice 使用 Upper 与 Lower 的平均权重，只作为混合练习估算，不标记为正式自适应路径分。</p>
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

import { z } from 'zod';

const GITHUB_API_BASE = 'https://api.github.com';
const WORLDCOIN_ORG = 'worldcoin';
const MAX_PAGES = 20;
const PAGE_SIZE = 100;
const REQUEST_TIMEOUT_MS = 8_000;

const RepoSchema = z.object({
  id: z.number(),
  name: z.string(),
  full_name: z.string(),
  private: z.boolean(),
  html_url: z.string().url(),
  description: z.string().nullable(),
  fork: z.boolean(),
  archived: z.boolean(),
  disabled: z.boolean(),
  stargazers_count: z.number(),
  watchers_count: z.number(),
  language: z.string().nullable(),
  default_branch: z.string(),
  pushed_at: z.string(),
  updated_at: z.string(),
});

export type WorldcoinRepo = z.infer<typeof RepoSchema>;

export interface WorldcoinReposResult {
  organization: string;
  total: number;
  repositories: WorldcoinRepo[];
}

async function fetchOrgReposPage(page: number): Promise<WorldcoinRepo[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${GITHUB_API_BASE}/orgs/${WORLDCOIN_ORG}/repos?type=all&per_page=${PAGE_SIZE}&page=${page}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'zwallet-api/1.0',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      throw new Error(`GitHub API request failed for page ${page} with status ${response.status}`);
    }

    const payload = await response.json();
    return z.array(RepoSchema).parse(payload);
  } finally {
    clearTimeout(timeout);
  }
}

export async function deepFindWorldcoinRepositories(): Promise<WorldcoinReposResult> {
  const repositories: WorldcoinRepo[] = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const pageItems = await fetchOrgReposPage(page);
    repositories.push(...pageItems);

    if (pageItems.length < PAGE_SIZE) {
      break;
    }
  }

  return {
    organization: WORLDCOIN_ORG,
    total: repositories.length,
    repositories,
  };
}

interface FastifyLike {
  get: (path: string, handler: () => Promise<WorldcoinReposResult>) => void;
}

export function createWorldcoinReposRoute(app: FastifyLike): void {
  app.get('/integrations/github/worldcoin/repositories', async () => deepFindWorldcoinRepositories());
}

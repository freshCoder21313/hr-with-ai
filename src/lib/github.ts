export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url?: string;
  };
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  updated_at: string;
  fork: boolean;
  topics?: string[];
}

export const fetchGitHubRepos = async (username: string, token?: string): Promise<GitHubRepo[]> => {
  const headers: HeadersInit = {
    Accept: 'application/vnd.github.v3+json',
  };

  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  let page = 1;
  let allRepos: GitHubRepo[] = [];
  let hasNextPage = true;

  try {
    while (hasNextPage) {
      const response = await fetch(
        `https://api.github.com/users/${username}/repos?sort=updated&per_page=100&page=${page}`,
        { headers }
      );

      if (!response.ok) {
        if (response.status === 404) throw new Error('User not found');
        if (response.status === 401) throw new Error('Invalid token');
        if (response.status === 403) throw new Error('Rate limit exceeded');
        throw new Error(`GitHub API error: ${response.statusText}`);
      }

      const data = await response.json();
      if (Array.isArray(data)) {
        allRepos = [...allRepos, ...data];
        if (data.length < 100) {
          hasNextPage = false;
        } else {
          page++;
        }
      } else {
        hasNextPage = false;
      }

      // Safety break to prevent infinite loops in weird API states
      if (page > 10) hasNextPage = false; // Max 1000 repos for now to be safe
    }
    return allRepos;
  } catch (error) {
    console.error('Error fetching GitHub repos:', error);
    throw error;
  }
};

export const fetchReadme = async (owner: string, repo: string, token?: string): Promise<string> => {
  const headers: HeadersInit = {
    Accept: 'application/vnd.github.raw', // Request raw content directly
  };

  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
      headers,
    });

    if (!response.ok) {
      if (response.status === 404) return ''; // No README is not a fatal error
      throw new Error(`Error fetching README: ${response.statusText}`);
    }

    return await response.text();
  } catch (error) {
    console.warn(`Failed to fetch README for ${owner}/${repo}:`, error);
    return '';
  }
};

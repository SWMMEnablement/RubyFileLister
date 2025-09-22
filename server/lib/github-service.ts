import { ScannedFile } from '@shared/schema';

export interface GitHubRepoInfo {
  owner: string;
  repo: string;
  branch?: string;
}

export interface GitHubCommitInfo {
  author: string;
  email: string;
  hash: string;
  message: string;
  date: Date;
  url: string;
}

export class GitHubService {
  private token: string;
  private baseUrl = 'https://api.github.com';

  constructor(token: string) {
    this.token = token;
  }

  /**
   * Parse GitHub repository information from a directory path or URL
   */
  static parseRepoInfo(directoryPath: string): GitHubRepoInfo | null {
    // Check if it's a GitHub URL pattern
    const githubUrlPattern = /github\.com[\/:]([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/|$)/i;
    const match = directoryPath.match(githubUrlPattern);
    
    if (match) {
      return {
        owner: match[1],
        repo: match[2].replace(/\.git$/, ''),
        branch: 'main' // Default branch, could be detected later
      };
    }

    // Check if directory path contains .git or mentions GitHub
    if (directoryPath.includes('.git') || directoryPath.toLowerCase().includes('github')) {
      // Try to extract from common patterns like:
      // /path/to/username-reponame or /path/to/reponame
      const pathParts = directoryPath.split('/').filter(part => part.length > 0);
      const lastPart = pathParts[pathParts.length - 1];
      
      if (lastPart && lastPart.includes('-')) {
        const [owner, ...repoParts] = lastPart.split('-');
        if (owner && repoParts.length > 0) {
          return {
            owner,
            repo: repoParts.join('-'),
            branch: 'main'
          };
        }
      }
    }

    return null;
  }

  /**
   * Fetch the latest commit information for a specific file
   */
  async getFileCommitInfo(repoInfo: GitHubRepoInfo, filePath: string): Promise<GitHubCommitInfo | null> {
    try {
      // Clean up the file path - remove leading ./ or /
      const cleanPath = filePath.replace(/^\.?\//, '');
      
      const url = `${this.baseUrl}/repos/${repoInfo.owner}/${repoInfo.repo}/commits`;
      const params = new URLSearchParams({
        path: cleanPath,
        per_page: '1'
      });

      if (repoInfo.branch) {
        params.append('sha', repoInfo.branch);
      }

      const response = await fetch(`${url}?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'Just-Counting-File-Scanner/1.0'
        }
      });

      if (!response.ok) {
        console.warn(`GitHub API error for ${cleanPath}:`, response.status, response.statusText);
        return null;
      }

      const commits = await response.json();
      
      if (!commits || commits.length === 0) {
        return null;
      }

      const commit = commits[0];
      
      return {
        author: commit.commit.author.name,
        email: commit.commit.author.email,
        hash: commit.sha,
        message: commit.commit.message.split('\n')[0], // First line only
        date: new Date(commit.commit.author.date),
        url: commit.html_url
      };
    } catch (error) {
      console.error(`Error fetching commit info for ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Batch fetch commit information for multiple files
   */
  async getCommitInfoForFiles(repoInfo: GitHubRepoInfo, files: ScannedFile[]): Promise<Map<string, GitHubCommitInfo>> {
    const commitMap = new Map<string, GitHubCommitInfo>();
    
    // Process files in batches to avoid hitting rate limits
    const batchSize = 10;
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      
      const promises = batch.map(async (file) => {
        const commitInfo = await this.getFileCommitInfo(repoInfo, file.relativePath || file.path);
        if (commitInfo) {
          commitMap.set(file.id, commitInfo);
        }
      });
      
      await Promise.all(promises);
      
      // Rate limit: GitHub allows 5000 requests/hour for authenticated users
      // Add a small delay between batches to be respectful
      if (i + batchSize < files.length) {
        await delay(100);
      }
    }
    
    return commitMap;
  }

  /**
   * Test if the GitHub token and repository access are working
   */
  async testConnection(repoInfo: GitHubRepoInfo): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/repos/${repoInfo.owner}/${repoInfo.repo}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'Just-Counting-File-Scanner/1.0'
        }
      });

      return response.ok;
    } catch (error) {
      console.error('GitHub connection test failed:', error);
      return false;
    }
  }
}
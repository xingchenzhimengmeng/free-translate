export interface SiteRule {
  id: string;
  name: string;
  matches: string[];
  selectors?: string[];
  excludeSelectors?: string[];
  stayOriginalSelectors?: string[];
  injectedCss?: string[];
}

export const SITE_RULES: SiteRule[] = [
  {
    id: 'github',
    name: 'GitHub',
    matches: ['github.com', 'gist.github.com'],
    selectors: [
      'h1, h2, h3, h4, h5, h6',
      'article.markdown-body p',
      'article.markdown-body li',
      'article.markdown-body blockquote',
      'article.markdown-body td',
      'article.markdown-body th',
      '.markdown-title',
      '.repo-description p',
      '#responsive-meta-container p',
      'div.comment-body p',
      'div.comment-body li',
      'div.user-profile-bio',
      '.user-profile-bio',
      '.p-note',
      '[data-bio-text]',
      '.pinned-item-desc',
      '.user-status-message-wrapper',
      '[itemprop="description"]',
      'div.js-user-profile-bio',
    ],
    excludeSelectors: [
      '.top-bar',
      '.nav-bar',
      '.highlight',
      'pre',
      'code',
      '.blob-code-inner',
      '.blob-code',
      '.blob-num',
      '.diff-table',
      '.react-blob-sticky-header',
      '.notranslate',
      '.commit-ref',
      '.octicon',
      'nav',
      '.AppHeader',
      'header',
      'footer',
      '.js-yearly-contributions',
      '.js-calendar-graph',
      '.ContributionCalendar',
      '.ContributionCalendar-grid',
      '.ContributionCalendar-day',
      '.ContributionCalendar-label',
      '.graph-before-activity-overview',
      '.js-activity-overview-graph',
      '.activity-overview-point',
      '.contrib-column',
      '.contrib-legend',
      '.profile-timeline-year-list',
      '.sr-only',
      '.visually-hidden',
    ],
    injectedCss: [
      'article.markdown-body ft-translation { font-size: 0.9em !important; }',
      '.react-blob-sticky-header { max-height: unset !important; }',
    ],
  },
  {
    id: 'youtube',
    name: 'YouTube',
    matches: ['www.youtube.com', 'm.youtube.com', 'youtube.com'],
    selectors: [
      '#content-text',
      'yt-attributed-string#content-text',
      'yt-formatted-string#content-text',
      '.yt-core-attributed-string',
      'h1.ytd-watch-metadata',
      '#video-title',
      '#description-inline-expander',
      'yt-formatted-string.ytd-video-renderer',
      '#message.ytd-notification-renderer',
    ],
    excludeSelectors: [
      '.nav-bar',
      '.ytp-caption-window-container',
      '.ytp-caption-segment',
      '.badge',
      'yt-icon',
      'button',
      '.yt-spec-button-shape-next',
      '#movie_player',
    ],
    injectedCss: [
      'ytd-expander.ytd-comment-renderer, ytd-comment-view-model { --ytd-expander-max-lines: 1000 !important; }',
      '#content-text { -webkit-line-clamp: unset !important; max-height: unset !important; }',
      '#video-title, h1.ytd-watch-metadata, .ytd-video-renderer { -webkit-line-clamp: unset !important; max-height: unset !important; }',
    ],
  },
  {
    id: 'codeforces',
    name: 'Codeforces',
    matches: ['codeforces.com', '*.codeforces.com'],
    selectors: [
      '.problem-statement p',
      '.problem-statement .title',
      '.problem-statement .section-title',
      '.property-title',
      '.problem-statement .header > div',
      '.blog-post p',
      '.comment p',
    ],
    excludeSelectors: [
      '.top-bar',
      '.sample-test pre',
      '.sample-test',
      '.input pre',
      '.output pre',
      '.source-code',
      '.notranslate',
    ],
    stayOriginalSelectors: ['.tex-span', '.tex-formula', '[class^="MathJax"]', 'math'],
    injectedCss: ['.problem-statement ft-translation { display: block !important; margin-top: 6px !important; }'],
  },
  {
    id: 'twitter',
    name: 'Twitter / X',
    matches: ['twitter.com', 'x.com', '*.twitter.com', '*.x.com'],
    selectors: [
      '[data-testid="tweetText"]',
      '[data-testid="UserDescription"]',
      '[data-testid="birdwatch-pivot"]',
      '[data-testid="card.layoutLarge.detail"] h2',
    ],
    excludeSelectors: [
      '[data-testid="UserCell"]',
      '[data-testid="AppTabBar"]',
      '[data-testid="trend"]',
      'time',
      'svg',
      '[data-testid="tweet"] img',
    ],
    stayOriginalSelectors: [
      '[data-testid="tweetText"] a[href^="/"]',
      '[data-testid="tweetText"] a[href^="https://t.co"]',
    ],
    injectedCss: [
      '[data-testid="tweetText"] ft-translation { margin-top: 6px !important; font-size: 0.95em !important; }',
      '[data-testid="card.layoutLarge.detail"] > div { -webkit-line-clamp: unset !important; }',
    ],
  },
  {
    id: 'reddit',
    name: 'Reddit',
    matches: ['reddit.com', 'www.reddit.com', 'old.reddit.com', '*.reddit.com'],
    selectors: [
      '[data-testid="comment"]',
      '[slot="comment"]',
      '[data-testid="post-title-text"]',
      '[data-click-id="text"] p',
      '.RichTextJSON-root p',
      '.Comment__body p',
      '.PostContent p',
      'div[data-testid="post-container"] h1',
    ],
    excludeSelectors: [
      'pre',
      'code',
      'faceplate-hovercard',
      'a[href^="/user/"]',
      '.avatar',
      'time',
      'button',
      'shreddit-post-comment-tree',
    ],
    injectedCss: [
      '[data-testid="comment"] ft-translation, [slot="comment"] ft-translation { margin-top: 4px !important; }',
      '[data-testid="post-title-text"] { -webkit-line-clamp: unset !important; max-height: unset !important; }',
    ],
  },
  {
    id: 'stackoverflow',
    name: 'StackOverflow',
    matches: [
      'stackoverflow.com',
      '*.stackexchange.com',
      'superuser.com',
      'askubuntu.com',
      'serverfault.com',
    ],
    selectors: [
      '.s-prose p',
      '.s-prose li',
      'span.comment-copy',
      '#question-header h1 a',
      '.s-post-summary--content-title a',
    ],
    excludeSelectors: [
      'pre',
      'code',
      '.votecell',
      '.user-info',
      '.s-user-card',
      '.post-tag',
      '.post-signature',
      '.comment-user',
      '.comment-date',
      '#left-sidebar',
    ],
    injectedCss: [
      '.s-post-summary--content-excerpt { -webkit-line-clamp: unset !important; }',
      '.s-prose ft-translation { margin: 6px 0 !important; }',
    ],
  },
  {
    id: 'wikipedia',
    name: 'Wikipedia',
    matches: ['wikipedia.org', '*.wikipedia.org'],
    selectors: [
      '#mw-content-text p',
      '#mw-content-text h1, #mw-content-text h2, #mw-content-text h3',
      '#mw-content-text li',
      '#firstHeading',
    ],
    excludeSelectors: [
      '.mw-editsection',
      '.mw-cite-backlink',
      '.reference',
      '.infobox',
      '.navbox',
      '.toc',
      '#toc',
      '.vector-header',
    ],
    stayOriginalSelectors: ['.mwe-math-element', 'math', '[role="math"]', '.chemf'],
    injectedCss: [
      '.mwe-popups-extract { max-height: unset !important; height: unset !important; }',
      '#mw-content-text ft-translation { display: block !important; margin: 4px 0 !important; }',
    ],
  },
  {
    id: 'medium',
    name: 'Medium',
    matches: ['medium.com', '*.medium.com'],
    selectors: [
      'article h1, article h2, article h3',
      'article p',
      'article blockquote',
      'article li',
      '.postMetaInline',
    ],
    excludeSelectors: ['pre', 'code', '[aria-label="Post Preview Reading Time"]', 'nav', 'header', 'button'],
    injectedCss: [
      '.u-lineClamp4, .u-lineClamp3, .u-lineClamp2 { -webkit-line-clamp: unset !important; max-height: unset !important; }',
      'article ft-translation { margin-top: 6px !important; }',
    ],
  },
  {
    id: 'hackernews',
    name: 'Hacker News',
    matches: ['news.ycombinator.com'],
    selectors: ['.titleline > a', '.comment > .commtext', '.toptext'],
    excludeSelectors: ['pre', 'code', '.hnuser', '.age', '.subtext', '.nav', '.rank', '.votelinks'],
    injectedCss: ['.commtext ft-translation { margin-top: 6px !important; }'],
  },
  {
    id: 'discord',
    name: 'Discord',
    matches: ['discord.com', '*.discord.com'],
    selectors: [
      'li[id^="chat-messages"] div[id^="message-content"]',
      'div[class*="messageContent"]',
      '[class*="embedDescription"]',
      '[class*="embedTitle"]',
    ],
    excludeSelectors: ['[class*="username"]', '[class*="avatar"]', 'pre', 'code', 'time', '[class*="reaction"]'],
    injectedCss: [
      '[class*="messageContent"] ft-translation { margin-top: 4px !important; }',
      'h3[data-text-variant="heading-lg/semibold"] { -webkit-line-clamp: unset !important; }',
    ],
  },
  {
    id: 'arxiv',
    name: 'ArXiv',
    matches: ['arxiv.org', '*.arxiv.org', 'ar5iv.labs.arxiv.org'],
    selectors: ['.ltx_p', '.ltx_title', 'blockquote.abstract', 'h1.title'],
    excludeSelectors: ['.ltx_bibliography', '.ltx_listing', '.ltx_eqn_table', '.ltx_authors', '.ltx_tag'],
    stayOriginalSelectors: ['.ltx_Math', 'math', '[class*="MathJax"]'],
    injectedCss: ['blockquote.abstract ft-translation { margin-top: 8px !important; }'],
  },
  {
    id: 'atcoder',
    name: 'AtCoder',
    matches: ['atcoder.jp', '*.atcoder.jp'],
    selectors: ['#task-statement p', '#task-statement h3', '#task-statement li', '.part h3'],
    excludeSelectors: ['pre', 'code', '.var', '.btn', 'nav'],
    stayOriginalSelectors: ['var', '.MathJax', 'math'],
    injectedCss: ['#task-statement ft-translation { margin-top: 4px !important; }'],
  },
  {
    id: 'substack',
    name: 'Substack',
    matches: ['*.substack.com', 'substack.com'],
    selectors: [
      '.post-title',
      '.post-header h1',
      '.body.markup p',
      '.body.markup li',
      '.body.markup blockquote',
      '.comment-body',
    ],
    excludeSelectors: ['pre', 'code', '.publication-footer', '.subscribe-footer', '.navbar-title', '.comment-meta'],
    injectedCss: [
      '.reader2-clamp-lines, [class*="clamp-"] { max-height: unset !important; -webkit-line-clamp: unset !important; }',
    ],
  },
];

export function matchDomain(hostname: string, pattern: string): boolean {
  const host = hostname.toLowerCase();
  const pat = pattern.toLowerCase();
  if (host === pat) return true;
  if (pat.startsWith('*.')) {
    const suffix = pat.slice(2);
    return host.endsWith(suffix) || host === suffix;
  }
  if (pat.endsWith('.*')) {
    const prefix = pat.slice(0, -2);
    return host.startsWith(prefix);
  }
  return host.includes(pat);
}

export function findMatchingRule(urlOrHost: string): SiteRule | null {
  let hostname = urlOrHost;
  try {
    if (urlOrHost.includes('://')) {
      const urlObj = new URL(urlOrHost);
      hostname = urlObj.hostname;
      // Map preview simulation routes to their production counterparts
      if (hostname === '127.0.0.1' || hostname === 'localhost') {
        const pathname = urlObj.pathname.toLowerCase();
        if (pathname.includes('/view/github')) return SITE_RULES.find((r) => r.id === 'github') || null;
        if (pathname.includes('/view/codeforces')) return SITE_RULES.find((r) => r.id === 'codeforces') || null;
        if (pathname.includes('/view/youtube')) return SITE_RULES.find((r) => r.id === 'youtube') || null;
        if (pathname.includes('/view/twitter') || pathname.includes('/view/x')) return SITE_RULES.find((r) => r.id === 'twitter') || null;
      }
    }
  } catch {}

  for (const rule of SITE_RULES) {
    for (const pat of rule.matches) {
      if (matchDomain(hostname, pat)) {
        return rule;
      }
    }
  }
  return null;
}

import { useState, useMemo } from 'react';
import {
  makeStyles,
  tokens,
  Text,
  Tree,
  TreeItem,
  TreeItemLayout,
  Button,
  Input,
  Spinner,
} from '@fluentui/react-components';
import {
  Book24Regular,
  Search24Regular,
  Home24Regular,
  ErrorCircle24Regular,
} from '@fluentui/react-icons';
import { useQuery } from '@tanstack/react-query';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface TopicSummary {
  id: string;
  title: string;
  category: string;
  order: number;
}

interface TopicFull extends TopicSummary {
  content: string;
}

/* -------------------------------------------------------------------------- */
/*  API helpers                                                               */
/* -------------------------------------------------------------------------- */

async function fetchTopics(): Promise<TopicSummary[]> {
  const res = await fetch('/api/tools/help/topics');
  const json = await res.json();
  if (!json.ok) throw new Error(json.error ?? 'Failed to load topics');
  return json.data;
}

async function fetchTopic(id: string): Promise<TopicFull> {
  const res = await fetch(`/api/tools/help/topics/${encodeURIComponent(id)}`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error ?? 'Failed to load topic');
  return json.data;
}

/* -------------------------------------------------------------------------- */
/*  Styles                                                                    */
/* -------------------------------------------------------------------------- */

const useStyles = makeStyles({
  root: {
    display: 'flex',
    height: '100%',
    minHeight: 0,
    overflow: 'hidden',
  },
  sidebar: {
    width: '240px',
    minWidth: '200px',
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  sidebarHeader: {
    padding: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  searchBox: {
    padding: '8px 12px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  sidebarContent: {
    flex: 1,
    overflowY: 'auto',
    padding: '4px 0',
  },
  categoryLabel: {
    padding: '12px 16px 4px',
    fontSize: '11px',
    fontWeight: 'bold',
    textTransform: 'uppercase' as const,
    color: tokens.colorNeutralForeground3,
    letterSpacing: '0.5px',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '8px 12px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px 32px',
    maxWidth: '800px',
  },
  welcome: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '48px',
    textAlign: 'center' as const,
  },
  welcomeTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
  },
  welcomeGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginTop: '16px',
    width: '100%',
    maxWidth: '500px',
  },
  welcomeCard: {
    textAlign: 'left' as const,
    padding: '12px 16px',
    borderRadius: '8px',
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    cursor: 'pointer',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  welcomeCardTitle: {
    fontWeight: '600',
    marginBottom: '4px',
  },
  welcomeCardDesc: {
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
  },
  markdown: {
    lineHeight: '1.7',
    '& h1': {
      fontSize: '24px',
      fontWeight: 'bold',
      marginTop: '0',
      marginBottom: '16px',
      paddingBottom: '8px',
      borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    },
    '& h2': {
      fontSize: '20px',
      fontWeight: 'bold',
      marginTop: '28px',
      marginBottom: '12px',
    },
    '& h3': {
      fontSize: '16px',
      fontWeight: '600',
      marginTop: '24px',
      marginBottom: '8px',
    },
    '& p': {
      marginTop: '0',
      marginBottom: '12px',
    },
    '& ul, & ol': {
      marginTop: '0',
      marginBottom: '12px',
      paddingLeft: '24px',
    },
    '& li': {
      marginBottom: '4px',
    },
    '& code': {
      fontFamily: 'Consolas, Monaco, "Courier New", monospace',
      fontSize: '13px',
      padding: '2px 6px',
      borderRadius: '4px',
      backgroundColor: tokens.colorNeutralBackground4,
    },
    '& pre': {
      padding: '12px 16px',
      borderRadius: '8px',
      backgroundColor: tokens.colorNeutralBackground4,
      overflowX: 'auto',
      marginBottom: '16px',
    },
    '& pre code': {
      padding: '0',
      backgroundColor: 'transparent',
    },
    '& table': {
      width: '100%',
      borderCollapse: 'collapse',
      marginBottom: '16px',
    },
    '& th, & td': {
      padding: '8px 12px',
      border: `1px solid ${tokens.colorNeutralStroke2}`,
      textAlign: 'left',
    },
    '& th': {
      backgroundColor: tokens.colorNeutralBackground3,
      fontWeight: '600',
    },
    '& blockquote': {
      margin: '0 0 12px',
      padding: '8px 16px',
      borderLeft: `4px solid ${tokens.colorBrandBackground}`,
      backgroundColor: tokens.colorNeutralBackground3,
      borderRadius: '0 4px 4px 0',
    },
    '& a': {
      color: tokens.colorBrandForegroundLink,
      textDecoration: 'none',
      ':hover': {
        textDecoration: 'underline',
      },
    },
    '& strong': {
      fontWeight: '600',
    },
    '& hr': {
      border: 'none',
      borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
      margin: '24px 0',
    },
  },
  selectedItem: {
    backgroundColor: tokens.colorNeutralBackground1Selected,
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  errorBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '24px',
    height: '100%',
    textAlign: 'center' as const,
  },
  errorIcon: {
    color: tokens.colorPaletteRedForeground1,
  },
  errorMessage: {
    color: tokens.colorNeutralForeground3,
    fontSize: '13px',
    maxWidth: '360px',
  },
});

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

const QUICK_LINKS: { id: string; title: string; desc: string }[] = [
  { id: 'getting-started', title: 'Getting Started', desc: 'Quick start guide' },
  { id: 'bcm-overview', title: 'BCM Studio', desc: 'Capability modeling' },
  { id: 'ai-chat', title: 'AI Chat', desc: 'Conversational AI' },
  { id: 'keyboard-shortcuts', title: 'Shortcuts', desc: 'Keyboard reference' },
  { id: 'layout-customization', title: 'Layout', desc: 'Customize panels' },
  { id: 'troubleshooting', title: 'Troubleshooting', desc: 'Fix common issues' },
];

export function HelpPanel() {
  const styles = useStyles();
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const {
    data: topics,
    isLoading: topicsLoading,
    isError: topicsError,
    error: topicsErrorObj,
  } = useQuery({
    queryKey: ['help-topics'],
    queryFn: fetchTopics,
  });

  const {
    data: topicContent,
    isLoading: contentLoading,
    isError: contentError,
    error: contentErrorObj,
  } = useQuery({
    queryKey: ['help-topic', activeTopic],
    queryFn: () => fetchTopic(activeTopic!),
    enabled: !!activeTopic,
  });

  // Group topics by category
  const grouped = useMemo(() => {
    if (!topics) return [];
    const filtered = search
      ? topics.filter(
          (t) =>
            t.title.toLowerCase().includes(search.toLowerCase()) ||
            t.category.toLowerCase().includes(search.toLowerCase()),
        )
      : topics;
    const map = new Map<string, TopicSummary[]>();
    for (const topic of filtered) {
      const list = map.get(topic.category) ?? [];
      list.push(topic);
      map.set(topic.category, list);
    }
    return Array.from(map.entries());
  }, [topics, search]);

  // Handle internal links between help topics
  const handleLinkClick = (href: string | undefined) => {
    if (!href) return;
    // Internal links like (workspace-setup) or (bcm-overview)
    if (!href.startsWith('http') && !href.startsWith('/') && !href.startsWith('#')) {
      setActiveTopic(href);
    }
  };

  return (
    <div className={styles.root}>
      {/* Sidebar */}
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <Book24Regular />
          <Text weight="semibold">Help</Text>
        </div>

        <div className={styles.searchBox}>
          <Input
            placeholder="Search topics..."
            contentBefore={<Search24Regular />}
            value={search}
            onChange={(_e, data) => setSearch(data.value)}
            size="small"
            style={{ width: '100%' }}
          />
        </div>

        <div className={styles.sidebarContent}>
          {topicsLoading ? (
            <div className={styles.loading}>
              <Spinner size="small" />
            </div>
          ) : topicsError ? (
            <div className={styles.errorBox}>
              <ErrorCircle24Regular className={styles.errorIcon} />
              <Text weight="semibold" size={300}>
                Failed to load topics
              </Text>
              <Text className={styles.errorMessage}>
                {topicsErrorObj instanceof Error
                  ? topicsErrorObj.message
                  : 'The help content could not be loaded. The server may be unavailable or help content files may be missing.'}
              </Text>
            </div>
          ) : (
            grouped.map(([category, items]) => (
              <div key={category}>
                <Text className={styles.categoryLabel}>{category}</Text>
                <Tree aria-label={category}>
                  {items.map((topic) => (
                    <TreeItem
                      key={topic.id}
                      itemType="leaf"
                      onClick={() => setActiveTopic(topic.id)}
                      className={activeTopic === topic.id ? styles.selectedItem : undefined}
                    >
                      <TreeItemLayout>{topic.title}</TreeItemLayout>
                    </TreeItem>
                  ))}
                </Tree>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main content */}
      <div className={styles.main}>
        {activeTopic && (
          <div className={styles.topBar}>
            <Button
              appearance="subtle"
              icon={<Home24Regular />}
              size="small"
              onClick={() => setActiveTopic(null)}
            >
              Home
            </Button>
            {topicContent && (
              <>
                <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                  /
                </Text>
                <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                  {topicContent.category}
                </Text>
                <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                  /
                </Text>
                <Text size={200} weight="semibold">
                  {topicContent.title}
                </Text>
              </>
            )}
          </div>
        )}

        {!activeTopic ? (
          /* Welcome / Home screen */
          <div className={styles.welcome}>
            <Book24Regular style={{ fontSize: '48px', color: tokens.colorBrandForeground1 }} />
            <Text className={styles.welcomeTitle}>EA Workbench Help</Text>
            <Text style={{ color: tokens.colorNeutralForeground3 }}>
              Browse topics in the sidebar or choose a quick link below.
            </Text>
            <div className={styles.welcomeGrid}>
              {QUICK_LINKS.map((link) => (
                <div
                  key={link.id}
                  className={styles.welcomeCard}
                  onClick={() => setActiveTopic(link.id)}
                >
                  <div className={styles.welcomeCardTitle}>{link.title}</div>
                  <div className={styles.welcomeCardDesc}>{link.desc}</div>
                </div>
              ))}
            </div>
          </div>
        ) : contentLoading ? (
          <div className={styles.loading}>
            <Spinner label="Loading..." />
          </div>
        ) : contentError ? (
          <div className={styles.errorBox}>
            <ErrorCircle24Regular className={styles.errorIcon} />
            <Text weight="semibold" size={400}>
              Failed to load topic
            </Text>
            <Text className={styles.errorMessage}>
              {contentErrorObj instanceof Error
                ? contentErrorObj.message
                : 'This help topic could not be loaded. It may have been removed or the server may be unavailable.'}
            </Text>
            <Button
              appearance="subtle"
              icon={<Home24Regular />}
              size="small"
              onClick={() => setActiveTopic(null)}
            >
              Back to Home
            </Button>
          </div>
        ) : topicContent ? (
          <div className={styles.content}>
            <div className={styles.markdown}>
              <Markdown
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      onClick={(e) => {
                        if (
                          href &&
                          !href.startsWith('http') &&
                          !href.startsWith('/') &&
                          !href.startsWith('#')
                        ) {
                          e.preventDefault();
                          handleLinkClick(href);
                        }
                      }}
                    >
                      {children}
                    </a>
                  ),
                }}
              >
                {topicContent.content}
              </Markdown>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

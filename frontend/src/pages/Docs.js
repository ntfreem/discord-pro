import { useState } from "react";
import { Link } from "react-router-dom";
import { Bot, ChevronRight, ChevronDown, BookOpen, Users, MessageSquare, Database, Zap, Settings, Globe, Shield, BarChart3, Code, HelpCircle, ArrowLeft } from "lucide-react";
import { colors, fonts, radius } from "../theme";

const sections = [
  {
    id: "getting-started",
    icon: BookOpen,
    title: "Getting Started",
    content: [
      {
        title: "What is BridgeBot?",
        body: `BridgeBot is a multi-tenant AI chatbot platform that lets you create intelligent support agents powered by your own knowledge base. Deploy bots on your website via an embeddable widget or connect them to Discord servers.

**Key capabilities:**
- Create multiple bot instances for different products or teams
- Train your bot using FAQs, URLs, and documents
- Deploy on web (chat page + widget) and Discord
- Full analytics and conversation monitoring
- Multi-user access with role-based permissions`
      },
      {
        title: "Quick Start (5 minutes)",
        body: `1. **Log in** with your admin credentials
2. **Select or create** a workspace (instance)
3. **Add knowledge** — go to Knowledge Base and add FAQs, scrape URLs, or upload documents
4. **Test your bot** — click "Open Chat Demo" in the sidebar
5. **Deploy** — embed the widget on your site or connect to Discord

That's it! Your bot immediately starts answering questions based on your knowledge base.`
      },
      {
        title: "Account Types",
        body: `**Admin (superadmin)**
- Full access to all workspaces
- Can create/delete instances, manage users
- Access to analytics, Discord settings, embed codes
- Can configure Discord app credentials

**User**
- Access only to assigned workspaces
- Can manage knowledge base, view conversations
- Cannot create instances or manage other users`
      }
    ]
  },
  {
    id: "knowledge-base",
    icon: Database,
    title: "Knowledge Base",
    content: [
      {
        title: "How It Works",
        body: `Your bot's intelligence comes entirely from the knowledge base you build. Every FAQ, URL, and document you add is fed to the AI when answering questions.

**The bot will:**
- Search ALL your active knowledge sources for every question
- Match user intent semantically (not just keywords)
- Answer confidently when it finds relevant information
- Ask permission before using general knowledge if no match is found

**Priority System:**
- **High** — checked first, given preference in answers
- **Medium** — standard priority
- **Normal** — lowest priority, used as supplementary context`
      },
      {
        title: "Adding FAQs",
        body: `FAQs are the most effective knowledge source. Write them as question-answer pairs.

**Tips for great FAQs:**
- Write the title as a real customer question
- Include multiple phrasings in the content (the AI will match similar questions)
- Set High priority for your most important FAQs
- Be specific and detailed in answers
- Include links, prices, or exact steps when relevant

**Example:**
- Title: "How long does a transfer take?"
- Content: "Transfers require 400 confirmations and typically take 30-60 minutes. Status will show 'Submitting' during this time..."`
      },
      {
        title: "Scraping URLs",
        body: `Scrape any webpage to extract its content as knowledge.

**Steps:**
1. Go to Knowledge Base → URL Scraper tab
2. Enter the URL
3. Optionally add a custom title
4. Set priority level
5. If the page requires login, enter credentials in the Authentication section
6. Click "Scrape & Save"

**Authentication:** For password-protected pages, enter the username/email and password. BridgeBot uses HTTP Basic Auth to access the page. Credentials are used only for scraping and are NOT stored.

**Best for:** Documentation pages, FAQ pages, product pages, help center articles`
      },
      {
        title: "Uploading Documents",
        body: `Upload .txt or .pdf files to add their content to your knowledge base.

**Steps:**
1. Go to Knowledge Base → Upload Document tab
2. Enter a descriptive title
3. Select your file (.txt or .pdf)
4. Set priority level
5. Click "Upload Document"

**Limits:** Content is extracted up to ~6,000 characters per document. For longer documents, consider splitting them or using the most relevant sections as FAQs.`
      },
      {
        title: "Managing Sources",
        body: `**Edit:** Click the pencil icon on any source to update its title, content, URL, or priority.

**Toggle Active/Inactive:** Click the toggle to temporarily disable a source without deleting it. Inactive sources are not used when answering questions.

**Change Priority:** Use the up/down arrows in the Priority column to quickly adjust priority levels.

**Delete:** Click the trash icon to permanently remove a source.`
      }
    ]
  },
  {
    id: "discord",
    icon: Zap,
    title: "Discord Integration",
    content: [
      {
        title: "Setting Up Discord",
        body: `**Prerequisites:**
- A Discord account
- A Discord server where you have admin permissions
- A Discord Application (created in the Developer Portal)

**Setup Steps:**

**Step 1: Create a Discord Application**
Go to https://discord.com/developers/applications and create a new application.

**Step 2: Enable Message Content Intent**
In your app's Bot settings, enable "Message Content Intent" under Privileged Gateway Intents.

**Step 3: Configure Credentials**
In BridgeBot, go to Discord settings and expand "Discord App Credentials". Enter:
- **Client ID** — from General Information
- **Client Secret** — from General Information
- **Redirect URI** — your domain + /api/discord/callback (e.g., https://yourdomain.com/api/discord/callback)
- **Bot Token** — from Bot → Reset Token

**Important:** Add the same Redirect URI in Discord Developer Portal → OAuth2 → Redirects.

**Step 4: Invite the Bot**
Click "Invite Bot to Server" and select your Discord server.

**Step 5: Configure & Start**
Set your preferred listen mode, save, and click "Start Bot".`
      },
      {
        title: "Listen Modes",
        body: `**Mention Only** — Bot responds only when @mentioned or in DMs. Best for busy servers where you don't want the bot to respond to every message.

**All Channels** — Bot responds to every human message in every channel. Best for dedicated support servers.

**Specific Channels** — Bot only responds in channels you select. Click "Fetch Channels" to load your server's channels and pick which ones to monitor.`
      },
      {
        title: "Reply Styles",
        body: `**Natural Reply** — Bot replies normally without tagging the user. Cleaner conversation flow.

**With @mention** — Bot tags the user in its reply. Useful in busy channels so users get notified.`
      },
      {
        title: "Bot Name Sync",
        body: `The bot's display name in Discord is controlled separately from its username.

To change what users see in your server:
1. Go to Bot Settings and set the bot name
2. Go to Discord settings
3. Click "Sync Name to Discord"

This sets the bot's **server nickname** (what users see), not just the global username.

**Note:** Discord limits name changes to 2 per hour.`
      }
    ]
  },
  {
    id: "web-deployment",
    icon: Code,
    title: "Web Deployment",
    content: [
      {
        title: "Chat Page",
        body: `Each workspace has a standalone chat page at:

\`/chat?instance=YOUR_INSTANCE_ID\`

Share this URL with users for a full-page chat experience. No login required for end users.`
      },
      {
        title: "Embeddable Widget",
        body: `Add a chat widget to any website with a single script tag.

**Steps:**
1. Go to Embed Code in the sidebar
2. Copy the embed snippet
3. Paste it before the closing \`</body>\` tag on your website

The widget appears as a floating chat bubble in the bottom-right corner. Users can click it to open a chat window and interact with your bot.`
      }
    ]
  },
  {
    id: "user-management",
    icon: Users,
    title: "User Management",
    content: [
      {
        title: "Managing Users",
        body: `**View Users:** Go to Users in the sidebar to see all registered accounts.

**Assign to Workspaces:** Go to Instances → select an instance → assign users by email.

**Delete Users:** Click the trash icon next to any non-admin user. This:
- Permanently deletes their account
- Removes them from all workspace assignments
- They must register again to regain access

**Note:** Admin accounts cannot be deleted for security.`
      },
      {
        title: "Password Reset",
        body: `If a user forgets their password:
1. Go to the login page
2. Click "Forgot password?"
3. Enter the account email
4. A 6-digit reset code is sent to their email
5. Enter the code and choose a new password

The reset code expires after 15 minutes. Click "Resend" to get a new code.`
      }
    ]
  },
  {
    id: "workspaces",
    icon: Settings,
    title: "Workspaces (Instances)",
    content: [
      {
        title: "What Are Workspaces?",
        body: `Workspaces (instances) are isolated bot environments. Each workspace has its own:
- Knowledge base
- Bot personality and settings
- Conversations
- Discord connection
- Analytics

**Use cases:**
- Separate bots for different products
- Different teams with different knowledge bases
- Staging vs. production environments`
      },
      {
        title: "Creating & Managing Workspaces",
        body: `**Create:** Go to Instances → Create Instance. Enter a name and optional description.

**Switch:** Use the workspace dropdown in the top-left sidebar to switch between workspaces.

**Delete:** Click delete on an instance to remove it and ALL its data (knowledge, conversations, configs).

**Assign Users:** Click on an instance → enter a user's email to give them access.`
      }
    ]
  },
  {
    id: "analytics",
    icon: BarChart3,
    title: "Analytics",
    content: [
      {
        title: "Dashboard Overview",
        body: `The dashboard shows:
- **Total Conversations** — all chat sessions across web and Discord
- **Total Messages** — individual messages exchanged
- **Platform Breakdown** — how many conversations come from web vs. Discord
- **Recent Conversations** — latest chat sessions with preview`
      },
      {
        title: "AI Usage & Reliability",
        body: `The Analytics page tracks AI API usage:
- **Total API Calls** — how many times the AI was queried
- **Success Rate** — percentage of successful responses
- **Failed Calls** — errors encountered
- **Retry Attempts** — automatic retries on failures
- **Daily Breakdown** — 7-day chart of calls, errors, and retries`
      }
    ]
  },
  {
    id: "bot-settings",
    icon: Settings,
    title: "Bot Settings",
    content: [
      {
        title: "Configuring Your Bot",
        body: `**Bot Name** — The display name used in conversations and Discord.

**Persona** — Define your bot's personality. Example: "You are a friendly crypto support agent who specializes in USDCx on Cardano."

**Custom Instructions** — Additional rules the bot should follow. Example: "Always recommend users open a support ticket for transaction issues."

**Tone Instructions** — Guide the bot's communication style. Example: "Be professional but approachable. Use simple language. Avoid jargon."`
      }
    ]
  }
];

function DocSection({ section, isOpen, onToggle }) {
  return (
    <div style={{ marginBottom: "8px" }}>
      <button onClick={onToggle} style={{
        width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "14px 18px",
        backgroundColor: isOpen ? "rgba(96,165,250,0.06)" : "transparent",
        border: `1px solid ${isOpen ? "rgba(96,165,250,0.2)" : "transparent"}`,
        borderRadius: "10px", cursor: "pointer", transition: "all 0.2s",
      }}>
        <section.icon size={18} color={isOpen ? colors.brand.cyan : colors.text.muted} />
        <span style={{ fontFamily: fonts.heading, fontSize: "15px", fontWeight: "600", color: isOpen ? colors.text.primary : colors.text.secondary, flex: 1, textAlign: "left" }}>
          {section.title}
        </span>
        {isOpen ? <ChevronDown size={16} color={colors.text.muted} /> : <ChevronRight size={16} color={colors.text.muted} />}
      </button>
      {isOpen && (
        <div style={{ padding: "8px 0 8px 48px" }}>
          {section.content.map((item, i) => (
            <div key={i} style={{ marginBottom: "24px" }}>
              <h3 style={{ fontFamily: fonts.heading, fontSize: "16px", fontWeight: "600", color: colors.text.primary, margin: "0 0 10px" }}>{item.title}</h3>
              <div style={{ fontFamily: fonts.body, fontSize: "14px", color: colors.text.secondary, lineHeight: "1.8", whiteSpace: "pre-line" }}>
                {item.body.split(/(\*\*[^*]+\*\*|\`[^`]+\`)/).map((part, j) => {
                  if (part.startsWith("**") && part.endsWith("**")) {
                    return <strong key={j} style={{ color: colors.text.primary, fontWeight: "600" }}>{part.slice(2, -2)}</strong>;
                  }
                  if (part.startsWith("`") && part.endsWith("`")) {
                    return <code key={j} style={{ backgroundColor: colors.bg.panel, padding: "2px 6px", borderRadius: "4px", fontFamily: fonts.mono, fontSize: "12px", color: colors.brand.cyan }}>{part.slice(1, -1)}</code>;
                  }
                  return part;
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Docs() {
  const [openSection, setOpenSection] = useState("getting-started");

  return (
    <div style={{ minHeight: "100vh", backgroundColor: colors.bg.base, fontFamily: fonts.body }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${colors.border.default}`, padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "36px", height: "36px", background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.light})`, borderRadius: radius.md, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Bot size={20} color="#FFFFFF" />
          </div>
          <span style={{ fontFamily: fonts.heading, fontSize: "20px", fontWeight: "700", color: colors.text.primary }}>
            Bridge<span style={{ color: colors.brand.light }}>Bot</span>
          </span>
          <span style={{ fontFamily: fonts.mono, fontSize: "11px", color: colors.text.muted, backgroundColor: colors.bg.panel, padding: "2px 8px", borderRadius: "6px", marginLeft: "4px" }}>
            Documentation
          </span>
        </div>
        <Link to="/login" style={{ display: "flex", alignItems: "center", gap: "6px", color: colors.brand.cyan, fontSize: "13px", fontFamily: fonts.body, textDecoration: "none" }}>
          <ArrowLeft size={14} /> Back to App
        </Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", maxWidth: "1200px", margin: "0 auto", minHeight: "calc(100vh - 65px)" }}>
        {/* Sidebar nav */}
        <div style={{ borderRight: `1px solid ${colors.border.default}`, padding: "24px 16px" }}>
          <p style={{ fontFamily: fonts.mono, fontSize: "10px", color: colors.text.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "16px", paddingLeft: "18px" }}>Sections</p>
          {sections.map(s => (
            <button key={s.id} onClick={() => setOpenSection(s.id)} data-testid={`nav-${s.id}`} style={{
              width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "10px 18px",
              backgroundColor: openSection === s.id ? "rgba(96,165,250,0.08)" : "transparent",
              border: "none", borderRadius: "8px", cursor: "pointer", marginBottom: "2px", transition: "all 0.15s",
              borderLeft: openSection === s.id ? `2px solid ${colors.brand.cyan}` : "2px solid transparent",
            }}>
              <s.icon size={15} color={openSection === s.id ? colors.brand.cyan : colors.text.muted} />
              <span style={{ fontFamily: fonts.body, fontSize: "13px", color: openSection === s.id ? colors.text.primary : colors.text.secondary, fontWeight: openSection === s.id ? "600" : "400" }}>
                {s.title}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: "32px 40px", maxWidth: "800px" }}>
          <div style={{ marginBottom: "32px" }}>
            <h1 style={{ fontFamily: fonts.heading, fontSize: "28px", fontWeight: "700", color: colors.text.primary, margin: "0 0 8px" }}>
              {sections.find(s => s.id === openSection)?.title}
            </h1>
            <div style={{ width: "40px", height: "3px", backgroundColor: colors.brand.cyan, borderRadius: "2px" }} />
          </div>
          {sections.find(s => s.id === openSection)?.content.map((item, i) => (
            <div key={i} style={{ marginBottom: "36px", paddingBottom: "36px", borderBottom: i < sections.find(s => s.id === openSection).content.length - 1 ? `1px solid ${colors.border.subtle}` : "none" }}>
              <h2 style={{ fontFamily: fonts.heading, fontSize: "18px", fontWeight: "600", color: colors.text.primary, margin: "0 0 14px" }}>{item.title}</h2>
              <div style={{ fontFamily: fonts.body, fontSize: "14px", color: colors.text.secondary, lineHeight: "1.85", whiteSpace: "pre-line" }}>
                {item.body.split(/(\*\*[^*]+\*\*|\`[^`]+\`)/).map((part, j) => {
                  if (part.startsWith("**") && part.endsWith("**")) {
                    return <strong key={j} style={{ color: colors.text.primary, fontWeight: "600" }}>{part.slice(2, -2)}</strong>;
                  }
                  if (part.startsWith("`") && part.endsWith("`")) {
                    return <code key={j} style={{ backgroundColor: colors.bg.panel, padding: "2px 6px", borderRadius: "4px", fontFamily: fonts.mono, fontSize: "12px", color: colors.brand.cyan }}>{part.slice(1, -1)}</code>;
                  }
                  return part;
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

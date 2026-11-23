import type { Metadata } from "next";
import {
  Atkinson_Hyperlegible,
  Geist,
  Geist_Mono,
  JetBrains_Mono,
  Lexend,
  Literata,
} from "next/font/google";
import "@fontsource/opendyslexic/400.css";
import "@fontsource/opendyslexic/700.css";
import "./globals.css";
import { AuthProvider } from "./lib/auth-context";
import { CoursesProvider } from "./lib/courses-context";
import { AccessibilityProvider } from "./lib/accessibility-context";
import { RouteAccessGuard } from "./components/route-access-guard";
import { AuthDevSwitcher } from "./components/auth-dev-switcher";
import { TooltipProvider } from "@/components/ui/tooltip";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const atkinson = Atkinson_Hyperlegible({
  variable: "--font-atkinson",
  weight: ["400", "700"],
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
});

const literata = Literata({
  variable: "--font-literata",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Shy Notes",
  description: "Open-source courses and accessible study notes",
};

/**
 * Tiny synchronous script in <head> immediately after <meta name="color-scheme">
 * to prevent a flash of unthemed content (FOUC) when loading persisted display
 * presets, custom colors, clarity flags, or typography settings from localStorage.
 */
const A11Y_INIT_SCRIPT = `(function(){try{
var raw=localStorage.getItem("shynotes:a11y-settings:v1");
if(!raw)return;
var data=JSON.parse(raw);
var r=document.documentElement;
var t=data&&data.typography;
if(t){
  var F={atkinson:"var(--font-atkinson), system-ui, sans-serif",lexend:"var(--font-lexend), system-ui, sans-serif",opendyslexic:"'OpenDyslexic', system-ui, sans-serif",literata:"var(--font-literata), Georgia, serif",mono:"var(--font-jetbrains-mono), var(--font-geist-mono), monospace"};
  var W={narrow:"52ch",standard:"68ch",wide:"85ch",full:"100%"};
  if(t.fontFamily==="custom"&&typeof t.customFontName==="string"){var cf=t.customFontName.replace(/["'\\;{}()<>]/g,"").trim().slice(0,80);if(cf)r.style.setProperty("--a11y-font-family",'"'+cf+'", system-ui, sans-serif');}
  else if(t.fontFamily&&F[t.fontFamily])r.style.setProperty("--a11y-font-family",F[t.fontFamily]);
  if(typeof t.textScale==="number"&&t.textScale>=85&&t.textScale<=160&&t.textScale!==100)r.style.setProperty("--a11y-text-scale",String(t.textScale/100));
  if(typeof t.lineHeight==="number"&&t.lineHeight>=1.4&&t.lineHeight<=2.2&&t.lineHeight!==1.6)r.style.setProperty("--a11y-line-height",String(t.lineHeight));
  if(typeof t.letterSpacing==="number"&&t.letterSpacing>0&&t.letterSpacing<=0.14)r.style.setProperty("--a11y-letter-spacing",t.letterSpacing+"em");
  if(typeof t.wordSpacing==="number"&&t.wordSpacing>0&&t.wordSpacing<=0.2)r.style.setProperty("--a11y-word-spacing",t.wordSpacing+"em");
  if(typeof t.paragraphSpacing==="number"&&t.paragraphSpacing>1&&t.paragraphSpacing<=2.25)r.style.setProperty("--a11y-paragraph-spacing",t.paragraphSpacing+"em");
  if(t.readingWidth&&W[t.readingWidth])r.style.setProperty("--a11y-measure",W[t.readingWidth]);
  if(t.noItalics)r.setAttribute("data-a11y-no-italics","true");
  if(t.noAllCaps)r.setAttribute("data-a11y-no-all-caps","true");
  if(t.leftAlignText)r.setAttribute("data-a11y-left-align","true");
  if(t.highlightHeadings)r.setAttribute("data-a11y-highlight-headings","true");
}
var ra=data&&data.readingAids;
if(ra&&(ra.cursorMode==="large-dark"||ra.cursorMode==="large-light"))r.setAttribute("data-a11y-cursor",ra.cursorMode);
var d=data&&data.display;
if(!d)return;
var uis=typeof d.uiScale==="number"?d.uiScale:(t&&typeof t.uiScale==="number"?t.uiScale:100);
if(uis>=85&&uis<=140&&uis!==100)r.style.setProperty("font-size",uis+"%");
if(d.reduceTransparency)r.setAttribute("data-a11y-reduce-transparency","true");
if(d.strongBoundaries)r.setAttribute("data-a11y-strong-boundaries","true");
if(d.underlineLinks)r.setAttribute("data-a11y-underline-links","true");
if(d.reduceMotion)r.setAttribute("data-a11y-reduce-motion","true");
if(d.largeTargets)r.setAttribute("data-a11y-large-targets","true");
if(d.distractionFree)r.setAttribute("data-a11y-distraction-free","true");
if(d.disableSingleKeyShortcuts)r.setAttribute("data-a11y-no-single-key","true");
if(d.pauseMedia)r.setAttribute("data-a11y-pause-media","true");
if(d.focusHighlight==="always"||d.focusHighlight==="high-contrast")r.setAttribute("data-a11y-focus",d.focusHighlight);
if(d.mediaMode==="dim"||d.mediaMode==="hide")r.setAttribute("data-a11y-media",d.mediaMode);
var T={
  light:{s:"light",c:{background:"#ffffff",surface:"#f4f4f5",foreground:"#171717",mutedForeground:"#52525b",primary:"#18181b",border:"#e4e4e7"}},
  dark:{s:"dark",c:{background:"#121215",surface:"#1c1c21",foreground:"#f4f4f5",mutedForeground:"#a1a1aa",primary:"#f4f4f5",border:"#2e2e36"}},
  paper:{s:"light",c:{background:"#f6eedc",surface:"#ede1c7",foreground:"#2b2117",mutedForeground:"#5c4a38",primary:"#0f5c4e",border:"#d5c3a1"}},
  "soft-gray":{s:"light",c:{background:"#eceef0",surface:"#e1e4e8",foreground:"#1e2329",mutedForeground:"#4b5563",primary:"#254e7a",border:"#c8cfd8"}},
  "high-contrast-light":{s:"light",c:{background:"#ffffff",surface:"#f2f2f2",foreground:"#000000",mutedForeground:"#1a1a1a",primary:"#003d99",border:"#000000"}},
  "high-contrast-dark":{s:"dark",c:{background:"#000000",surface:"#121212",foreground:"#ffffff",mutedForeground:"#e5e5e5",primary:"#ffe066",border:"#ffffff"}},
  "colorblind-safe":{s:"light",c:{background:"#fafaf8",surface:"#f0f2f5",foreground:"#14191f",mutedForeground:"#475467",primary:"#005ab5",border:"#cbd5e1"}}
};
var sys=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";
var id=d.theme||"system";
var custom=d.customColors||{};
var hex=/^#[0-9a-fA-F]{6}$/;
var hasC=Object.keys(custom).some(function(k){return hex.test(custom[k]||"")});
if(id==="system"&&!hasC)return;
var base=id==="system"?T[sys]:(T[id]||T.light);
var c={
  background:hex.test(custom.background||"")?custom.background:base.c.background,
  surface:hex.test(custom.surface||"")?custom.surface:base.c.surface,
  foreground:hex.test(custom.foreground||"")?custom.foreground:base.c.foreground,
  mutedForeground:hex.test(custom.mutedForeground||"")?custom.mutedForeground:base.c.mutedForeground,
  primary:hex.test(custom.primary||"")?custom.primary:base.c.primary,
  border:hex.test(custom.border||"")?custom.border:base.c.border
};
function lum(h){var a=[1,3,5].map(function(i){var v=parseInt(h.slice(i,i+2),16)/255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)});return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2]}
var sc=hex.test(custom.background||"")?(lum(c.background)<0.25?"dark":"light"):base.s;
var pfg=(1.05/(lum(c.primary)+0.05))>=((lum(c.primary)+0.05)/0.05)?"#ffffff":"#000000";
var m=document.querySelector('meta[name="color-scheme"]');
if(m)m.setAttribute("content",sc);
r.setAttribute("data-a11y-theme",id);
r.classList.toggle("dark",sc==="dark");
var set=function(k,v){r.style.setProperty(k,v)};
set("--background",c.background);set("--foreground",c.foreground);
set("--card",c.background);set("--card-foreground",c.foreground);
set("--popover",c.background);set("--popover-foreground",c.foreground);
set("--surface",c.surface);set("--muted",c.surface);set("--muted-foreground",c.mutedForeground);
set("--accent",c.surface);set("--accent-foreground",c.foreground);
set("--secondary",c.surface);set("--secondary-foreground",c.foreground);
set("--primary",c.primary);set("--primary-foreground",pfg);
set("--border",c.border);set("--input",c.border);set("--ring",c.primary);
set("--sidebar",c.surface);set("--sidebar-foreground",c.foreground);set("--sidebar-border",c.border);
}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${atkinson.variable} ${jetbrainsMono.variable} ${lexend.variable} ${literata.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <meta name="color-scheme" content="light dark" />
        <meta name="text-scale" content="scale" />
        <script dangerouslySetInnerHTML={{ __html: A11Y_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <TooltipProvider>
          <AccessibilityProvider>
            <AuthProvider>
              <CoursesProvider>
                <AuthDevSwitcher />
                <RouteAccessGuard>{children}</RouteAccessGuard>
              </CoursesProvider>
            </AuthProvider>
          </AccessibilityProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}

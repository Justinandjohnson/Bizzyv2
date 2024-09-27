const fs = require("fs");
const { execSync } = require("child_process");

function updateFile(filePath, updateFunction) {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, "utf8");
    const updatedContent = updateFunction(content);
    fs.writeFileSync(filePath, updatedContent);
    console.log(`Updated ${filePath}`);
  } else {
    console.log(`File not found: ${filePath}`);
  }
}

// Install missing dependencies
console.log("Installing missing dependencies...");
execSync(
  "npm install --save lucide-react @radix-ui/react-slot class-variance-authority clsx tailwind-merge @radix-ui/react-select @radix-ui/react-tabs @radix-ui/react-progress @radix-ui/react-scroll-area",
  { stdio: "inherit" }
);

// Update next.config.js
updateFile(
  "next.config.js",
  (content) => `
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
};

module.exports = nextConfig;
`
);

// Update tsconfig.json
updateFile(
  "tsconfig.json",
  (content) => `
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
`
);

// Update tailwind.config.js
updateFile(
  "tailwind.config.js",
  (content) => `
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Your theme extensions here
    },
  },
  plugins: [],
};
`
);

// Update postcss.config.js
updateFile(
  "postcss.config.js",
  (content) => `
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`
);

// Fix imports in enhanced-brainstormer.tsx
updateFile("components/enhanced-brainstormer.tsx", (content) => {
  return content.replace(
    /import {[\s\S]*?} from "@\/components\/ui";/,
    `import { Button, Input, ScrollArea, Tabs, Progress, Select } from "@/components/ui";
import { Loader, MessageSquare, Network, Bot, Search, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";`
  );
});

// Update components/ui/index.ts
updateFile(
  "components/ui/index.ts",
  () => `
export * from './button'
export * from './input'
export * from './select'
export * from './progress'
export * from './scroll-area'
export * from './card'
export * from './tabs'
`
);

// Clear Next.js cache
console.log("Clearing Next.js cache...");
execSync("rm -rf .next", { stdio: "inherit" });

console.log('Project files updated. Please run "npm run dev" again.');

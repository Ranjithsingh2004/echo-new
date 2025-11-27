# Echo Embed Script

This package builds the embeddable JavaScript widget that customers add to their websites.

## 🔧 Development Workflow

### Building the Embed Script

The embed script needs to be built and deployed whenever you make changes:

```bash
# Option 1: Build only (creates dist/widget.iife.js)
npm run build

# Option 2: Build and copy to widget/public (recommended)
npm run build:deploy

# Option 3: From root directory
pnpm --filter embed build:deploy
```

### Why Two Locations?

1. **`dist/widget.iife.js`** - Build output from Vite
2. **`../widget/public/widget.js`** - Copy for local testing & deployment

The widget app serves the script from `public/widget.js`, so it needs to be updated after every build.

## 📦 Deployment Process

### For Development:
```bash
# After making changes to embed.ts
cd apps/embed
npm run build:deploy
```

### For Production:
The build:deploy command should be part of your CI/CD pipeline:
```yaml
# Example GitHub Actions
- name: Build embed script
  run: pnpm --filter embed build:deploy

- name: Deploy widget.js
  run: # Upload apps/widget/public/widget.js to CDN
```

## 🎯 Integration Scripts

The embed script is referenced in the integration constants at:
`apps/web/modules/integrations/constants.ts`

Current URL: `https://widget.spinabot.com/widget.js`

### Usage Example:
```html
<script
  src="https://widget.spinabot.com/widget.js"
  data-organization-id="org_xxxxx"
  data-position="bottom-right">
</script>
```

## 🔄 Automatic Updates

### Option 1: Watch Mode (Future Enhancement)
Consider adding a watch mode that auto-copies on file changes:
```json
"watch": "vite build --watch && chokidar 'dist/widget.iife.js' -c 'npm run copy:widget'"
```

### Option 2: Pre-commit Hook
Add to `.husky/pre-commit`:
```bash
pnpm --filter embed build:deploy
```

### Option 3: CI/CD Pipeline (Recommended)
Run `build:deploy` in your deployment pipeline to ensure the production widget.js is always up-to-date.

## 📁 File Structure

```
apps/embed/
├── embed.ts              # Source code (with updateAppearance handler)
├── config.ts             # Configuration (widget URL, etc.)
├── icons.ts              # SVG icons
├── landing.html          # Demo page
├── vite.config.ts        # Build configuration
├── scripts/
│   └── build-and-deploy.js  # Auto-copy script
└── dist/
    └── widget.iife.js    # Build output (generated)

apps/widget/public/
└── widget.js             # Deployed version (copied from dist)
```

## ⚠️ Important Notes

1. **Always run `build:deploy`** after changing `embed.ts`
2. **The widget.js in public/** is what customers load
3. **Check both files match** before deploying to production
4. **Version control:** Only commit source files, not built files (add to .gitignore if needed)

## 🚀 Quick Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server on port 3002 |
| `npm run build` | Build to dist/ |
| `npm run build:deploy` | Build + copy to widget/public |
| `npm run copy:widget` | Copy existing build to widget/public |

## 🐛 Troubleshooting

**Problem:** Widget not showing new features
**Solution:** Run `npm run build:deploy` to rebuild

**Problem:** Different behavior in development vs production
**Solution:** Ensure widget.js is up-to-date with latest build

**Problem:** Changes not reflecting
**Solution:**
1. Clear browser cache
2. Rebuild: `npm run build:deploy`
3. Restart widget dev server

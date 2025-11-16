# Vercel Deployment Troubleshooting

## Quick Fixes

### 1. Force Redeploy
- Go to Vercel dashboard → Your project → Deployments
- Click the three dots on the latest deployment → "Redeploy"
- Check "Use existing Build Cache" = OFF
- Click "Redeploy"

### 2. Clear Build Cache
- Vercel dashboard → Settings → General
- Scroll to "Build & Development Settings"
- Click "Clear Build Cache"
- Trigger a new deployment

### 3. Check Build Logs
- Vercel dashboard → Deployments → Latest deployment
- Click "Build Logs" tab
- Look for errors or warnings
- Common issues:
  - Missing environment variables
  - TypeScript errors
  - Build timeout

### 4. Verify Environment Variables
- Vercel dashboard → Settings → Environment Variables
- Ensure all required variables are set:
  - `ARKIV_PRIVATE_KEY` (required)
  - `ARKIV_RPC_URL` (optional)
  - `ARKIV_WS_URL` (optional)
  - `JITSI_BASE_URL` (optional)
- After adding/updating, redeploy

### 5. Check Branch Deployment
- Verify the correct branch is deployed (usually `main` or `master`)
- Vercel dashboard → Settings → Git
- Check "Production Branch"
- Ensure your merge was to the correct branch

### 6. Browser Cache
- Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
- Or open in incognito/private window
- Check if issue persists

### 7. Verify Deployment Status
- Check deployment status in Vercel dashboard
- Green = successful, Red = failed, Yellow = building
- If failed, check build logs for errors

### 8. Manual Trigger
- Push an empty commit to trigger new deployment:
```bash
git commit --allow-empty -m "Trigger Vercel deployment"
git push
```

### 9. Check Build Output
- Verify the build completes successfully
- Check for TypeScript errors: `npm run build` locally
- Fix any errors before deploying

### 10. Environment-Specific Issues
- Check if production vs preview deployment
- Verify environment variables are set for correct environment (Production/Preview/Development)


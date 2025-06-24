# How to Get GitHub Actions Logs with Authentication

## TL;DR - The Working Method

```bash
# 1. Get GitHub token from gcloud secrets
GITHUB_TOKEN=$(gcloud secrets versions access latest --secret="github-token")

# 2. Download logs as zip file
curl -s -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/repos/OWNER/REPO/actions/runs/RUN_ID/logs" \
  -L -o github_logs.zip

# 3. Extract and read the logs
unzip -p github_logs.zip 0_test.txt
```

## Real Example - CI Run 15817414616

**Command Used:**
```bash
GITHUB_TOKEN=$(gcloud secrets versions access latest --secret="github-token") && \
curl -s -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/repos/creat-o-r/Barterverse/actions/runs/15817414616/logs" \
  -L -o /tmp/github_logs.zip && \
unzip -p /tmp/github_logs.zip 0_test.txt
```

**Actual Failure Found:**
```
2025-06-23T06:57:56.8750946Z ##[group]Run npm run lint
2025-06-23T06:57:56.9794876Z > nextn@0.1.0 lint
2025-06-23T06:57:56.9795248Z > next lint
2025-06-23T06:57:57.7347495Z Failed to load config "next/core-web-vitals" to extend from.
2025-06-23T06:57:57.7348494Z Referenced from: /home/runner/work/Barterverse/Barterverse/.eslintrc.json
2025-06-23T06:57:57.7543935Z ##[error]Process completed with exit code 1.
```

**Root Cause:** ESLint configuration error - `"next/core-web-vitals"` config couldn't be loaded.

## Methods That DON'T Work (Without Auth)

### 1. GitHub API without token
```bash
curl -s "https://api.github.com/repos/OWNER/REPO/actions/runs/RUN_ID/logs"
# Result: 403 Forbidden - Must have admin rights to Repository
```

### 2. Direct download attempts
```bash
wget "https://github.com/OWNER/REPO/actions/runs/RUN_ID/logs/download"
# Result: Download failed (requires authentication)
```

### 3. Web scraping
```bash
curl -s "https://github.com/OWNER/REPO/actions/runs/RUN_ID/job/JOB_ID"
# Result: Only gets high-level metadata, no console output
```

## What You Can Get Without Auth

### Job metadata (this works)
```bash
curl -s "https://api.github.com/repos/OWNER/REPO/actions/runs/RUN_ID/jobs" | \
  jq -r '.jobs[0].steps[] | select(.conclusion == "failure") | {name: .name, number: .number}'
```

## Available Secrets in gcloud

```bash
gcloud secrets list
# Available secrets:
# - GOOGLE_API_KEY
# - github-token  ← This is what we need
# - google-ai-api-key
# - railway-token
# - railway_token
```

## Log File Structure

Downloaded zip contains:
- `0_test.txt` - Complete job logs with timestamps
- Format: `YYYY-MM-DDTHH:MM:SS.FFFFFFFZ [message]`
- Includes all step output, errors, and metadata

## Key Takeaways

1. **Authentication is required** for detailed logs
2. **gcloud secrets** is the source of GitHub tokens
3. **Logs come as zip files** with timestamped console output
4. **Web scraping gives surface-level info only**
5. **API metadata can identify failed steps** without auth

This method works every time and gives you the complete, detailed CI logs with exact error messages and timing information.
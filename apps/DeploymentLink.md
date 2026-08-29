# Deployment Links

## Architecture diagrams

https://claude.ai/code/artifact/7ed2605c-97ee-421b-88ea-c7079204f429

Three figures: the trust boundary between the web app and the AI service, how
`parent_id` builds branch-isolated context, and the `/generate` lifecycle.
Private to the account that published it until shared from the page's share menu.

## Services

| Service | URL |
|---------|-----|
| AI backend (Cloud Run) | https://chatgrp-ai-589866597263.us-central1.run.app |
| Web (Vercel) | project `chatgrp` — public URL not yet recorded |

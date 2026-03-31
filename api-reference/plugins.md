---
title: Plugins API
description: Install, configure, and check the status of FlagBridge plugins.
---

# Plugins API

**CE** The Plugins API lets you install, configure, and manage plugins for a project.

**Auth:** Admin key required.

## GET /v1/projects/:projectSlug/plugins

List installed plugins.

```bash
curl https://api.flagbridge.io/v1/projects/my-app/plugins \
  -H "Authorization: Bearer fb_admin_YOUR_KEY"
```

```json
{
  "plugins": [
    {
      "id": "plugin_abc123",
      "packageName": "@flagbridge/plugin-mixpanel",
      "version": "1.2.0",
      "status": "active",
      "config": { "projectToken": "***" },
      "installedAt": "2026-03-01T00:00:00.000Z"
    }
  ]
}
```

## POST /v1/projects/:projectSlug/plugins

Install a plugin from the marketplace.

```bash
curl -X POST https://api.flagbridge.io/v1/projects/my-app/plugins \
  -H "Authorization: Bearer fb_admin_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "packageName": "@flagbridge/plugin-mixpanel",
    "version": "latest",
    "config": {
      "projectToken": "your-mixpanel-token"
    }
  }'
```

## PATCH /v1/projects/:projectSlug/plugins/:pluginId

Update plugin configuration.

```bash
curl -X PATCH https://api.flagbridge.io/v1/projects/my-app/plugins/plugin_abc123 \
  -H "Authorization: Bearer fb_admin_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"config": {"projectToken": "new-token"}}'
```

## DELETE /v1/projects/:projectSlug/plugins/:pluginId

Uninstall a plugin.

```bash
curl -X DELETE https://api.flagbridge.io/v1/projects/my-app/plugins/plugin_abc123 \
  -H "Authorization: Bearer fb_admin_YOUR_KEY"
```

Returns `204 No Content`.

## Plugin status

| Status | Description |
|---|---|
| `installing` | Plugin is being installed |
| `active` | Plugin is running normally |
| `error` | Plugin encountered an error (check `errorMessage`) |
| `disabled` | Plugin was manually disabled |

```bash
# Get plugin status and recent logs
curl https://api.flagbridge.io/v1/projects/my-app/plugins/plugin_abc123/status \
  -H "Authorization: Bearer fb_admin_YOUR_KEY"
```

See the [Plugins overview](/plugins/overview) and [Building plugins](/plugins/building-plugins) for more.

---
title: Marketplace API
description: Browse and install plugins from the FlagBridge marketplace.
---

# Marketplace API

**Pro** The Marketplace API provides access to the FlagBridge plugin marketplace.

**Auth:** Admin key required.

## GET /api/v1/marketplace/plugins

List available plugins in the marketplace.

```bash
curl https://api.flagbridge.io/api/v1/marketplace/plugins \
  -H "Authorization: Bearer fb_admin_YOUR_KEY"
```

### Query parameters

| Parameter | Type | Description |
|---|---|---|
| `category` | string | Filter by category (`analytics`, `monitoring`, `crm`) |
| `q` | string | Search by name or description |
| `sort` | string | Sort by `popular`, `newest`, `name` |

```json
{
  "plugins": [
    {
      "packageName": "@flagbridge/plugin-mixpanel",
      "name": "Mixpanel",
      "description": "Send flag evaluation events to Mixpanel",
      "category": "analytics",
      "version": "1.2.0",
      "author": "FlagBridge",
      "downloads": 12400,
      "verified": true
    }
  ]
}
```

## GET /api/v1/marketplace/plugins/:packageName

Get details about a specific marketplace plugin.

```bash
curl "https://api.flagbridge.io/api/v1/marketplace/plugins/%40flagbridge%2Fplugin-mixpanel" \
  -H "Authorization: Bearer fb_admin_YOUR_KEY"
```

## GET /api/v1/marketplace/plugins/:packageName/versions

List available versions of a plugin.

```bash
curl "https://api.flagbridge.io/api/v1/marketplace/plugins/%40flagbridge%2Fplugin-mixpanel/versions" \
  -H "Authorization: Bearer fb_admin_YOUR_KEY"
```

## Publishing plugins

See the [Publishing guide](/plugins/publishing) to submit your plugin to the marketplace.

# Hold/Draft Queue System - User Guide

**Version:** v201
**Created:** 2026-01-31
**Last Updated:** 2026-01-31

---

## Overview

The Hold/Draft Queue system allows you to save your work in progress and resume editing later. This is useful when you:

- Need to step away and continue later
- Are waiting for information from a colleague
- Want to work on multiple items without losing progress
- Experience an unexpected interruption

---

## Key Features

| Feature | Description |
|---------|-------------|
| **Put on Hold** | Save current form state with an optional note |
| **Resume Editing** | Continue exactly where you left off |
| **Auto-Expiry** | Drafts expire after 14 days (configurable) |
| **Progress Tracking** | See completion percentage for each draft |
| **Draft Limit** | Maximum 15 active drafts per user |
| **Expiry Warnings** | Notifications 3 days before expiry |

---

## How to Use

### Putting a Record on Hold

1. While creating or editing a record, click the **"Put on Hold"** button
2. A dialog will appear asking for an optional reason
3. Enter why you're pausing (e.g., "Waiting for budget approval")
4. Click **"Put on Hold"** to save
5. You'll be redirected to the list view

### Resuming a Draft

1. Navigate to the entity's menu (e.g., Projects, Benefits, Issues)
2. Click **"On Hold"** in the submenu
3. Find your draft in the list
4. Click **"Resume"** to continue editing
5. Your form will load with all previously entered data

### Deleting a Draft

1. Go to the entity's "On Hold" page
2. Find the draft you want to remove
3. Click the trash icon
4. Confirm deletion

---

## Understanding the Hold Queue

### Draft Status

| Status | Meaning |
|--------|---------|
| **Active** | Draft is saved and can be resumed |
| **Resumed** | Draft was continued and no longer on hold |
| **Expired** | Draft exceeded the expiry period |
| **Deleted** | Draft was manually removed |

### Progress Indicator

Each draft shows a progress bar indicating completion:

- **Blue (0-49%)** - Early stage, many fields remaining
- **Amber (50-79%)** - Good progress, some fields remaining
- **Green (80-100%)** - Nearly complete

### Expiry Information

- **Default expiry:** 14 days from when you put it on hold
- **Warning notifications:** Sent 3 days before expiry
- **After expiry:** Drafts become read-only and are eventually cleaned up

---

## Draft Limits

To ensure system performance, each user can have a maximum of **15 active drafts**.

When approaching the limit, you'll see warnings:
- At 12 drafts: "3 slots left"
- At 14 drafts: "1 slot left"
- At 15 drafts: Cannot create new drafts until you resume or delete existing ones

---

## Finding Your Drafts

### Per-Entity Hold Queue

Each entity type has its own "On Hold" submenu:

```
Projects
├── All Projects
├── Create Project
└── On Hold (3)     ← Your project drafts

Benefits
├── All Benefits
├── Create Benefit
└── On Hold (1)     ← Your benefit drafts

Issues
├── Issue Register
├── Create Issue
└── On Hold (2)     ← Your issue drafts
```

### Search and Filter

On each Hold Queue page, you can:
- **Search** by title or hold reason
- **Filter** by status (Active, Expired, All)

---

## Best Practices

1. **Add descriptive notes** when putting items on hold so you remember why
2. **Resume promptly** to avoid expiry
3. **Delete drafts** you no longer need to free up slots
4. **Check expiry warnings** in your notifications
5. **Complete drafts with high progress** first

---

## PMO Admin Features

If you're a PMO Admin, you have additional capabilities:

### View Organisation Drafts

- Navigate to **PMO Admin > Draft Queue > Organisation Drafts**
- See all drafts across your organisation
- Monitor team members' work in progress

### Configure Expiry Settings

- Navigate to **PMO Admin > Draft Queue > Expiry Settings**
- Set default expiry days per entity type
- Configure project type-specific expiry
- Adjust warning notification timing

---

## Frequently Asked Questions

### Q: What happens when a draft expires?

A: Expired drafts become read-only. You can still view them but cannot resume editing. Expired drafts are automatically cleaned up after 30 days.

### Q: Can I share a draft with a colleague?

A: Currently, drafts are personal and cannot be shared. This feature may be added in the future.

### Q: Do drafts sync across devices?

A: Yes, drafts are stored in the cloud and accessible from any device where you're logged in.

### Q: What if I accidentally delete a draft?

A: Unfortunately, deleted drafts cannot be recovered. Be careful when deleting.

### Q: How do I know if I have drafts expiring soon?

A: You'll receive in-app notifications 3 days before a draft expires. Check your notification bell regularly.

---

## Troubleshooting

### "Maximum drafts limit reached"

- You have 15 active drafts
- Resume or delete existing drafts to create new ones
- Go to any "On Hold" page to manage your drafts

### Draft not appearing in list

- Ensure you clicked "Put on Hold" (not Cancel)
- Check if it was put on hold under a different entity type
- The draft may have expired

### Form data missing after resume

- This shouldn't happen - contact support
- As a workaround, check if you have another draft for the same record

---

## Support

If you encounter issues with the draft queue system:

1. Check this user guide for solutions
2. Contact your PMO Admin for assistance
3. Report bugs at the system's support portal

---

*Last updated: 2026-01-31*
